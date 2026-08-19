import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

// ─── POST: รับ Events จาก LINE OA ────────────────────────────────────────────
// ตั้งค่า Webhook URL ใน LINE Developers Console:
//   https://developers.line.biz > Messaging API > Webhook settings
//   URL: https://<โดเมนเว็บ>/api/webhooks/line
// และเปิด "Use webhook" + อย่าลืมใส่ LINE_CHANNEL_SECRET ใน .env
export async function POST(request: Request) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  // ถ้ายังไม่ได้ตั้งค่าบัญชี → ตอบ 200 เพื่อไม่ให้ LINE retry ซ้ำๆ
  if (!secret || !accessToken) {
    console.warn('LINE webhook: missing LINE_CHANNEL_SECRET or LINE_CHANNEL_ACCESS_TOKEN');
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // 1. ตรวจสอบลายเซ็นจาก LINE (กันปลอมแปลง)
  const signature = request.headers.get('x-line-signature');
  const rawBody = await request.text();

  if (!signature || !validSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as LineWebhook;
    const baseUrl = publicBaseUrl();

    for (const event of payload.events ?? []) {
      // ตอบเฉพาะเมื่อลูกค้าพิมพ์คำว่า "จอง / book / คิว" เท่านั้น
      if (event.type !== 'message' || event.message?.type !== 'text') continue;
      const text = event.message.text ?? '';
      if (!/จอง|book|booking|คิว/i.test(text)) continue;

      // ฝัง LINE userId (จาก event.source.userId) ลงในลิงก์จอง
      // เพื่อให้รู้ว่าการจองนี้มาจากบัญชี LINE ไหน และส่งยืนยันกลับได้
      const userId = event.source?.userId;
      const bookingUrl = `${baseUrl}/booking${userId ? `?line_uid=${encodeURIComponent(userId)}` : ''}`;

      await replyLine(event.replyToken, bookingLinkMessages(bookingUrl));
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('LINE webhook error:', error);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ข้อความเมื่อลูกค้าพิมพ์ "จอง"
function bookingLinkMessages(bookingUrl: string) {
  return [
    '📅 เริ่มจองคิวเลยค่ะ!\nกดลิงก์ด้านล่างเพื่อเลือกบริการและเวลาที่สะดวก:\n\n' +
      `${bookingUrl}\n\n` +
      '💬 เมื่อจองเสร็จ ระบบจะส่งใบยืนยันกลับมาที่แชทนี้ให้ทันทีค่ะ',
  ];
}

// ส่งข้อความกลับผ่าน LINE Messaging API (reply)
async function replyLine(replyToken: string | undefined, messages: string[]) {
  if (!replyToken) return;

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: messages.map((text) => ({ type: 'text', text })),
      }),
    });

    if (!response.ok) {
      console.error('LINE reply failed', response.status, await response.text());
    }
  } catch (error) {
    console.error('LINE reply error:', error);
  }
}

// ตรวจสอบ x-line-signature (HMAC-SHA256 + base64 ด้วย LINE_CHANNEL_SECRET)
function validSignature(rawBody: string, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(rawBody).digest('base64');
  return safeEqual(signature, expected);
}

function safeEqual(actual: string, expected: string) {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// URL สาธารณะของเว็บ (ใช้ในลิงก์จองคิวที่ส่งเข้าแชท)
function publicBaseUrl() {
  return process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
}

interface LineWebhook {
  destination?: string;
  events?: Array<{
    type: string;
    replyToken?: string;
    source?: { userId?: string };
    message?: { type?: string; text?: string };
  }>;
}
