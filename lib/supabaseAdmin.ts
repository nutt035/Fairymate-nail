import 'server-only';
import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error('Supabase server credentials are not configured');
  }
  // ยังไม่ได้ตั้ง SUPABASE_SERVICE_ROLE_KEY (หรือยังเป็น placeholder อย่าง
  // "ใส่_service_role_key_ตรงนี้") → ใช้ anon key แทน (ตอนนี้ RLS ปิดอยู่ทุก
  // ตาราง แอปจึงทำงานได้ปกติ) แต่ควรตั้ง service role key จริงก่อนขึ้น
  // production เพื่อความปลอดภัย
  // รับทั้ง JWT รูปแบบเดิม (eyJ...) และรูปแบบใหม่ (sb_secret_...)
  const key = (serviceRoleKey || '').trim();
  const isRealKey =
    /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key) ||
    /^sb_secret_[A-Za-z0-9_-]+$/.test(key);
  if (!key || !isRealKey) {
    console.warn('[supabaseAdmin] SUPABASE_SERVICE_ROLE_KEY ยังไม่ตั้ง/ไม่ถูกต้อง — ใช้ anon key แทน (dev only)');
    return createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
