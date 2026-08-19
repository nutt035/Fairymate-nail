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

const THAI_DAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

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

  // ── สร้างข้อความช่วงเวลาเปิด-ปิด (สั้นกระชับ) ─────────────────────────────
  const openDays = hours.filter((h) => !h.is_closed && h.open_time && h.close_time);
  const hoursText = (() => {
    if (openDays.length === 0) return 'เปิดทุกวัน 11:00–21:00';
    const fmt = (h: StoreHour) => `${h.open_time!.slice(0, 5)}–${h.close_time!.slice(0, 5)}`;
    const allSame = openDays.every(
      (h) => h.open_time === openDays[0].open_time && h.close_time === openDays[0].close_time,
    );
    if (allSame) {
      // เช่น "จ.–ส. 11:00–21:00"
      const openWeekdays = openDays.map((h) => THAI_DAYS_SHORT[h.weekday]).join('·');
      return `${openWeekdays} ${fmt(openDays[0])}`;
    }
    // ถ้าต่างกัน แสดงเฉพาะวันที่ต่าง
    return openDays.map((h) => `${THAI_DAYS_SHORT[h.weekday]} ${fmt(h)}`).join(' · ');
  })();

  const lineUrl = process.env.NEXT_PUBLIC_LINE_OA_URL || '#';
  const messengerUrl = process.env.NEXT_PUBLIC_MESSENGER_URL || '#';

  return (
    <div className="min-h-screen bg-pink-50/40 pb-16 font-sans selection:bg-pink-200">
      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <div className="relative pt-16 pb-10 px-6 overflow-hidden bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-b-[40px] border-b border-pink-100">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-pink-200/50 to-rose-200/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-purple-200/50 to-pink-200/50 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/3"></div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <img
            src="/logo.svg"
            alt="Fairymate.Nail"
            className="w-24 h-24 rounded-[1.75rem] shadow-xl shadow-pink-200/60 mb-4"
          />

          <h1 className="text-2xl font-extrabold text-gray-900 mb-1 tracking-tight">Fairymate.Nail</h1>
          <p className="text-pink-600/80 font-medium text-xs mb-3">Nail Studio · บางบอน</p>

          <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-2xl text-[10px] font-bold border border-green-100">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="leading-tight">
              {loading ? 'กำลังโหลด...' : hoursText}
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-5 py-6 space-y-6">

        {/* ── 2. ปุ่มจองคิวหลัก ─────────────────────────────────────────── */}
        <a
          href="/booking"
          className="block w-full bg-gradient-to-r from-rose-400 via-pink-500 to-fuchsia-500 text-white p-5 rounded-[2rem] shadow-lg shadow-pink-200/60 flex items-center gap-4 transition-all active:scale-95"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <CalendarHeart size={24} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-extrabold text-lg leading-tight">จองคิวออนไลน์</p>
            <p className="text-[11px] text-white/80 mt-0.5">เลือกบริการ วัน & เวลาที่สะดวก</p>
          </div>
          <ChevronRight size={20} className="shrink-0" />
        </a>

        {/* ── 3. เมนูกริด 4 ปุ่ม ──────────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-2 gap-3">
            <MenuItem href="/availability" icon={<Search size={24} />} iconBg="bg-blue-50 text-blue-500" title="เช็คคิวว่าง" subtitle="ดูเวลาว่างรายสัปดาห์" />
            <MenuItem href="#promos" icon={<Tag size={24} />} iconBg="bg-amber-50 text-amber-500" title="โปรโมชั่น" subtitle={`${promotions.length > 0 ? promotions.length : 'ดู'} ข้อเสนอดีๆ`} />
            <MenuItem href="#services" icon={<BookOpen size={24} />} iconBg="bg-rose-50 text-rose-500" title="บริการ" subtitle="เจล / ต่อเล็บ / เพ้นท์" />
            <MenuItem href="#map" icon={<MapPin size={24} />} iconBg="bg-emerald-50 text-emerald-500" title="แผนที่" subtitle="มาหาเราที่บางบอน" />
          </div>
        </section>

        {/* ── 4. โปรโมชั่น (horizontal scroll cards) ────────────────────── */}
        {promotions.length > 0 && (
          <section id="promos">
            <h2 className="text-base font-extrabold text-gray-900 mb-1">โปรโมชั่นพิเศษ ✨</h2>
            <p className="text-[11px] text-gray-400 mb-3">ข้อเสนอสุดคุ้มที่ไม่ควรพลาด</p>
            <div className="flex overflow-x-auto gap-3 pb-2 snap-x snap-mandatory -mx-5 px-5 scrollbar-hide">
              {promotions.map((promo) => {
                const promoText =
                  promo.discount_type === 'percent' ? `ลด ${promo.value}%` : `ลด ฿${Number(promo.value).toLocaleString('th-TH')}`;
                return (
                  <div key={promo.id} className="snap-center shrink-0 w-[220px] bg-gradient-to-br from-rose-400 via-pink-500 to-fuchsia-500 rounded-2xl p-[2px] shadow-lg shadow-pink-200/50">
                    <div className="bg-white rounded-[14px] h-full p-4 flex flex-col">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                          <Tag size={18} className="text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{promo.name}</h3>
                          <span className="inline-block mt-0.5 text-xs font-black text-pink-600">ราคา ฿{Number(promo.value).toLocaleString('th-TH')}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mb-3">โปรโมชั่นหน้าร้าน</p>
                      <div className="mt-auto">
                        <a href="/booking" className="block w-full text-center py-2 bg-pink-50 text-pink-600 text-xs font-bold rounded-xl hover:bg-pink-100 transition-colors">
                          จองเลย
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 5. บริการเด่น ─────────────────────────────────────────────── */}
        <section id="services" className="bg-white rounded-[2rem] shadow-sm border border-pink-50 p-5">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 text-base mb-3">
            <Store className="text-pink-500" size={18} />
            บริการของเรา
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {['เจลทำเล็บ (Gel Polish)', 'ต่อเล็บ (Acrylic / Tip)', 'ลบเล็บเจล', 'เพ้นท์ลาย / งานดีไซน์'].map((s) => (
              <div key={s} className="flex items-center justify-between bg-pink-50/50 rounded-xl px-3.5 py-2.5">
                <span className="text-sm font-medium text-gray-700">{s}</span>
                <ChevronRight size={14} className="text-pink-300" />
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. แผนที่ร้าน ─────────────────────────────────────────────── */}
        <section id="map" className="bg-white rounded-[2rem] shadow-sm border border-pink-50 overflow-hidden">
          <div className="p-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 text-base">
              <MapPin className="text-rose-500" size={18} />
              แผนที่ร้าน
            </h2>
          </div>
          <div className="p-6 bg-gray-50 flex flex-col items-center justify-center text-center">
            <MapPin size={28} className="text-gray-300 mb-2" />
            <p className="text-xs font-medium text-gray-400">รออัปเดตแผนที่</p>
          </div>
        </section>

        {/* ── 7. ปุ่มติดต่อท้ายหน้า ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={lineUrl}
            target={lineUrl !== '#' ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 bg-[#06C755] text-white rounded-2xl font-bold text-sm shadow-lg shadow-green-200 transition active:scale-95"
          >
            <MessageCircle size={16} /> LINE
          </a>
          <a
            href={messengerUrl}
            target={messengerUrl !== '#' ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 bg-[#0084FF] text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 transition active:scale-95"
          >
            <Facebook size={16} /> Messenger
          </a>
        </div>

        <p className="text-center text-[10px] text-gray-400 pt-1">
          Fairymate.Nail · ระบบจองคิวออนไลน์
        </p>
      </main>
    </div>
  );
}

// ── Sub-component: การ์ดเมนู ──────────────────────────────────────────────────
function MenuItem({
  href, icon, iconBg, title, subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
}) {
  return (
    <a
      href={href}
      className="group bg-white p-4 rounded-2xl shadow-sm hover:shadow-lg transition-all active:scale-95 border border-pink-50 flex items-center gap-3"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-gray-900 text-sm leading-tight">{title}</h3>
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{subtitle}</p>
      </div>
      <ChevronRight size={14} className="text-pink-300 shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </a>
  );
}
