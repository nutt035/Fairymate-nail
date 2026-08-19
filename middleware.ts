import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Public paths — ไม่ต้อง Auth (หน้าจองคิวลูกค้า, API สาธารณะ, webhooks)
  if (
    pathname === '/' ||
    pathname === '/booking' ||
    pathname.startsWith('/booking/') ||
    pathname === '/availability' ||
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/check-queue') ||
    pathname.startsWith('/api/notify') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // ไฟล์ที่มีนามสกุล (.jpg, .png, .svg ฯลฯ)
  ) {
    return NextResponse.next();
  }

  // --- ส่วนล็อกรหัสผ่าน (Basic Auth) ---
  // ตั้งค่าผ่าน ADMIN_USERNAME / ADMIN_PASSWORD ใน .env / Vercel
  // (ค่าเริ่มต้น admin/1234 ใช้ได้เฉพาะ dev — ต้องเปลี่ยนก่อนขึ้น production)
  if (process.env.DISABLE_ADMIN_AUTH === 'true') {
    return NextResponse.next();
  }

  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || '1234';

  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    if (user === adminUser && pwd === adminPassword) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Auth Required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}