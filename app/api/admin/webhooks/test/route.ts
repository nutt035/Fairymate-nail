import { createHmac, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';

// ค่าที่ว่างหรือยังเป็น placeholder (your_...) ถือว่า "ยังไม่ตั้งจริง"
function isSet(value: string | undefined) {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  return !/^your_/i.test(v) && !/^<.*>$/.test(v);
}

// ─── ทดสอบ webhook ผ่าน HTTP จริง (แบบเดียวกับที่ LINE / Meta ยิง) ────────────
// ใช้ในหน้า /admin/webhooks — ถูก Basic Auth ป้องกัน
// โฟลว์:
//   messenger_verify  → GET /api/webhooks/messenger?hub.mode=subscribe&...  (เหมือน Meta กด Verify)
//   messenger_post    → POST /api/webhooks/messenger พร้อม x-hub-signature-256
//   line_post         → POST /api/webhooks/line พร้อม x-line-signature (HMAC-SHA256 base64)
export async function POST(request: Request) {
  const { platform, test } = await request.json().catch(() => ({ platform: undefined, test: undefined }));

  if (platform === 'messenger' && test === 'verify') {
    return runMessengerVerify();
  }
  if (platform === 'messenger' && test === 'post') {
    return runMessengerPost();
  }
  if (platform === 'line' && test === 'post') {
    return runLinePost();
  }

  return NextResponse.json({ error: 'ไม่รู้จักการทดสอบที่ขอ' }, { status: 400 });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(result: { status: number; body: string }) {
  const passed = result.status >= 200 && result.status < 300;
  return NextResponse.json({
    passed,
    status: result.status,
    body: result.body.slice(0, 300),
  });
}

async function runMessengerVerify() {
  const token = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;
  if (!token) {
    return NextResponse.json({ passed: false, error: 'ยังไม่ได้ตั้ง FACEBOOK_WEBHOOK_VERIFY_TOKEN' }, { status: 200 });
  }
  if (!isSet(token)) {
    return NextResponse.json({ passed: false, error: 'FACEBOOK_WEBHOOK_VERIFY_TOKEN ยังเป็นค่า placeholder — ต้องสร้างใหม่ก่อน' }, { status: 200 });
  }

  const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
  const challenge = 'challenge_' + randomBytes(6).toString('hex');
  const url = `${base}/api/webhooks/messenger?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(token)}&hub.challenge=${challenge}`;

  try {
    const res = await fetch(url);
    const body = await res.text();
    return ok({ status: res.status, body });
  } catch (error) {
    return NextResponse.json({ passed: false, error: String(error) }, { status: 200 });
  }
}

async function runMessengerPost() {
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret || !isSet(appSecret)) {
    return NextResponse.json({ passed: false, error: 'ยังไม่ได้ตั้ง FACEBOOK_APP_SECRET ตัวจริง (ปัจจุบันเป็น placeholder)' }, { status: 200 });
  }

  const payload = JSON.stringify({
    object: 'page',
    entry: [{ messaging: [{ sender: { id: 'test-sender' }, message: { text: 'ทดสอบ webhook' } }] }],
  });
  const signature = `sha256=${createHmac('sha256', appSecret).update(payload).digest('hex')}`;

  const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
  try {
    const res = await fetch(`${base}/api/webhooks/messenger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': signature },
      body: payload,
    });
    const body = await res.text();
    return ok({ status: res.status, body });
  } catch (error) {
    return NextResponse.json({ passed: false, error: String(error) }, { status: 200 });
  }
}

async function runLinePost() {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !isSet(secret)) {
    return NextResponse.json({ passed: false, error: 'ยังไม่ได้ตั้ง LINE_CHANNEL_SECRET (ก๊อปจาก LINE Developers Console)' }, { status: 200 });
  }

  const payload = JSON.stringify({
    destination: 'test',
    events: [{ type: 'message', replyToken: 'test-reply-token', source: { userId: 'U-test' }, message: { type: 'text', text: 'จอง' } }],
  });
  const signature = createHmac('sha256', secret).update(payload).digest('base64');

  const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
  try {
    const res = await fetch(`${base}/api/webhooks/line`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-line-signature': signature },
      body: payload,
    });
    const body = await res.text();
    return ok({ status: res.status, body });
  } catch (error) {
    return NextResponse.json({ passed: false, error: String(error) }, { status: 200 });
  }
}
