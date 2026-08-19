import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { generateWarningFlex } from '@/utils/lineService';

// ฟังก์ชันสำหรับส่ง LINE (ยิงตรงจากหลังบ้านไปหา LINE เลย)
// ส่งไปทุกคนใน LINE_RECIPIENT_IDS (คั่นด้วยเครื่องหมายจุลภาค) — รองรับทั้งกลุ่ม/รายคน
const sendLinePush = async (messageObject: Record<string, unknown>) => {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const recipients = (process.env.LINE_RECIPIENT_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!token || recipients.length === 0) {
    console.warn('check-queue: ขาด LINE_CHANNEL_ACCESS_TOKEN หรือ LINE_RECIPIENT_IDS');
    return false;
  }

  let sent = 0;
  for (const recipientId of recipients) {
    try {
      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: recipientId,
          messages: [messageObject]
        }),
      });
      if (response.ok) {
        sent++;
      } else {
        console.error('check-queue: LINE push failed', response.status, await response.text());
      }
    } catch (e) {
      console.error('check-queue: LINE push error', e);
    }
  }
  return sent > 0;
};

// ฟังก์ชันนี้จะทำงานเมื่อเราเข้าลิงก์นี้
export async function GET(request: Request) {
  try {
    // 1. เช็ค Password (กันคนอื่นมากดเล่น) — ตั้งค่า CHECK_QUEUE_KEY ใน env
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const expectedKey = process.env.CHECK_QUEUE_KEY;

    // ถ้ายังไม่ได้ตั้ง env → ปิดใช้งาน (fail closed) ไม่ fallback เป็นรหัสตายตัว
    if (!expectedKey) {
      return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า CHECK_QUEUE_KEY' }, { status: 500 });
    }
    if (key !== expectedKey) {
      return NextResponse.json({ error: 'รหัสไม่ถูกต้อง' }, { status: 401 });
    }

    console.log('⏰ เริ่มต้นเช็คคิวอัตโนมัติ...');

    // 2. ดึงคิว "วันนี้" ที่ยัง "ไม่เสร็จ" และ "ยังไม่เตือน"
    const today = new Date().toISOString().split('T')[0];
    
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, services(name)')
      .eq('booking_date', today)
      .eq('status', 'pending')
      .eq('is_notified', false);

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ message: 'ไม่มีคิวที่ต้องเตือน' });
    }

    const now = new Date();
    let count = 0;

    // 3. วนลูปเช็คเวลา
    for (const b of bookings) {
      const [h, m] = b.start_time.split(':');
      const bookingTime = new Date(b.booking_date);
      bookingTime.setHours(parseInt(h), parseInt(m), 0);

      // คำนวณเวลาที่เหลือ (นาที)
      const diffMs = bookingTime.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      // เงื่อนไข: ถ้าเหลือเวลา 0 ถึง 30 นาที
      if (diffMins >= 0 && diffMins <= 30) {
        
        console.log(`⚠️ เจอคิวคุณ ${b.customer_name} อีก ${diffMins} นาที`);

        // A. สร้างการ์ดแจ้งเตือน (ใช้ฟังก์ชันเดิมที่มีอยู่แล้ว)
        const msg = generateWarningFlex(b.customer_name, b.start_time.slice(0,5), b.services?.name);
        
        // B. ส่ง LINE
        await sendLinePush(msg);

        // C. ติ๊กถูกใน Database ว่าเตือนแล้ว (จะได้ไม่เตือนซ้ำ)
        await supabase
          .from('bookings')
          .update({ is_notified: true })
          .eq('id', b.id);
          
        count++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `ส่งเตือนไปทั้งหมด ${count} คิว` 
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}