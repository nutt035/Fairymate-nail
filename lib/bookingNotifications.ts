import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

interface BookingNotification {
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  startTime: string;
  serviceNames: string[];
  price: number;
  subtotal?: number;
  discount?: number;
  promotion?: string;
  note?: string;
}

interface CustomerTargets {
  lineUserId?: string;
  messengerPsid?: string;
}

// ─── แจ้งเตือนแอดมิน (LINE + Messenger) ───────────────────────────────────────
export async function notifyNewBooking(booking: BookingNotification) {
  const text = buildAdminMessage(booking);

  const [line, messenger] = await Promise.allSettled([
    sendLine(text),
    sendMessenger(text),
  ]);

  return {
    line: resultStatus(line),
    messenger: resultStatus(messenger),
  };
}

// ─── แจ้งยืนยันการจองกลับไปหาลูกค้า (LINE / Messenger ของลูกค้าเอง) ───────────
export async function notifyCustomer(booking: BookingNotification, targets: CustomerTargets) {
  if (!targets.lineUserId && !targets.messengerPsid) {
    return { line: 'skipped', messenger: 'skipped' };
  }

  const text = buildCustomerMessage(booking);

  const [line, messenger] = await Promise.allSettled([
    targets.lineUserId
      ? sendLineToUser(targets.lineUserId, text)
      : Promise.resolve(false),
    targets.messengerPsid
      ? sendMessengerToUser(targets.messengerPsid, text)
      : Promise.resolve(false),
  ]);

  return {
    line: resultStatus(line),
    messenger: resultStatus(messenger),
  };
}

function resultStatus(result: PromiseSettledResult<boolean>) {
  return result.status === 'fulfilled' && result.value ? 'sent' : 'skipped_or_failed';
}

// ─── สร้างข้อความ ─────────────────────────────────────────────────────────────

function formatDate(bookingDate: string) {
  return new Date(bookingDate + 'T12:00:00+07:00').toLocaleDateString('th-TH', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function priceLines(booking: BookingNotification) {
  const lines: string[] = [];
  if (booking.subtotal != null && booking.discount) {
    lines.push(`💰 รวม: ฿${booking.subtotal.toLocaleString('th-TH')}  (ลด ${booking.discount.toLocaleString('th-TH')})`);
  }
  return lines;
}

function buildAdminMessage(booking: BookingNotification) {
  const lines = [
    '✨ มีคิวใหม่จากเว็บไซต์!',
    `👤 ลูกค้า: ${booking.customerName}`,
    `📞 โทร: ${booking.customerPhone}`,
    `💅 บริการ: ${booking.serviceNames.join(', ')}`,
    ...(booking.promotion ? [`🎁 โปรโมชั่น: ${booking.promotion}`] : []),
    `📅 วัน: ${formatDate(booking.bookingDate)}`,
    `⏰ เวลา: ${booking.startTime.slice(0, 5)} น.`,
    ...priceLines(booking),
    `💰 ราคาสุทธิ: ฿${booking.price.toLocaleString('th-TH')}`,
    ...(booking.note ? [`📝 หมายเหตุ: ${booking.note}`] : []),
  ];
  return lines.join('\n');
}

function buildCustomerMessage(booking: BookingNotification) {
  const lines = [
    '✅ ยืนยันการจองคิวของคุณแล้วค่ะ 💅✨',
    `💅 บริการ: ${booking.serviceNames.join(', ')}`,
    ...(booking.promotion ? [`🎁 โปรโมชั่น: ${booking.promotion}`] : []),
    `📅 วัน: ${formatDate(booking.bookingDate)}`,
    `⏰ เวลา: ${booking.startTime.slice(0, 5)} น.`,
    ...priceLines(booking),
    `💰 ยอดรวม: ฿${booking.price.toLocaleString('th-TH')}`,
    '',
    '💬 แอดมินจะติดต่อกลับเพื่อยืนยันอีกครั้งนะคะ',
  ];
  return lines.join('\n');
}

// ─── ส่ง LINE ─────────────────────────────────────────────────────────────────

async function sendLine(text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const recipients = recipientIds(process.env.LINE_RECIPIENT_IDS ?? process.env.LINE_GROUP_ID);
  if (!token || recipients.length === 0) return false;

  const results = await Promise.all(
    recipients.map(async (recipient) => {
      const response = await pushLine(token, recipient, text);
      if (!response.ok) {
        console.error('LINE notification failed', response.status, await response.text());
      }
      return response.ok;
    }),
  );
  return results.every(Boolean);
}

// ส่งข้อความยืนยันไปหาลูกค้าโดยตรง (Push API — ส่งได้ทุกเวลา ไม่จำกัด 24 ชม.)
async function sendLineToUser(to: string, text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return false;

  const response = await pushLine(token, to, text);
  if (!response.ok) {
    console.error('LINE customer confirmation failed', response.status, await response.text());
  }
  return response.ok;
}

async function pushLine(token: string, to: string, text: string) {
  return fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Line-Retry-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      to,
      messages: [{ type: 'text', text }],
    }),
  });
}

// ─── ส่ง Messenger ────────────────────────────────────────────────────────────

async function sendMessenger(text: string) {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const version = process.env.META_GRAPH_API_VERSION || 'v20.0';

  // ผู้รับ = PSID จาก env + แอดมินที่ approve แล้วในตาราง messenger_contacts
  const envRecipients = recipientIds(
    process.env.FACEBOOK_MESSENGER_RECIPIENT_IDS ?? process.env.FACEBOOK_MESSENGER_RECIPIENT_ID,
  );
  const approvedAdmins = await getApprovedAdminPsids();
  const recipients = [...new Set([...envRecipients, ...approvedAdmins])];

  if (!token || recipients.length === 0) return false;

  const results = await Promise.all(
    recipients.map(async (recipient) => {
      const response = await sendMessengerToUser(recipient, text);
      return response;
    }),
  );
  return results.every(Boolean);
}

// ส่งยืนยันการจองกลับไปที่ PSID ของลูกค้า
// ใช้ MESSAGE_TAG (CONFIRMED_EVENT_UPDATE) เพื่อให้ส่งได้แม้เกิน 24 ชม.
// ถ้า tag ยังไม่ได้เปิดใช้ → ลองส่งแบบ RESPONSE แทน
async function sendMessengerToUser(psid: string, text: string) {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const version = process.env.META_GRAPH_API_VERSION || 'v20.0';
  if (!token) return false;

  const url = new URL(`https://graph.facebook.com/${version}/me/messages`);
  url.searchParams.set('access_token', token);

  const body = (messagingType: string, tag?: string) => ({
    recipient: { id: psid },
    messaging_type: messagingType,
    ...(tag ? { tag } : {}),
    message: { text },
  });

  const first = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body('MESSAGE_TAG', 'CONFIRMED_EVENT_UPDATE')),
  });

  if (first.ok) return true;

  // tag ไม่ได้เปิดใช้ → ลอง RESPONSE
  const second = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body('RESPONSE')),
  });

  if (!second.ok) {
    console.error('Messenger customer confirmation failed', second.status, await second.text());
  }
  return second.ok;
}

function recipientIds(value: string | undefined) {
  return [...new Set((value ?? '').split(',').map((id) => id.trim()).filter(Boolean))];
}

// แอดมินที่กด "ยืนยันเป็นแอดมิน" ในหน้า /admin/messenger
// (ถ้าตารางยังไม่สร้าง → คืน [] เพื่อให้ระบบทำงานด้วย env ตามเดิม)
async function getApprovedAdminPsids(): Promise<string[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('messenger_contacts')
      .select('psid')
      .eq('is_admin', true);
    return (data ?? []).map((row) => row.psid);
  } catch (error) {
    console.error('[bookingNotifications] อ่านแอดมิน PSID จาก messenger_contacts ไม่สำเร็จ:', error);
    return [];
  }
}

// ─── แจ้งสถานะคิวกลับหาลูกค้า (ยืนยัน / เลื่อน / ยกเลิก / เสร็จ+ใบเสร็จ) ──────

export type BookingStatusAction = 'confirmed' | 'rescheduled' | 'cancelled' | 'done';

export interface BookingStatusInfo {
  customerName: string;
  bookingDate: string;
  startTime: string;
  services: Array<{ name: string; price: number }>;
  price: number;
  subtotal?: number;
  discount?: number;
  promotion?: string;
}

// ส่งข้อความสถานะคิวไปที่ LINE / Messenger ของลูกค้า
// prev = วัน/เวลาเดิม (เฉพาะตอนเลื่อนคิว)
export async function notifyBookingStatus(
  info: BookingStatusInfo,
  targets: CustomerTargets,
  action: BookingStatusAction,
  prev?: { bookingDate: string; startTime: string },
) {
  if (!targets.lineUserId && !targets.messengerPsid) {
    return { line: 'skipped', messenger: 'skipped' };
  }

  const text = buildStatusMessage(action, info, prev);

  const [line, messenger] = await Promise.allSettled([
    targets.lineUserId
      ? sendLineToUser(targets.lineUserId, text)
      : Promise.resolve(false),
    targets.messengerPsid
      ? sendMessengerToUser(targets.messengerPsid, text)
      : Promise.resolve(false),
  ]);

  return {
    line: resultStatus(line),
    messenger: resultStatus(messenger),
  };
}

function buildStatusMessage(
  action: BookingStatusAction,
  info: BookingStatusInfo,
  prev?: { bookingDate: string; startTime: string },
) {
  const serviceList = info.services.map((s) => s.name).join(', ');
  const dateDisplay = formatDate(info.bookingDate);
  const time = `${info.startTime.slice(0, 5)} น.`;

  switch (action) {
    case 'confirmed':
      return [
        '✅ คิวของคุณได้รับการยืนยันแล้วค่ะ 💅✨',
        `💅 บริการ: ${serviceList}`,
        `📅 วัน: ${dateDisplay}`,
        `⏰ เวลา: ${time}`,
        '',
        'กรุณามาก่อนเวลานัดประมาณ 10 นาทีนะคะ เจอกันค่ะ 💕',
      ].join('\n');

    case 'rescheduled':
      return [
        '🔄 คิวของคุณถูกเลื่อนเวลาแล้วค่ะ',
        `📅 จากเดิม: ${prev ? formatDate(prev.bookingDate) : '-'} เวลา ${prev?.startTime ?? '-'} น.`,
        `📅 เป็น: ${dateDisplay} เวลา ${time}`,
        '',
        'หากเวลาที่เลื่อนไม่สะดวก แจ้งแอดมินได้เลยนะคะ 💬',
      ].join('\n');

    case 'cancelled':
      return [
        '❌ คิวของคุณถูกยกเลิกแล้วค่ะ',
        `📅 เดิม: ${dateDisplay} เวลา ${time}`,
        `💅 บริการ: ${serviceList}`,
        '',
        'หากต้องการจองคิวใหม่ พิมพ์ "จอง" ได้เลย หรือติดต่อแอดมินค่ะ 💬',
      ].join('\n');

    case 'done':
      return buildReceiptMessage(info);
  }
}

// ใบเสร็จรับเงิน (ข้อความ) — ส่งได้ทั้ง LINE และ Messenger โดยไม่ต้องมีไฟล์รูป
function buildReceiptMessage(info: BookingStatusInfo) {
  const dateDisplay = formatDate(info.bookingDate);
  const line = '─'.repeat(20);

  const rows = info.services.map((s) => {
    const name = s.name.length > 18 ? s.name.slice(0, 17) + '…' : s.name;
    const price = `฿${Number(s.price || 0).toLocaleString('th-TH')}`;
    return `💅 ${name.padEnd(14, ' ')} ${price.padStart(8, ' ')}`;
  });

  const lines = [
    '🎉 งานเสร็จเรียบร้อยแล้วค่ะ ขอบคุณที่ใช้บริการ! 💕',
    '',
    '🧾 ใบเสร็จรับเงิน / Receipt',
    line,
    `📅 ${dateDisplay}`,
    `⏰ ${info.startTime.slice(0, 5)} น.`,
    `👤 ${info.customerName}`,
    line,
    ...rows,
    line,
    ...(info.subtotal != null && info.discount
      ? [`💰 รวม: ฿${info.subtotal.toLocaleString('th-TH')}`, `🎁 ส่วนลด: -฿${info.discount.toLocaleString('th-TH')}`]
      : []),
    ...(info.promotion ? [`🎁 โปรโมชั่น: ${info.promotion}`] : []),
    `💰 ยอดสุทธิ: ฿${info.price.toLocaleString('th-TH')}`,
    line,
    'แล้วเจอกันใหม่นะคะ 💅✨',
  ];

  return lines.join('\n');
}
