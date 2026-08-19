-- ============================================================
-- Migration: เพิ่มคอลัมน์เชื่อมบัญชีลูกค้า (LINE / Messenger)
-- วันที่: 2026-08-17
--
-- วิธีรัน: เปิด Supabase Dashboard > SQL Editor > วางโค้ดนี้ > Run
--   https://supabase.com/dashboard/project/<project-id>/sql/new
-- ============================================================

-- 1) เพิ่มคอลัมน์ (ปลอดภัย: ถ้ามีอยู่แล้วจะข้ามไป ไม่ error)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS line_user_id text,
  ADD COLUMN IF NOT EXISTS messenger_psid text;

-- 2) Index ไว้ค้นหาเร็วขึ้น (optional แต่แนะนำ)
CREATE INDEX IF NOT EXISTS idx_bookings_line_user_id
  ON public.bookings (line_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_messenger_psid
  ON public.bookings (messenger_psid);

-- ============================================================
-- หมายเหตุ:
--   • line_user_id     = ID ของบัญชี LINE ลูกค้า (ขึ้นต้นด้วย U...)
--                       เช่น U4a8f3c2b1d... ได้จาก LINE Developers
--   • messenger_psid   = PSID (Page Scoped ID) ของบัญชี Messenger
--                       เช่น 1234567890 (ตัวเลข) ได้จาก webhook
--   • ถ้าไม่เพิ่มคอลัมน์เหล่านี้ ระบบยังจองได้ปกติ (โค้ดตัดคอลัมน์
--     อัตโนมัติ) แต่จะรู้ไม่ได้ว่าการจองมาจาก LINE/Messenger ใคร
--     และจะส่งข้อความยืนยันสถานะคิวกลับไปหาลูกค้าไม่ได้
-- ============================================================
