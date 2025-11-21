import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // รับมาทั้งก้อนเลย (ไม่ใช่แค่ text แล้ว)
    const { message } = await request.json();
    
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const groupId = process.env.LINE_GROUP_ID;

    if (!token || !groupId) {
      return NextResponse.json({ error: 'Missing Token or Group ID' }, { status: 500 });
    }

    // ส่งไปที่ LINE Messaging API
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: groupId,
        // ตรงนี้สำคัญ! เราส่ง message ก้อนที่เราสร้างจาก utils ไปตรงๆ เลย
        messages: [ message ] 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ LINE API Error:', errorData);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("❌ Server Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}