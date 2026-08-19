import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { notifyNewBooking, notifyCustomer } from '@/lib/bookingNotifications';

const SLOT_MINUTES = 30;

// ─── GET: ดึงบริการ + โปรโมชั่น + เวลาว่าง ────────────────────────────────────
export async function GET(request: Request) {
  const supabase = getSupabaseAdmin();
  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  const serviceIdsParam = url.searchParams.get('services') || url.searchParams.get('serviceId');

  // ดึงรายการบริการ (เฉพาะที่เปิดใช้)
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('id, name, price, duration_minutes')
    .eq('is_active', true)
    .order('price');

  if (servicesError) return serverError(servicesError.message);

  // ดึงโปรโมชั่นที่เปิดใช้
  const { data: promotions, error: promosError } = await supabase
    .from('promotions')
    .select('id, name, discount_type, value')
    .eq('is_active', true)
    .order('id');

  if (promosError) return serverError(promosError.message);

  if (!date) return NextResponse.json({ services, promotions: promotions ?? [], slots: [] });

  // validate date
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayInBangkok()) {
    return NextResponse.json({ error: 'วันที่ไม่ถูกต้อง' }, { status: 400 });
  }

  // ดึงเวลาเปิด-ปิดร้าน และ bookings ที่จองไปแล้ว
  const weekday = new Date(`${date}T12:00:00+07:00`).getDay();

  const [{ data: hours, error: hoursError }, { data: existingBookings, error: bookingsError }] =
    await Promise.all([
      supabase
        .from('store_hours')
        .select('open_time, close_time, is_closed')
        .eq('weekday', weekday)
        .maybeSingle(),
      supabase
        .from('bookings')
        .select('start_time, duration_adjusted, services(duration_minutes)')
        .eq('booking_date', date)
        .neq('status', 'cancelled'),
    ]);

  if (hoursError || bookingsError) {
    return serverError(hoursError?.message || bookingsError?.message || 'Query failed');
  }
  if (!hours || hours.is_closed) {
    return NextResponse.json({ services, promotions: promotions ?? [], slots: [], closed: true });
  }

  // รวม duration ของบริการทั้งหมดที่เลือก
  const selectedIds = (serviceIdsParam ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const duration = sumDuration(services ?? [], selectedIds) || SLOT_MINUTES;

  // คำนวณ slots ว่าง
  const slots = buildSlots(hours.open_time, hours.close_time, existingBookings ?? [], duration);

  return NextResponse.json({ services, promotions: promotions ?? [], slots, closed: false });
}

// ─── POST: รับการจองจากลูกค้า (รองรับหลายบริการ + โปรโมชั่น) ──────────────────
export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const customerName = clean(body.customerName, 100);
  const customerPhone = clean(body.customerPhone, 30);
  const date = clean(body.date, 10);
  const startTime = clean(body.startTime, 5);
  const noteRaw = clean(body.note, 300);
  const promotionId = clean(body.promotionId, 100);

  // บัญชีลูกค้าที่เชื่อม (จากลิงก์จองในแชท LINE / Messenger)
  const lineUserId = clean(body.lineUserId, 100);
  const messengerPsid = clean(body.messengerPsid, 100);

  // รองรับทั้ง services: [{id}] และ serviceId เดิม
  const rawServices = Array.isArray(body.services)
    ? (body.services as Array<Record<string, unknown>>)
        .map((s) => clean(s?.id, 100))
        .filter(Boolean)
    : [clean(body.serviceId, 100)].filter(Boolean);

  // Validate
  const phoneClean = customerPhone.replace(/[ -]/g, '');
  if (
    !customerName ||
    !/^0\d{8,9}$/.test(phoneClean) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}$/.test(startTime) ||
    rawServices.length === 0
  ) {
    return NextResponse.json(
      { error: 'กรุณากรอกข้อมูลให้ครบและตรวจสอบเบอร์โทร (0XXXXXXXXX)' },
      { status: 400 },
    );
  }
  if (date < todayInBangkok()) {
    return NextResponse.json({ error: 'ไม่สามารถจองวันที่ผ่านมาแล้ว' }, { status: 400 });
  }

  // ดึงบริการทั้งหมดที่เลือก (ต้องเปิดใช้)
  const { data: selectedServices, error: servicesError } = await supabase
    .from('services')
    .select('id, name, price, duration_minutes, is_active')
    .in('id', rawServices)
    .eq('is_active', true);

  if (servicesError) return serverError(servicesError.message);

  const services = (selectedServices ?? []).filter((s: any) =>
    rawServices.includes(String(s.id)),
  );

  if (services.length !== rawServices.length) {
    return NextResponse.json({ error: 'ไม่พบบริการที่เลือก' }, { status: 400 });
  }

  // ── คำนวณเวลารวม + ราคารวม ──
  const totalDuration = services.reduce(
    (sum: number, s: any) => sum + Number(s.duration_minutes || s.duration || SLOT_MINUTES),
    0,
  );
  const subtotal = services.reduce((sum: number, s: any) => sum + (Number(s.price) || 0), 0);

  // ── คำนวณส่วนลดจากโปรโมชั่น ──
  let discount = 0;
  let promotionName: string | undefined;
  if (promotionId) {
    const { data: promo } = await supabase
      .from('promotions')
      .select('name, discount_type, value')
      .eq('id', promotionId)
      .eq('is_active', true)
      .maybeSingle();

    if (promo) {
      promotionName = promo.name;
      if (promo.discount_type === 'percent') {
        discount = Math.round((subtotal * Number(promo.value)) / 100);
      } else {
        discount = Math.min(Number(promo.value) || 0, subtotal);
      }
    }
  }

  const finalPrice = Math.max(subtotal - discount, 0);

  // เช็คเวลาทำการ
  const weekday = new Date(`${date}T12:00:00+07:00`).getDay();
  const { data: hours } = await supabase
    .from('store_hours')
    .select('open_time, close_time, is_closed')
    .eq('weekday', weekday)
    .maybeSingle();

  const endTime = addMinutesToTime(startTime, totalDuration);

  if (
    !hours ||
    hours.is_closed ||
    startTime < hours.open_time.slice(0, 5) ||
    endTime > hours.close_time.slice(0, 5)
  ) {
    return NextResponse.json({ error: 'เวลานี้อยู่นอกเวลาทำการ' }, { status: 409 });
  }

  // เช็ค conflict กับคิวที่มีอยู่ (ใช้ duration รวมของทุกบริการ)
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, duration_adjusted, services(duration_minutes)')
    .eq('booking_date', date)
    .neq('status', 'cancelled');

  const newStartMins = toMinutes(startTime);
  const newEndMins = newStartMins + totalDuration;

  const hasConflict = (existingBookings ?? []).some((b: any) => {
    const [bH, bM] = b.start_time.split(':').map(Number);
    const bStartMins = bH * 60 + bM;
    const serviceObj = Array.isArray(b.services) ? b.services[0] : b.services;
    const bDuration =
      Number(serviceObj?.duration_minutes || serviceObj?.duration || SLOT_MINUTES) +
      (b.duration_adjusted || 0);
    const bEndMins = bStartMins + bDuration;
    return newStartMins < bEndMins && bStartMins < newEndMins;
  });

  if (hasConflict) {
    return NextResponse.json({ error: 'เวลานี้มีผู้จองแล้ว กรุณาเลือกเวลาใหม่' }, { status: 409 });
  }

  // ── บันทึกการจอง ──
  // บริการแรกเก็บใน service_id (เข้ากับหน้า admin เดิม)
  // ส่วนต่างของเวลารวมเก็บใน duration_adjusted
  // รายการบริการทั้งหมดเก็บใน note เป็น JSON (ถ้าตารางมีคอลัมน์ note)
  const primary = services[0];
  const extraDuration = totalDuration - Number(primary.duration_minutes || SLOT_MINUTES);

  const servicesSnapshot = services.map((s: any) => ({
    id: String(s.id),
    name: s.name,
    price: Number(s.price) || 0,
    duration_minutes: Number(s.duration_minutes || SLOT_MINUTES),
  }));

  const noteText = JSON.stringify({
    services: servicesSnapshot,
    promotion: promotionName ? { name: promotionName } : undefined,
    customerNote: noteRaw || undefined,
    phone: phoneClean,
  });

  // พยายาม insert พร้อมคอลัมน์เพิ่ม (note / line_user_id / messenger_psid) ก่อน
  // ถ้าตารางยังไม่มีคอลัมน์ไหน → ตัดคอลัมน์นั้นออกแล้วลองใหม่ (ไม่ให้พังการจอง)
  const baseRow = {
    customer_name: customerName,
    customer_phone: customerPhone,
    service_id: String(primary.id),
    booking_date: date,
    start_time: startTime,
    duration_adjusted: Math.max(extraDuration, 0),
    discount: discount,
    final_price: finalPrice,
    status: 'pending',
  };

  const insert = async (row: Record<string, unknown>) =>
    supabase
      .from('bookings')
      .insert(row as any)
      .select('id, customer_name, booking_date, start_time, status')
      .single();

  const fullRow: Record<string, unknown> = {
    ...baseRow,
    note: noteText,
    ...(lineUserId ? { line_user_id: lineUserId } : {}),
    ...(messengerPsid ? { messenger_psid: messengerPsid } : {}),
  };

  let row = fullRow;
  let result = await insert(row);
  for (let i = 0; i < 3 && result.error; i++) {
    const msg = String(result.error.message).toLowerCase();
    const missing = ['note', 'line_user_id', 'messenger_psid'].filter((col) =>
      msg.includes(col),
    );
    if (missing.length === 0) break;
    for (const col of missing) delete row[col];
    result = await insert(row);
  }

  if (result.error) return serverError(result.error.message);

  // แจ้งเตือน LINE + Messenger (แสดงรายการบริการทั้งหมด + ยอดรวม)
  const notifications = await notifyNewBooking({
    customerName,
    customerPhone,
    bookingDate: date,
    startTime,
    serviceNames: services.map((s: any) => s.name),
    price: finalPrice,
    subtotal,
    discount,
    promotion: promotionName,
    note: noteRaw || undefined,
  });

  // ส่งใบยืนยันกลับไปที่ LINE / Messenger ของลูกค้าเอง (ถ้ามาจากลิงก์ในแชท)
  const customerNotified = await notifyCustomer(
    {
      customerName,
      customerPhone,
      bookingDate: date,
      startTime,
      serviceNames: services.map((s: any) => s.name),
      price: finalPrice,
      subtotal,
      discount,
      promotion: promotionName,
    },
    { lineUserId: lineUserId || undefined, messengerPsid: messengerPsid || undefined },
  );

  return NextResponse.json(
    { booking: result.data, notifications, customerNotified, totalDuration, totalPrice: finalPrice },
    { status: 201 },
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sumDuration(services: any[], selectedIds: string[]) {
  const list = services.filter((s) => selectedIds.includes(String(s.id)));
  if (list.length === 0) return 0;
  return list.reduce(
    (sum: number, s: any) => sum + Number(s.duration_minutes || s.duration || SLOT_MINUTES),
    0,
  );
}

function buildSlots(
  open: string,
  close: string,
  bookings: any[],
  duration: number,
) {
  const result: Array<{ time: string; available: boolean }> = [];
  const openMins = toMinutes(open);
  const closeMins = toMinutes(close);

  for (let minute = openMins; minute + duration <= closeMins; minute += SLOT_MINUTES) {
    const time = fromMinutes(minute);
    const slotEnd = minute + duration;

    const available = !bookings.some((b) => {
      const [bH, bM] = b.start_time.split(':').map(Number);
      const bStartMins = bH * 60 + bM;
      const serviceObj = Array.isArray(b.services) ? b.services[0] : b.services;
      const bDuration =
        Number(serviceObj?.duration_minutes || serviceObj?.duration || SLOT_MINUTES) +
        (b.duration_adjusted || 0);
      const bEndMins = bStartMins + bDuration;
      return minute < bEndMins && bStartMins < slotEnd;
    });

    result.push({ time, available });
  }
  return result;
}

function toMinutes(time: string) {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}
function fromMinutes(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
function addMinutesToTime(time: string, minutes: number) {
  return fromMinutes(toMinutes(time) + minutes);
}
function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function todayInBangkok() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}
function serverError(detail: string) {
  console.error('Public booking API:', detail);
  return NextResponse.json({ error: 'ระบบขัดข้อง กรุณาลองใหม่' }, { status: 500 });
}
