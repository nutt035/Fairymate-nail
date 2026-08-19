import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// ─── สถานะการตั้งค่า webhook LINE + Messenger ─────────────────────────────────
// ใช้ในหน้า /admin/webhooks — ถูก Basic Auth ป้องกัน (ไม่อยู่ใน public paths
// ของ middleware) ดังนั้นเปิดเผย verify token ให้แอดมินดูได้
//
// ค่าที่ว่างหรือยังเป็น placeholder (ขึ้นต้นด้วย your_ / YOUR_) ถือว่า "ยังไม่ตั้ง"
function isSet(value: string | undefined) {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  return !/^your_/i.test(v) && !/^<.*>$/.test(v);
}

export async function GET() {
  const env = process.env;

  // จำนวนแอดมินที่ approve แล้วในหน้า /admin/messenger
  // (ถ้าตารางยังไม่สร้าง → 0 และไม่ error)
  let approvedAdmins = 0;
  try {
    const supabase = getSupabaseAdmin();
    const { count } = await supabase
      .from('messenger_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', true);
    approvedAdmins = count ?? 0;
  } catch (error) {
    console.error('[webhooks/status] อ่าน messenger_contacts ไม่สำเร็จ:', error);
  }

  const line = {
    channelSecret: isSet(env.LINE_CHANNEL_SECRET),
    channelAccessToken: isSet(env.LINE_CHANNEL_ACCESS_TOKEN),
    recipientIds: isSet(env.LINE_RECIPIENT_IDS),
  };

  const messenger = {
    appSecret: isSet(env.FACEBOOK_APP_SECRET),
    pageAccessToken: isSet(env.FACEBOOK_PAGE_ACCESS_TOKEN),
    verifyToken: env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || '',
    recipientIds: isSet(env.FACEBOOK_MESSENGER_RECIPIENT_IDS),
    approvedAdmins,
  };

  return NextResponse.json({
    publicBaseUrl: env.PUBLIC_BASE_URL || '',
    metaGraphApiVersion: env.META_GRAPH_API_VERSION || 'v20.0',
    line,
    messenger,
  });
}
