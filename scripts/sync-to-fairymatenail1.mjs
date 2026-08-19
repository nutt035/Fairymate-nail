#!/usr/bin/env node
/**
 * สคริปต์ซิงค์ไฟล์ใหม่จาก repo นี้ (Fairymate-nail) → ไปยัง checkout ของ Fairymatenail1
 *
 * วิธีใช้:
 *   node scripts/sync-to-fairymatenail1.mjs [path/to/fairymatenail1]
 *   (ไม่ใส่ path → ใช้ ../fairymatenail1)
 *
 * สิ่งที่ทำ:
 *   1. คัดลอกไฟล์ใหม่ (webhook, API, lib, migrations) + ปรับ import path อัตโนมัติ
 *   2. คัดลอก "ไฟล์อ้างอิง" ที่ต้อง merge มือ (booking page, middleware) เป็น .new.* ไว้เทียบ
 *   3. พิมพ์ checklist สิ่งที่ต้องแก้มือ
 *
 * ปลอดภัย: ไม่ทับไฟล์เดิมของ Fairymatenail1 ที่ต้อง merge มือ
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const target = path.resolve(process.argv[2] || path.join(root, '..', 'fairymatenail1'));

// ── [จาก repo นี้, ไปที่ Fairymatenail1] — คัดลอกตรงๆ + ปรับ import ───────
const COPY_FILES = [
  ['app/api/webhooks/line/route.ts', 'app/api/webhooks/line/route.ts'],
  ['app/api/webhooks/messenger/route.ts', 'app/api/webhooks/messenger/route.ts'],
  ['app/api/public/booking/route.ts', 'app/api/public/booking/route.ts'],
  ['app/api/booking/notify-customer/route.ts', 'app/api/booking/notify-customer/route.ts'],
  ['app/api/check-queue/route.ts', 'app/api/check-queue/route.ts'],
  ['lib/bookingNotifications.ts', 'lib/bookingNotifications.ts'],
  ['lib/supabaseAdmin.ts', 'lib/supabase-admin.ts'],
  ['utils/lineService.ts', 'lib/line-service.ts'],
  ['migrations/2026-08-17_setup_schema.sql', 'migrations/2026-08-17_setup_schema.sql'],
  ['migrations/2026-08-17_migrate_queues_to_bookings.sql', 'migrations/2026-08-17_migrate_queues_to_bookings.sql'],
  ['migrations/2026-08-17_add_booking_chat_links.sql', 'migrations/2026-08-17_add_booking_chat_links.sql'],
];

// ── ไฟล์อ้างอิง (ต้อง merge มือ — เก็บเป็น .new.* ไม่ทับของเดิม) ─────────────
const REFERENCE_FILES = [
  ['app/booking/page.tsx', 'app/booking/page.new.tsx'],
  ['middleware.ts', 'middleware.new.ts'],
  ['app/page.tsx', 'app/page.landing.new.tsx'],
  ['app/admin/page.tsx', 'app/admin/dashboard.new.tsx'],
];

// ── import rewrites: [regex, replacement] ────────────────────────────────────
const REWRITES = [
  [/'@\/utils\/supabase'/g, "'@/lib/supabase'"],
  [/'@\/utils\/lineService'/g, "'@/lib/line-service'"],
  [/'@\/lib\/supabaseAdmin'/g, "'@/lib/supabase-admin'"],
];

if (!fs.existsSync(target)) {
  console.error(`❌ ไม่พบโฟลเดอร์ Fairymatenail1: ${target}`);
  console.error('   โคลนมาก่อน:  git clone https://github.com/nutt035/Fairymatenail1.git <target>');
  process.exit(1);
}

let copied = 0;
let failed = 0;

for (const [srcRel, dstRel] of COPY_FILES) {
  const src = path.join(root, srcRel);
  const dst = path.join(target, dstRel);
  if (!fs.existsSync(src)) {
    console.error(`  ⚠️ ข้าม (ไม่มีใน repo นี้): ${srcRel}`);
    failed++;
    continue;
  }
  try {
    let content = fs.readFileSync(src, 'utf8');
    const eol = content.includes('\r\n') ? '\r\n' : '\n';
    for (const [pattern, replacement] of REWRITES) {
      content = content.replace(pattern, replacement);
    }
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, content.split('\n').join(eol));
    console.log(`  ✅ ${srcRel} → ${dstRel}`);
    copied++;
  } catch (e) {
    console.error(`  ❌ ${srcRel}: ${e.message}`);
    failed++;
  }
}

console.log(`\nคัดลอกสำเร็จ ${copied} ไฟล์${failed ? `, ข้าม/ล้มเหลว ${failed} ไฟล์` : ''}`);

// ── ไฟล์อ้างอิง ─────────────────────────────────────────────────────────────
console.log('\n── ไฟล์ที่ต้อง merge มือ (คัดลอกเป็น .new.* ไว้เทียบ ยังไม่ทับของเดิม) ──');
for (const [srcRel, dstRel] of REFERENCE_FILES) {
  const src = path.join(root, srcRel);
  const dst = path.join(target, dstRel);
  if (!fs.existsSync(src)) { console.log(`  ⚠️ ไม่มี: ${srcRel}`); continue; }
  const content = fs.readFileSync(src, 'utf8');
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, content);
  console.log(`  📄 ${srcRel} → ${dstRel}`);
}

console.log('\n── Checklist งานมือ (ตาม MERGE-PLAN.md ข้อ 2) ──');
console.log(`  1. หน้า booking: นำเฉพาะลิงก์ line_uid/psid + success screen ไปใส่ใน app/booking/page.tsx เดิม (${path.join(target, 'app/booking/page.tsx')})`);
console.log('  2. middleware: เพิ่ม /api/public/, /api/webhooks/, /api/check-queue, / ลงใน public paths');
console.log('  3. admin (queues/dashboard): เรียก /api/booking/notify-customer หลังยืนยัน/เลื่อน/ยกเลิก/จบงาน');
console.log('  4. หน้า landing: เอา app/page.landing.new.tsx ไปวางเป็น app/page.tsx');
console.log('  5. รัน migrations บน Supabase (setup_schema → migrate_queues_to_bookings)');
console.log('  6. ตั้ง env: SUPABASE_SERVICE_ROLE_KEY, LINE_CHANNEL_SECRET, PUBLIC_BASE_URL');
console.log('\nหมายเหตุ: import ถูกแก้ให้เป็นแบบ Fairymatenail1 แล้ว (@/lib/supabase, @/lib/supabase-admin, @/lib/line-service)');
