import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// ─── GET: Verify Webhook จาก Meta Developer ───────────────────────────────────
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expectedToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;

  if (
    mode === 'subscribe' &&
    challenge &&
    expectedToken &&
    safeEqual(token ?? '', expectedToken)
  ) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'Webhook verification failed' }, { status: 403 });
}

// ─── POST: รับ Events จาก Messenger ──────────────────────────────────────────
export async function POST(request: Request) {
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const signature = request.headers.get('x-hub-signature-256');
  const rawBody = await request.text();

  if (!appSecret || !signature || !validSignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as MessengerWebhook;
    if (payload.object !== 'page') {
      return NextResponse.json({ error: 'Unsupported webhook object' }, { status: 404 });
    }

    for (const entry of payload.entry ?? []) {
      for (const event of entry.messaging ?? []) {
        const psid = event.sender?.id;
        if (!psid) continue;

        // ฝัง PSID ลงในลิงก์จอง เพื่อให้รู้ว่าการจองนี้มาจาก Messenger ของใคร
        // และส่งยืนยันกลับไปที่แชทนี้ได้
        const bookingUrl = `${publicBaseUrl()}/booking?psid=${encodeURIComponent(psid)}`;

        // จับ PSID ใหม่: บันทึกตาราง messenger_contacts + ตอบต้อนรับครั้งแรก
        // (ครั้งแรกตอบต้อนรับเท่านั้น — ข้อความต้อนรับมีลิงก์จองอยู่ในตัวแล้ว)
        const isNewContact = await captureContact(psid);

        // ตอบเฉพาะเมื่อลูกค้าพิมพ์คำว่า "จอง / book / คิว" หรือกดปุ่ม
        const text = event.message?.text;
        const wantsBooking = (text && /จอง|book|booking|คิว/i.test(text)) || Boolean(event.postback);

        if (isNewContact) {
          if (!wantsBooking) {
            await replyMessenger(psid, welcomeMessage(bookingUrl));
          }
        } else if (wantsBooking) {
          await replyMessenger(psid, bookingLinkText(bookingUrl));
        }
      }
    }

    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    console.error('Invalid Messenger webhook payload', error);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

// ─── จับ PSID ใหม่ ───────────────────────────────────────────────────────────
// บันทึกคนที่แชทกับเพจลงตาราง messenger_contacts (รัน migration ก่อน)
// คืนค่า true = เป็นคนแรกที่แชท (เพิ่ง insert) → ใช้ตอบต้อนรับ
// ถ้าตารางยังไม่สร้าง/error → คืน false เพื่อให้โฟลว์เดิมทำงานต่อได้
async function captureContact(psid: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from('messenger_contacts')
      .select('id')
      .eq('psid', psid)
      .maybeSingle();

    if (existing) {
      await supabase.from('messenger_contacts').update({ last_seen_at: now }).eq('id', existing.id);
      return false;
    }

    // คนใหม่: ลองหาชื่อจาก Graph API (ได้เฉพาะตอนแชทภายใน 24 ชม. — ไม่ได้ก็ไม่เป็นไร)
    const name = await fetchMessengerName(psid);

    const { error } = await supabase.from('messenger_contacts').insert({
      psid,
      name: name || null,
      first_seen_at: now,
      last_seen_at: now,
      is_admin: false,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[messenger webhook] บันทึก messenger_contacts ไม่สำเร็จ (รัน migrations/2026-08-18_messenger_contacts.sql แล้วหรือยัง?):', error);
    return false;
  }
}

// ลองดึงชื่อจาก Graph API: GET /{psid}?fields=first_name,last_name
async function fetchMessengerName(psid: string): Promise<string | null> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const version = process.env.META_GRAPH_API_VERSION || 'v20.0';
  if (!token) return null;

  try {
    const url = new URL(`https://graph.facebook.com/${version}/${psid}`);
    url.searchParams.set('fields', 'first_name,last_name');
    url.searchParams.set('access_token', token);

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = (await response.json()) as { first_name?: string; last_name?: string };
    return [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
  } catch {
    return null;
  }
}

function welcomeMessage(bookingUrl: string) {
  return (
    'สวัสดีค่ะ ยินดีต้อนรับ! 💕\n' +
    'ระบบได้บันทึกข้อมูลการติดต่อของคุณแล้ว\n\n' +
    `📅 เริ่มจองคิวได้เลย: ${bookingUrl}\n\n` +
    '💬 พิมพ์ "จอง" ได้ตลอด หรือติดต่อแอดมินได้เลยค่ะ'
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bookingLinkText(bookingUrl: string) {
  return (
    '📅 เริ่มจองคิวเลยค่ะ!\nกดลิงก์ด้านล่างเพื่อเลือกบริการและเวลาที่สะดวก:\n\n' +
    `${bookingUrl}\n\n` +
    '💬 เมื่อจองเสร็จ ระบบจะส่งใบยืนยันกลับมาที่แชทนี้ให้ทันทีค่ะ'
  );
}

// ส่งข้อความกลับไปหา PSID (ต้องอยู่ภายใน 24 ชม. หลังลูกค้าแชทล่าสุด)
async function replyMessenger(psid: string, text: string) {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const version = process.env.META_GRAPH_API_VERSION || 'v20.0';
  if (!token) return;

  try {
    const url = new URL(`https://graph.facebook.com/${version}/me/messages`);
    url.searchParams.set('access_token', token);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: psid },
        messaging_type: 'RESPONSE',
        message: { text },
      }),
    });

    if (!response.ok) {
      console.error('Messenger reply failed', response.status, await response.text());
    }
  } catch (error) {
    console.error('Messenger reply error:', error);
  }
}

function validSignature(body: string, signature: string, secret: string) {
  const expected = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  return safeEqual(signature, expected);
}

function safeEqual(actual: string, expected: string) {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function publicBaseUrl() {
  return process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
}

interface MessengerWebhook {
  object?: string;
  entry?: Array<{
    messaging?: Array<{
      sender?: { id?: string };
      message?: { text?: string };
      postback?: { payload?: string };
    }>;
  }>;
}
