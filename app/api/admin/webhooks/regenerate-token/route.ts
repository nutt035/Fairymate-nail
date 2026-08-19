import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

// ─── สร้าง FACEBOOK_WEBHOOK_VERIFY_TOKEN ใหม่ใน .env.local ─────────────────────
// ใช้ในหน้า /admin/webhooks — ถูก Basic Auth ป้องกัน
// หมายเหตุ: ใช้ได้เฉพาะตอนรันบนเครื่อง dev (มี .env.local ให้เขียน)
// บน Vercel/เซิร์ฟเวอร์ production ต้องตั้ง env var ด้วยตัวเอง
export async function POST() {
  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    return NextResponse.json(
      { error: 'ไม่พบไฟล์ .env.local — บน Vercel/เซิร์ฟเวอร์ต้องตั้ง FACEBOOK_WEBHOOK_VERIFY_TOKEN เอง' },
      { status: 400 }
    );
  }

  const token = randomBytes(24).toString('hex');
  let content = readFileSync(envPath, 'utf8');

  if (/^FACEBOOK_WEBHOOK_VERIFY_TOKEN=.*$/m.test(content)) {
    content = content.replace(
      /^FACEBOOK_WEBHOOK_VERIFY_TOKEN=.*$/m,
      `FACEBOOK_WEBHOOK_VERIFY_TOKEN=${token}`
    );
  } else {
    content = content.trimEnd() + `\nFACEBOOK_WEBHOOK_VERIFY_TOKEN=${token}\n`;
  }

  writeFileSync(envPath, content);
  console.log('[webhooks] regenerate verify token — อย่าลืมวางค่าใหม่ใน Meta Developer Console');

  return NextResponse.json({ ok: true, verifyToken: token });
}
