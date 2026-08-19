-- ============================================================
-- Fairymate.Nail — Migrate ข้อมูลเดิม → แอปใหม่ (queues → bookings)
-- ------------------------------------------------------------
-- ⚠️ ต้องรัน migrations/2026-08-17_setup_schema.sql ก่อน (สร้าง bookings)
-- รันใน: Supabase Dashboard > SQL Editor (วางทั้งหมดแล้วกด Run)
-- ปลอดภัย: ถ้า bookings มีข้อมูลอยู่แล้ว → script จะหยุดทั้งชุด (กันคัดลอกซ้ำ)
-- ============================================================

BEGIN;

-- ─── 0) กันซ้ำ: migrate ได้เฉพาะตอน bookings ยังว่าง ──────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM bookings LIMIT 1) THEN
    RAISE EXCEPTION 'bookings มีข้อมูลแล้ว — ข้ามการ migrate (รันครั้งแรกตอน bookings ว่างเท่านั้น)';
  END IF;
END $$;

-- ─── 1) queues → bookings ────────────────────────────────────────
--    queues.customer_name เป็น "ชื่อจริง" (จากหน้าจอง) หรือ "เลขคิว 01/02" (จาก admin magic input) → เก็บตามเดิม
--    queues.service_name   เป็นข้อความชื่อบริการ → จับคู่กับ services ตามชื่อ (ไม่ตรง → service_id NULL แต่ยังเก็บชื่อไว้ใน note)
--    แผนที่ status: pending→pending, in_progress→confirmed, finished→done, cancelled→cancelled
--    duration_adjusted   = (end_time - start_time) - duration_minutes ของบริการ
--    final_price         = price (ราคาที่เก็บจริง)
--    note                = JSON { services:[...], customerNote, invoiceNo } (ให้หน้า admin/ใบเสร็จอ่านได้)
INSERT INTO bookings (
  customer_name, customer_phone, service_id, booking_date, start_time,
  duration_adjusted, discount, final_price, status, note, created_at
)
SELECT DISTINCT ON (q.id)
  q.customer_name,                              -- ชื่อจริงหรือเลขคิว ตามข้อมูลเดิม (แก้ได้ที่หน้า admin)
  NULL,                                         -- ข้อมูลเดิมไม่มีเบอร์โทร
  s.id,                                         -- services.id (UUID) ถ้าจับคู่ชื่อเจอ
  q.date::date,
  q.start_time::time,
  COALESCE(
    GREATEST(
      EXTRACT(EPOCH FROM (q.end_time::time - q.start_time::time)) / 60
        - COALESCE(s.duration_minutes, 0),
      0
    ),
    0
  )::integer,                                   -- เวลาส่วนเกิน (จองยาวกว่าบริการมาตรฐาน)
  0,                                            -- ตารางเดิมไม่มีส่วนลด
  q.price,                                      -- ราคาสุทธิจริง
  CASE q.status
    WHEN 'finished'    THEN 'done'
    WHEN 'in_progress' THEN 'confirmed'
    WHEN 'cancelled'   THEN 'cancelled'
    ELSE 'pending'
  END,
  jsonb_build_object(
    'services', jsonb_build_array(jsonb_build_object(
      'id',    s.id::text,
      'name',  q.service_name,
      'price', q.price
    )),
    'customerNote', q.note,
    'invoiceNo',    r.invoice_no                -- เลขใบเสร็จเดิม (ถ้ามี) เก็บไว้ไม่ให้หาย
  )::text,
  now()
FROM queues q
LEFT JOIN services s ON lower(trim(s.name)) = lower(trim(q.service_name))
LEFT JOIN receipts r ON r.queue_id = q.id
ORDER BY q.id, r.created_at NULLS LAST;

-- ─── 2) stock_items → inventory (ข้อมูลสต็อกเดิม) ─────────────────
--    แอปใหม่ใช้ตาราง inventory (ไม่ใช้ stock_items) → คัดลอกเฉพาะตอน inventory ว่าง
--    ⚠️ ต้องรัน setup_schema ก่อน (เพิ่มคอลัมน์ inventory.category / cost_per_unit)
INSERT INTO inventory (name, quantity, unit, min_level, category, cost_per_unit, created_at)
SELECT
  name,
  COALESCE(quantity, 0),
  COALESCE(unit, 'ชิ้น'),
  COALESCE(min_quantity, 5),
  COALESCE(category, 'อื่นๆ'),
  COALESCE(cost_per_unit, 0),
  COALESCE(created_at, now())
FROM stock_items
WHERE NOT EXISTS (SELECT 1 FROM inventory);

-- ─── 3) goals → shop_settings (เป้ายอดเดือน) ─────────────────────
--    setup_schema seed monthly_target = 0 → เอาเป้าหมายเดิมมาใส่ (เฉพาะตอนยังเป็น 0)
INSERT INTO shop_settings (id, monthly_target)
SELECT 1, COALESCE(amount, 0) FROM goals
ORDER BY COALESCE(updated_at, now()) DESC
LIMIT 1
ON CONFLICT (id) DO UPDATE
SET monthly_target = EXCLUDED.monthly_target
WHERE shop_settings.monthly_target = 0;

-- ─── 4) expenses: เอาข้อมูลเดิมมาเติมคอลัมน์ใหม่ ───────────────────
--    setup_schema เพิ่ม title / expense_date → คัดลอกจาก description / date เดิม
UPDATE expenses SET
  title        = COALESCE(title, description, category, 'รายจ่าย'),
  expense_date = COALESCE(expense_date, date, CURRENT_DATE)
WHERE title IS NULL OR expense_date IS NULL;

COMMIT;

-- ============================================================
-- หลังรัน: เช็คผลด้วย
--   SELECT count(*) FROM bookings;        -- ควรเท่ากับจำนวนคิวเดิม (ไม่นับที่ลบไปแล้ว)
--   SELECT count(*) FROM inventory;       -- ควรเท่ากับจำนวน stock_items เดิม
--   SELECT * FROM shop_settings;          -- เป้ายอดเดือนควรเป็นตัวเลขเดิม
-- ============================================================
