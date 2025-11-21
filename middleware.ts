import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // ✅ ข้อยกเว้น: ถ้าเข้า API เช็คคิว หรือไฟล์รูปภาพ -> ให้ผ่านไปเลย (ห้ามล็อก)
  if (req.nextUrl.pathname.startsWith('/api/check-queue') || 
      req.nextUrl.pathname.startsWith('/_next') || 
      req.nextUrl.pathname.startsWith('/favicon.ico') ||
      req.nextUrl.pathname.startsWith('/static') || 
      req.nextUrl.pathname.includes('.')) { // ปล่อยไฟล์ที่มีนามสกุลทั้งหมด (เช่น .jpg, .png)
    return NextResponse.next();
  }

  // --- ส่วนล็อกรหัสผ่าน (Basic Auth) ---
  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    // รหัสร้าน (admin / 1234)
    if (user === 'admin' && pwd === '1234') {
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