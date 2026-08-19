import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { imageUrl, message } = await request.json();

    // ใช้ env เท่านั้น (อย่าใส่ token hardcode ลงในโค้ด!)
    const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_TOKEN;
    const GROUP_ID = process.env.LINE_GROUP_ID;

    if (!LINE_ACCESS_TOKEN || !GROUP_ID) {
      return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN / LINE_GROUP_ID' }, { status: 500 });
    }

    // สร้างข้อความที่จะส่ง (ส่งเป็นรูปภาพ)
    const body = {
      to: GROUP_ID,
      messages: [
        {
          type: "text",
          text: message || "บิลใหม่มาแล้วครับ 💅"
        },
        {
          type: "image",
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl // ใช้รูปเดียวกันเลย
        }
      ]
    };

    // ยิงไปหา LINE
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Line API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
