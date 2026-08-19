import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { notifyBookingStatus, type BookingStatusAction } from '@/lib/bookingNotifications';

// ─── POST: แจ้งสถานะคิวกลับหาลูกค้า (LINE / Messenger) ────────────────────────
// เรียกจากหน้า admin หลังเปลี่ยนสถานะคิว (middleware บังคับ admin auth)
// body: { bookingId, action: 'confirmed'|'rescheduled'|'cancelled'|'done', prevDate?, prevTime? }
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const bookingId = Number(body.bookingId);
  const action = String(body.action ?? '');
  const validActions: BookingStatusAction[] = ['confirmed', 'rescheduled', 'cancelled', 'done'];

  if (!bookingId || !validActions.includes(action as BookingStatusAction)) {
    return NextResponse.json({ error: 'พารามิเตอร์ไม่ถูกต้อง' }, { status: 400 });
  }

  // ดึงข้อมูลการจอง (รวมบริการ + บัญชีที่เชื่อม)
  const supabase = getSupabaseAdmin();
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*, services(name, price)')
    .eq('id', bookingId)
    .maybeSingle();

  if (error || !booking) {
    console.error('notify-customer: booking not found', error?.message);
    return NextResponse.json({ error: 'ไม่พบการจอง' }, { status: 404 });
  }

  const lineUserId = booking.line_user_id || undefined;
  const messengerPsid = booking.messenger_psid || undefined;

  // บริการทั้งหมด: เอา snapshot จาก note (หลายบริการ) ถ้าไม่มีค่อยเอาจาก services
  const parsedNote = parseServicesFromNote(booking.note);
  const services =
    parsedNote && parsedNote.services.length > 0
      ? parsedNote.services
      : [
          {
            name: booking.services?.name ?? 'บริการ',
            price: Number(booking.services?.price) || 0,
          },
        ];

  const subtotal = services.reduce((sum: number, s: any) => sum + s.price, 0);
  const finalPrice =
    booking.final_price != null && booking.final_price !== ''
      ? Number(booking.final_price) || 0
      : subtotal - (Number(booking.discount) || 0);

  const result = await notifyBookingStatus(
    {
      customerName: booking.customer_name,
      bookingDate: booking.booking_date,
      startTime: booking.start_time,
      services,
      price: finalPrice,
      subtotal,
      discount: Number(booking.discount) || 0,
      promotion: parsedNote?.promotion?.name,
    },
    { lineUserId, messengerPsid },
    action as BookingStatusAction,
    body.prevDate && body.prevTime
      ? { bookingDate: String(body.prevDate), startTime: String(body.prevTime) }
      : undefined,
  );

  return NextResponse.json({
    notified: !!(lineUserId || messengerPsid),
    result,
  });
}

// แยก services + promotion จาก note (JSON ที่เก็บตอนจองหลายบริการ)
function parseServicesFromNote(note: unknown) {
  try {
    const n = JSON.parse(String(note || ''));
    if (n && Array.isArray(n.services)) {
      return {
        services: (n.services as Array<Record<string, unknown>>).map((s: any) => ({
          name: String(s.name ?? 'บริการ'),
          price: Number(s.price) || 0,
        })),
        promotion: n.promotion,
      };
    }
  } catch {
    /* note ไม่ใช่ JSON → ใช้ services table แทน */
  }
  return null;
}
