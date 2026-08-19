-- ============================================================
-- Migration: ตารางเก็บ PSID จาก Messenger (จับคนติดต่อ + แอดมิน)
-- วันที่: 2026-08-18
--
-- วิธีรัน: เปิด Supabase Dashboard > SQL Editor > วางโค้ดนี้ > Run
--   https://supabase.com/dashboard/project/<project-id>/sql/new
-- ============================================================

-- 1) สร้างตาราง (ปลอดภัย: ถ้ามีอยู่แล้วจะข้ามไป)
CREATE TABLE IF NOT EXISTS public.messenger_contacts (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  psid          text NOT NULL UNIQUE,          -- Page Scoped ID ของลูกค้า (จาก webhook sender.id)
  name          text,                          -- ชื่อ (ลองดึงจาก Graph API — ได้เฉพาะตอนแชทภายใน 24 ชม.)
  first_seen_at timestamptz NOT NULL DEFAULT now(),  -- แชทครั้งแรก
  last_seen_at  timestamptz NOT NULL DEFAULT now(),  -- แชทล่าสุด
  is_admin      boolean NOT NULL DEFAULT false,      -- แอดมินกด approve ในหน้า /admin/messenger
  approved_at   timestamptz,                   -- เวลาที่กด approve
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 2) Index ไว้ค้นหาเร็ว
CREATE INDEX IF NOT EXISTS idx_messenger_contacts_psid
  ON public.messenger_contacts (psid);
CREATE INDEX IF NOT EXISTS idx_messenger_contacts_is_admin
  ON public.messenger_contacts (is_admin);

-- 3) หมายเหตุความปลอดภัย:
--    • ตารางนี้เก็บเฉพาะ PSID (ไม่ใช่ข้อมูลส่วนตัว) — ควรเปิด RLS + policy
--      (service role เท่านั้น) ก่อนขึ้น production เหมือนตารางอื่น
--    • ตอนนี้ปิด RLS ให้สอดคล้องกับสถานะโปรเจกต์ปัจจุบัน (RLS ปิดทุกตาราง)
ALTER TABLE public.messenger_contacts DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- หลังรัน: เช็คผลด้วย
--   SELECT count(*) FROM messenger_contacts;  -- ควร = 0 (ยังไม่มีใครแชท)
--   ลูกค้าส่งข้อความหาเพจ Messenger → webhook จะบันทึกแถวใหม่ให้อัตโนมัติ
-- ============================================================
