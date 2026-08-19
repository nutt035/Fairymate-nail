'use client';

import { useEffect, useState } from 'react';
import {
  MapPin, CalendarHeart, BookOpen, Search,
  ChevronRight, MessageCircle, Facebook, Tag, Store,
} from 'lucide-react';
import { supabase } from '@/utils/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Promotion {
  id: string;
  name: string;
  discount_type: 'percent' | 'amount';
  value: number;
}
interface StoreHour {
  weekday: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

export default function LandingPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [hours, setHours] = useState<StoreHour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [promoRes, hoursRes] = await Promise.all([
          supabase.from('promotions').select('*').eq('is_active', true).order('id'),
          supabase.from('store_hours').select('*').order('weekday'),
        ]);
        if (!active) return;
        if (promoRes.data) setPromotions(promoRes.data);
        if (hoursRes.data) setHours(hoursRes.data);
      } catch {
        /* ignore — ใช้ค่า fallback */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // ── สร้างข้อความช่วงเวลาเปิด-ปิดจาก store_hours ─────────────────────────
  const openDays = hours.filter((h) => !h.is_closed && h.open_time && h.close_time);
  const hoursText = (() => {
    if (openDays.length === 0) return 'เปิดทุกวัน 11:00 – 21:00 น.';
    const allSame = openDays.every(
      (h) => h.open_time === openDays[0].open_time && h.close_time === openDays[0].close_time,
    );
    const fmt = (h: StoreHour) =>
      `${h.open_time!.slice(0, 5)} – ${h.close_time!.slice(0, 5)} น.`;
    if (allSame) return `เปิดบริการ ${fmt(openDays[0])}`;
    return openDays.map((h) => `${THAI_DAYS[h.weekday]} ${fmt(h)}`).join(' · ');
  })();

  const lineUrl = process.env.NEXT_PUBLIC_LINE_OA_URL || '#';
  const messengerUrl = process.env.NEXT_PUBLIC_MESSENGER_URL || '#';

  return (
    <div className="min-h-screen bg-pink-50/40 pb-16 font-sans selection:bg-pink-200">
      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <div className="relative pt-16 pb-12 px-6 overflow-hidden bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-b-[40px] border-b border-pink-100">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-pink-200/50 to-rose-200/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-purple-200/50 to-pink-200/50 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/3"></div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <img
            src="/logo.svg"
            alt="Fairymate.Nail"
            className="w-28 h-28 rounded-[2rem] shadow-xl shadow-pink-200/60 mb-6"
          />

          <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Fairymate.Nail</h1>
          <p className="text-pink-600/80 font-medium text-sm mb-3">Nail Studio · ทำเล็บเจล บางบอน</p>

          <div className="inline-flex items-start gap-1.5 px-3 py-2 bg-green-50 text-green-600 rounded-2xl text-[10px] font-bold border border-green-100 text-left max-w-xs">
            <span className="relative flex h-2 w-2 mt-1 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="flex flex-col leading-relaxed">
              {loading ? 'กำลังโหลดเวลาทำการ...' : hoursText}
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-5 py-8 space-y-8">

        {/* ── 2. ปุ่มจองคิวหลัก ─────────────────────────────────────────── */}
        <a
          href="/booking"
          className="block w-full bg-gradient-to-r from-rose-400 via-pink-500 to-fuchsia-500 text-white p-5 rounded-[2rem] shadow-lg shadow-pink-200/60 flex items-center gap-4 transition-all active:scale-95"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <CalendarHeart size={28} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-extrabold text-lg leading-tight">จองคิวออนไลน์</p>
            <p className="text-[11px] text-white/80 mt-0.5">เลือกบริการ วัน & เวลาที่สะดวกได้เลย</p>
          </div>
          <ChevronRight size={22} className="shrink-0" />
        </a>

        {/* ── 3. โปรโมชั่น (horizontal scroll) ──────────────────────────── */}
        {promotions.length > 0 && (
          <section>
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">โปรโมชั่นพิเศษ ✨</h2>
                <p className="text-xs text-gray-500 mt-0.5">ข้อเสนอสุดคุ้มที่คุณไม่ควรพลาด</p>
              </div>
            </div>
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory -mx-5 px-5">
              {promotions.map((promo) => {
                const promoText =
                  promo.discount_type === 'percent' ? `ลด ${promo.value}%` : `ลด ฿${Number(promo.value).toLocaleString('th-TH')}`;
                return (
                  <div key={promo.id} className="snap-center shrink-0 w-[280px] bg-gradient-to-br from-rose-400 via-pink-500 to-fuchsia-500 rounded-3xl p-[2px] shadow-lg shadow-pink-200/50">
                    <div className="bg-white/95 backdrop-blur-sm rounded-[22px] h-full p-4 flex flex-col">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                          <Tag size={20} className="text-rose-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 line-clamp-1">{promo.name}</h3>
                          <span className="inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">{promoText}</span>
                        </div>
                      </div>
                      <div className="mt-auto pt-3 border-t border-gray-100/50 flex items-center justify-between text-[10px] font-semibold text-gray-400">
                        <span>โปรโมชั่นหน้าร้าน</span>
                        <a href="/booking" className="text-pink-500">จองเลย</a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 4. เมนูกริด ────────────────────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-2 gap-4">
            <MenuItem href="/booking" icon={<CalendarHeart size={28} />} iconBg="bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-lg shadow-pink-200" title="จองคิว" subtitle="เลือกวัน & เวลา" color="text-pink-300" />
            <MenuItem href="/availability" icon={<Search size={28} />} iconBg="bg-blue-50 text-blue-500" title="เช็คคิวว่าง" subtitle="ดูเวลาว่างของร้าน" color="text-blue-300" />
            <MenuItem href={lineUrl} external icon={<MessageCircle size={28} />} iconBg="bg-green-50 text-green-500" title="ติดต่อร้าน" subtitle="ทัก LINE สอบถามได้" color="text-green-300" />
            <MenuItem href={messengerUrl} external icon={<Facebook size={28} />} iconBg="bg-sky-50 text-sky-500" title="Messenger" subtitle="แชทกับแอดมิน" color="text-sky-300" />
            <MenuItem href="#services" icon={<BookOpen size={28} />} iconBg="bg-rose-50 text-rose-500" title="บริการของเรา" subtitle="เจล / ต่อเล็บ / เพ้นท์" color="text-rose-300" />
            <MenuItem href="#map" icon={<MapPin size={28} />} iconBg="bg-amber-50 text-amber-500" title="แผนที่ร้าน" subtitle="มาหาเราได้ที่บางบอน" color="text-amber-300" />
          </div>
        </section>

        {/* ── 5. บริการเด่น ─────────────────────────────────────────────── */}
        <section id="services" className="bg-white rounded-[2rem] shadow-sm border border-pink-50 p-6">
          <div className="mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
              <Store className="text-pink-500" size={20} />
              บริการของเรา
            </h2>
            <p className="text-xs text-gray-500 mt-1">ราคาเริ่มต้น ดูรายละเอียดเพิ่มเติมได้ที่ร้าน</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {['เจลทำเล็บ (Gel Polish)', 'ต่อเล็บ (Acrylic / Tip)', 'ลบเล็บเจล', 'เพ้นท์ลาย / งานดีไซน์'].map((s) => (
              <div key={s} className="flex items-center justify-between bg-pink-50/50 rounded-2xl px-4 py-3">
                <span className="text-sm font-medium text-gray-700">{s}</span>
                <ChevronRight size={16} className="text-pink-300" />
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. แผนที่ร้าน ─────────────────────────────────────────────── */}
        <section id="map" className="bg-white rounded-[2rem] shadow-sm border border-pink-50 overflow-hidden">
          <div className="p-5 border-b border-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
              <MapPin className="text-rose-500" size={20} />
              แผนที่ร้าน
            </h2>
          </div>
          <div className="p-8 bg-gray-50 flex flex-col items-center justify-center text-center">
            <MapPin size={32} className="text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-500">รออัปเดตแผนที่</p>
          </div>
        </section>

        {/* ── 7. ปุ่มติดต่อท้ายหน้า ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={lineUrl}
            target={lineUrl !== '#' ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-4 bg-[#06C755] text-white rounded-2xl font-bold text-sm shadow-lg shadow-green-200 transition active:scale-95"
          >
            <MessageCircle size={18} /> ติดต่อ LINE
          </a>
          <a
            href={messengerUrl}
            target={messengerUrl !== '#' ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-4 bg-[#0084FF] text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 transition active:scale-95"
          >
            <Facebook size={18} /> Messenger
          </a>
        </div>

        <p className="text-center text-[10px] text-gray-400 pt-2">
          Fairymate.Nail · ระบบจองคิวออนไลน์
        </p>
      </main>
    </div>
  );
}

// ── Sub-component: การ์ดเมนู ──────────────────────────────────────────────────
function MenuItem({
  href, icon, iconBg, title, subtitle, color, external,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  color: string;
  external?: boolean;
}) {
  const cls = 'group relative overflow-hidden bg-white p-5 rounded-[2rem] shadow-sm hover:shadow-xl transition-all active:scale-95 border border-pink-50 flex flex-col items-start gap-4';
  const inner = (
    <>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${iconBg}`}>
        {icon}
      </div>
      <div className="w-full">
        <h3 className="font-bold text-gray-900 text-lg flex justify-between items-center w-full">
          {title} <ChevronRight size={16} className={`${color} group-hover:translate-x-1 transition-transform`} />
        </h3>
        <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
  ) : (
    <a href={href} className={cls}>{inner}</a>
  );
}
