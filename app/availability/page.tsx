'use client';

import { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Clock, CalendarDays,
  ArrowRight, Loader2, Home,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}
interface Slot {
  time: string;
  available: boolean;
}
interface DaySlots {
  date: string;
  dayLabel: string;
  dateLabel: string;
  slots: Slot[];
  closed: boolean;
  loading: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const THAI_DAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

function formatDateStr(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d);
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export default function AvailabilityPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date(todayStr() + 'T12:00:00+07:00');
    today.setDate(today.getDate() - today.getDay() + 1); // Monday
    return today;
  });
  const [days, setDays] = useState<DaySlots[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Load services
  useEffect(() => {
    fetch('/api/public/booking')
      .then((r) => r.json())
      .then((d) => {
        const svc = d.services || [];
        setServices(svc);
        // เลือกทุกบริการเป็นค่าเริ่มต้น
        setSelectedServiceIds(svc.map((s: Service) => String(s.id)));
      })
      .catch(() => {})
      .finally(() => setLoadingServices(false));
  }, []);

  // Load slots for 7 days
  useEffect(() => {
    if (selectedServiceIds.length === 0) {
      setDays([]);
      return;
    }

    const today = new Date(todayStr() + 'T00:00:00');
    const newDays: DaySlots[] = [];

    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const dateStr = formatDateStr(d);
      const isPast = d < today;
      newDays.push({
        date: dateStr,
        dayLabel: THAI_DAYS_SHORT[d.getDay()],
        dateLabel: `${d.getDate()} ${THAI_MONTHS[d.getMonth()]}`,
        slots: [],
        closed: false,
        loading: !isPast,
      });
    }

    setDays(newDays);

    // Fetch slots for each day
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const dateStr = formatDateStr(d);
      if (d < today) continue;

      const q = new URLSearchParams({
        date: dateStr,
        services: selectedServiceIds.join(','),
      });

      fetch(`/api/public/booking?${q}`)
        .then((r) => r.json())
        .then((data) => {
          setDays((prev) =>
            prev.map((day) =>
              day.date === dateStr
                ? { ...day, slots: data.slots || [], closed: data.closed || false, loading: false }
                : day
            )
          );
        })
        .catch(() => {
          setDays((prev) =>
            prev.map((day) =>
              day.date === dateStr ? { ...day, loading: false } : day
            )
          );
        });
    }
  }, [weekStart, selectedServiceIds]);

  // นับจำนวน slot ว่าง
  const availableCount = (slots: Slot[]) => slots.filter((s) => s.available).length;
  const totalCount = (slots: Slot[]) => slots.length;

  return (
    <div className="min-h-screen bg-pink-50/40 pb-16 font-sans">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-pink-100 sticky top-0 z-50">
        <div className="max-w-xl mx-auto px-5 py-4 flex items-center gap-3">
          <a
            href="/"
            className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 hover:bg-pink-100 transition-colors"
          >
            <Home size={16} />
          </a>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">เช็คคิวว่าง</p>
            <p className="text-[10px] text-gray-400">ดูเวลาว่างรายสัปดาห์</p>
          </div>
          <a
            href="/booking"
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-rose-400 to-pink-500 text-white text-xs font-bold rounded-xl shadow-sm"
          >
            จองเลย <ArrowRight size={12} />
          </a>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 py-6 space-y-5">
        {/* Week Navigation */}
        <div className="bg-white rounded-2xl border border-pink-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setWeekStart((d) => addDays(d, -7))}
              className="p-2 hover:bg-pink-50 rounded-xl transition-colors"
            >
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-900">
                สัปดาห์ {weekStart.getDate()} {THAI_MONTHS[weekStart.getMonth()]}
                {' – '}
                {addDays(weekStart, 6).getDate()} {THAI_MONTHS[addDays(weekStart, 6).getMonth()]}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {weekStart.getFullYear() + 543}
              </p>
            </div>
            <button
              onClick={() => setWeekStart((d) => addDays(d, 7))}
              className="p-2 hover:bg-pink-50 rounded-xl transition-colors"
            >
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>

          {/* Quick jump to today */}
          {(() => {
            const today = new Date(todayStr() + 'T12:00:00+07:00');
            const todayMonday = new Date(today);
            todayMonday.setDate(today.getDate() - today.getDay() + 1);
            const isCurrentWeek = formatDateStr(todayMonday) === formatDateStr(weekStart);
            if (isCurrentWeek) return null;
            return (
              <button
                onClick={() => {
                  const t = new Date(todayStr() + 'T12:00:00+07:00');
                  t.setDate(t.getDate() - t.getDay() + 1);
                  setWeekStart(t);
                }}
                className="w-full text-center text-xs text-pink-500 font-medium py-1 hover:bg-pink-50 rounded-lg transition-colors"
              >
                ← กลับสัปดาห์นี้
              </button>
            );
          })()}
        </div>

        {/* Service Filter */}
        {services.length > 0 && (
          <div className="bg-white rounded-2xl border border-pink-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              เลือกบริการ
            </p>
            <div className="flex flex-wrap gap-2">
              {services.map((s) => {
                const selected = selectedServiceIds.includes(String(s.id));
                return (
                  <button
                    key={s.id}
                    onClick={() =>
                      setSelectedServiceIds((prev) =>
                        selected
                          ? prev.filter((x) => x !== String(s.id))
                          : [...prev, String(s.id)]
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      selected
                        ? 'bg-pink-500 text-white border-pink-500 shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {loadingServices && (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-pink-400" size={28} />
          </div>
        )}

        {/* Days Grid */}
        {!loadingServices && (
          <div className="space-y-3">
            {days.map((day) => {
              const today = new Date(todayStr() + 'T00:00:00');
              const dayDate = new Date(day.date + 'T00:00:00');
              const isToday = day.date === todayStr();
              const isPast = dayDate < today;
              const avail = availableCount(day.slots);
              const total = totalCount(day.slots);

              return (
                <div
                  key={day.date}
                  className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                    isToday
                      ? 'border-pink-300 shadow-md ring-2 ring-pink-100'
                      : 'border-pink-100'
                  }`}
                >
                  {/* Day Header */}
                  <div className={`px-4 py-3 flex items-center justify-between ${
                    isToday ? 'bg-pink-50' : 'bg-gray-50/50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center ${
                        isToday
                          ? 'bg-pink-500 text-white'
                          : isPast
                          ? 'bg-gray-200 text-gray-400'
                          : 'bg-pink-100 text-pink-600'
                      }`}>
                        <span className="text-[9px] font-bold leading-none">{day.dayLabel}</span>
                        <span className="text-sm font-black leading-none">{dayDate.getDate()}</span>
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${isToday ? 'text-pink-600' : 'text-gray-800'}`}>
                          {day.dateLabel}
                          {isToday && <span className="ml-1.5 text-[10px] bg-pink-500 text-white px-1.5 py-0.5 rounded-full">วันนี้</span>}
                        </p>
                        {isPast ? (
                          <p className="text-[10px] text-gray-400">ผ่านมาแล้ว</p>
                        ) : day.closed ? (
                          <p className="text-[10px] text-red-400 font-medium">ปิดทำการ</p>
                        ) : day.loading ? (
                          <p className="text-[10px] text-gray-400">กำลังโหลด...</p>
                        ) : (
                          <p className="text-[10px] text-gray-400">
                            {avail > 0 ? (
                              <span className="text-green-500 font-medium">ว่าง {avail}/{total} ช่วง</span>
                            ) : (
                              <span className="text-red-400 font-medium">เต็มทุกช่วง</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    {!isPast && !day.closed && !day.loading && (
                      <a
                        href={`/booking?date=${day.date}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-pink-500 text-white text-[11px] font-bold rounded-xl hover:bg-pink-600 transition-colors shadow-sm"
                      >
                        จอง <ArrowRight size={10} />
                      </a>
                    )}
                  </div>

                  {/* Slots */}
                  {!isPast && !day.closed && (
                    <div className="px-4 py-3">
                      {day.loading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="animate-spin text-pink-300" size={18} />
                        </div>
                      ) : day.slots.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-3">
                          ไม่มีช่วงเวลาว่าง
                        </p>
                      ) : (
                        <div className="grid grid-cols-6 gap-1.5">
                          {day.slots.map((slot) => (
                            <div
                              key={slot.time}
                              className={`py-1.5 rounded-lg text-[11px] font-medium text-center ${
                                slot.available
                                  ? 'bg-green-50 text-green-600 border border-green-200'
                                  : 'bg-gray-50 text-gray-300 border border-gray-100 line-through'
                              }`}
                            >
                              {slot.time}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-50 border border-green-200" />
            ว่าง
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-50 border border-gray-100" />
            ไม่ว่าง
          </div>
        </div>

        {/* CTA */}
        <a
          href="/booking"
          className="block w-full bg-gradient-to-r from-rose-400 via-pink-500 to-fuchsia-500 text-white text-center py-4 rounded-2xl font-bold shadow-lg shadow-pink-200/60 active:scale-95 transition-all"
        >
          เลือกเวลาแล้วจองเลย →
        </a>
      </main>
    </div>
  );
}
