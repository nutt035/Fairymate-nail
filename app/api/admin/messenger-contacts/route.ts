import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// ─── จัดการ PSID ที่จับได้จาก Messenger ────────────────────────────────────────
// ใช้ในหน้า /admin/messenger — ถูก Basic Auth ป้องกัน (ไม่อยู่ใน public paths)

// GET: รายชื่อคนที่แชทกับเพจ (เรียงตามแชทล่าสุด)
export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('messenger_contacts')
    .select('*')
    .order('last_seen_at', { ascending: false });

  if (error) {
    // ตารางยังไม่สร้าง (ยังไม่รัน migration) → บอกให้ชัด
    const tableMissing =
      error.code === '42P01' ||
      error.code === 'PGRST205' ||
      /not find the table/i.test(error.message || '');
    if (tableMissing) {
      return NextResponse.json(
        { error: 'ยังไม่พบตาราง messenger_contacts — ให้รัน migrations/2026-08-18_messenger_contacts.sql ใน Supabase SQL Editor ก่อน', contacts: [] },
        { status: 200 }
      );
    }
    return NextResponse.json({ error: error.message, contacts: [] }, { status: 500 });
  }

  return NextResponse.json({ contacts: data ?? [] });
}

// POST: approve / unapprove / delete
//   body: { action: 'approve' | 'unapprove' | 'delete', psid: string }
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const action = body?.action;
  const psid = typeof body?.psid === 'string' ? body.psid.trim() : '';

  if (!['approve', 'unapprove', 'delete'].includes(action) || !psid) {
    return NextResponse.json({ error: 'คำขอไม่ถูกต้อง (ต้องการ action + psid)' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (action === 'delete') {
    const { error } = await supabase.from('messenger_contacts').delete().eq('psid', psid);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const isAdmin = action === 'approve';
  const { error } = await supabase
    .from('messenger_contacts')
    .update({
      is_admin: isAdmin,
      approved_at: isAdmin ? new Date().toISOString() : null,
    })
    .eq('psid', psid);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
