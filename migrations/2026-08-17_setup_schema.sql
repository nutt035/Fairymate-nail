-- ============================================================
-- Fairymate.Nail — สร้างตารางที่ขาดหาย + เพิ่มคอลัมน์ที่จำเป็น
-- รันใน: Supabase Dashboard > SQL Editor (วางทั้งหมดแล้วกด Run)
-- ปลอดภัย: ใช้ IF NOT EXISTS รันซ้ำได้ ไม่พัง
-- ============================================================

-- ─── 1) bookings (ตารางหลักสำหรับหน้า Booking + admin) ───
CREATE TABLE IF NOT EXISTS bookings (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_name     text NOT NULL,
  customer_phone    text,
  service_id        uuid REFERENCES services(id),        -- services.id เป็น UUID
  booking_date      date NOT NULL,
  start_time        time NOT NULL,
  duration_adjusted integer DEFAULT 0,                   -- เวลาส่วนเกิน (จองหลายบริการ)
  discount          numeric(10,2) DEFAULT 0,
  final_price       numeric(10,2) DEFAULT 0,
  status            text DEFAULT 'pending',              -- pending | confirmed | done | cancelled
  note              text,                                -- JSON: รายการบริการทั้งหมด + โปรโมชั่น
  line_user_id      text,                                -- เชื่อมบัญชี LINE
  messenger_psid    text,                                -- เชื่อมบัญชี Messenger
  is_notified       boolean DEFAULT false,               -- ใช้กับระบบเตือนคิว (check-queue)
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_date        ON bookings (booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_line_user   ON bookings (line_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_messenger   ON bookings (messenger_psid);

-- ─── 2) promotions (โปรโมชั่น — ลด % หรือลดบาท) ───
CREATE TABLE IF NOT EXISTS promotions (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent',       -- 'percent' | 'amount'
  value         numeric(10,2) NOT NULL DEFAULT 0,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- ─── 3) customers ───
CREATE TABLE IF NOT EXISTS customers (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text,
  phone       text,
  facebook    text,
  visit_count integer DEFAULT 0,
  total_spent numeric(10,2) DEFAULT 0,
  last_visit  timestamptz,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS facebook text;

-- ─── 4) inventory (สต็อก) ───
CREATE TABLE IF NOT EXISTS inventory (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL,
  quantity   numeric DEFAULT 0,
  unit       text,
  min_level  integer DEFAULT 5,
  created_at timestamptz DEFAULT now()
);

-- ─── 5) service_recipes (สูตร: บริการใช้สต็อกอะไรบ้าง) ───
CREATE TABLE IF NOT EXISTS service_recipes (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_id    uuid REFERENCES services(id),           -- services.id เป็น UUID
  inventory_id  bigint REFERENCES inventory(id),
  quantity_used numeric DEFAULT 1,
  created_at    timestamptz DEFAULT now()
);

-- ─── 6) shop_settings (เป้ายอดเดือน) ───
CREATE TABLE IF NOT EXISTS shop_settings (
  id             integer PRIMARY KEY,
  monthly_target numeric(10,2) DEFAULT 0
);
INSERT INTO shop_settings (id, monthly_target)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- ─── 7) expenses (มีอยู่แล้ว → เพิ่มคอลัมน์ที่โค้ดใช้) ───
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS title        text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS amount       numeric(10,2) DEFAULT 0;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category     text DEFAULT 'ทั่วไป';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_date date DEFAULT CURRENT_DATE;

-- ─── 8) services (มีอยู่แล้ว → กันไว้ให้ครบ) ───
ALTER TABLE services ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 60;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active       boolean DEFAULT true;
UPDATE services SET is_active = true WHERE is_active IS NULL;

-- ─── 9) inventory: เพิ่มคอลัมน์ที่หน้า stock (ตาม UI เดิม) ใช้ ──────
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS category      text DEFAULT 'อื่นๆ';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cost_per_unit numeric(10,2) DEFAULT 0;

-- ─── 10) store_exceptions (เวลาเปิด-ปิดพิเศษ ตาม UI เดิม) ────────────
CREATE TABLE IF NOT EXISTS store_exceptions (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date        date NOT NULL UNIQUE,
  open_time   time,
  close_time  time,
  is_closed   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- ─── 11) receipts: เพิ่มคอลัมน์ booking_id (เชื่อมกับ bookings ใหม่) ──
--    ของเดิม receipts.queue_id เป็น UUID (อ้างอิงตาราง queues เก่า) →
--    ใบเสร็จใหม่ต้องอ้าง bookings.id (bigint) แทน ผ่านคอลัมน์ booking_id
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS booking_id bigint;
CREATE INDEX IF NOT EXISTS idx_receipts_booking ON receipts (booking_id);

-- ใบเสร็จเก่า → จับคู่กับ bookings ผ่านเลขใบเสร็จที่เก็บไว้ใน note (JSON invoiceNo)
UPDATE receipts r
SET booking_id = b.id
FROM bookings b
WHERE r.booking_id IS NULL
  AND b.note IS NOT NULL
  AND b.note LIKE '{%'
  AND (b.note::jsonb ->> 'invoiceNo') = r.invoice_no;

-- ============================================================
-- 12) เวลาเปิด-ปิดร้าน (store_hours มีอยู่แล้ว)
--    ⚠️ ตารางนี้มีคอลัมน์ id เป็นตัวแรก — อย่า INSERT แบบไม่ระบุคอลัมน์!
--    เปลี่ยนเวลาตามร้านจริง แล้วรัน (เอาคอมเมนต์ -- ออก):
-- ============================================================
-- UPDATE store_hours
-- SET open_time = '15:30', close_time = '22:00', is_closed = false
-- WHERE weekday IN (0,1,2,3,4,5,6);

-- ============================================================
-- หมายเหตุสำคัญ:
-- • ตารางใหม่ทั้งหมด RLS ยังปิดอยู่ (เหมือนตารางเดิม) → แอปใช้งานได้ทันที
--   อย่าเปิด RLS โดยไม่สร้าง policy ก่อน ไม่งั้นหน้าแอดมินอ่านข้อมูลไม่ได้
-- • services.id เป็น UUID — โค้ดแก้ให้ใช้ String id แล้ว (ไม่ต้องแก้ตาราง)
-- • รันได้หลายครั้ง ไม่มีผลข้างเคียง
-- ============================================================
