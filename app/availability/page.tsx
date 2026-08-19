'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, CalendarDays, Loader2, Home, Clock,
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
interface DayInfo {
  date: string;
  slots: Slot[];
  closed: boolean;
  loading: boolean;
  totalSlots: number;
  availableSlots: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สингหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
const THAI_DAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d);
}

export default function AvailabilityPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [dayMap, setDayMap] = useState<Map<string, DayInfo>>(new Map());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [loadingServices, setLoadingServices] = useState(true);

  // Load services
  useEffect(() => {
    fetch('/api/public/booking')
      .then((r) => r.json())
      .then((d) => {
        const svc = d.services || [];
        setServices(svc);
        setSelectedServiceIds(svc.map((s: Service) => String(s.id)));
      })
      .catch(() => {})
      .finally(() => setLoadingServices(false));
  }, []);

  // Calendar math
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date(todayStr() + 'T00:00:00');

  // Generate all dates in this month
  const dates = useMemo(() => {
    const result: (string | null)[] = [];
    for (let i = 0; i < firstDay; i++) result.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(calYear, calMonth, i);
      result.push(fmtDate(d));
    }
    return result;
  }, [calYear, calMonth, firstDay, daysInMonth]);

  // Load slots for visible month
  useEffect(() => {
    if (selectedServiceIds.length === 0) return;

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(calYear, calMonth, i);
      const dateStr = fmtDate(d);
      if (d < today) continue;

      const q = new URLSearchParams({
        date: dateStr,
        services: selectedServiceIds.join(','),
      });

      fetch(`/api/public/booking?${q}`)
        .then((r) => r.json())
        .then((data) => {
          const slots = data.slots || [];
          const total = slots.length;
          const available = slots.filter((s: Slot) => s.available).length;
          setDayMap((prev) => {
            const next = new Map(prev);
            next.set(dateStr, {
              date: dateStr,
              slots,
              closed: data.closed || false,
              loading: false,
              totalSlots: total,
              availableSlots: available,
            });
            return next;
          });
        })
        .catch(() => {
          setDayMap((prev) => {
            const next = new Map(prev);
            next.set(dateStr, {
              date: dateStr,
              slots: [],
              closed: false,
              loading: false,
              totalSlots: 0,
              availableSlots: 0,
            });
            return next;
          });
        });
    }
  }, [calYear, calMonth, daysInMonth, selectedServiceIds]);

  // Get status for a date
  function getStatus(dateStr: string): 'none' | 'available' | 'few' | 'full' | 'closed' | 'past' {
    const d = new Date(dateStr + 'T00:00:00');
    if (d < today) return 'past';
    const info = dayMap.get(dateStr);
    if (!info || info.loading) return 'none';
    if (info.closed) return 'closed';
    if (info.availableSlots === 0) return 'full';
    if (info.availableSlots <= 2) return 'few';
    return 'available';
  }

  const statusColor: Record<string, string> = {
    available: 'bg-green-400',
    few: 'bg-amber-400',
    full: 'bg-rose-400',
    closed: 'bg-gray-300',
    past: 'bg-gray-200',
    none: '',
  };

  // Selected date info
  const selectedInfo = dayMap.get(selectedDate);
  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const isPast = selectedDateObj < today;

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
            <p className="text-[10px] text-gray-400">ดูวันที่ว่างก่อนจองคิว</p>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 py-5 space-y-4">

        {/* Service Filter */}
        {services.length > 0 && (
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
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selected
                      ? 'bg-pink-500 text-white border-pink-500'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Calendar Card */}
        <div className="bg-white rounded-3xl border border-pink-100 p-5 shadow-sm">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
                else setCalMonth((m) => m - 1);
              }}
              className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center hover:bg-pink-100 transition"
            >
              <ChevronLeft size={16} className="text-pink-500" />
            </button>
            <div className="text-center">
              <p className="font-bold text-gray-900">
                {THAI_MONTHS[calMonth]} {calYear + 543}
              </p>
            </div>
            <button
              onClick={() => {
                if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
                else setCalMonth((m) => m + 1);
              }}
              className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center hover:bg-pink-100 transition"
            >
              <ChevronRight size={16} className="text-pink-500" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {THAI_DAYS_SHORT.map((d, i) => (
              <div
                key={d}
                className={`text-center text-xs font-semibold py-1 ${i === 0 ? 'text-rose-400' : 'text-gray-400'}`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {dates.map((dateStr, i) => {
              if (!dateStr) return <div key={`e${i}`} />;

              const d = new Date(dateStr + 'T00:00:00');
              const isToday = dateStr === todayStr();
              const isSelected = dateStr === selectedDate;
              const status = getStatus(dateStr);
              const dotColor = statusColor[status];

              return (
                <div key={dateStr} className="flex flex-col items-center">
                  <button
                    onClick={() => setSelectedDate(dateStr)}
                    className={`relative w-9 h-9 rounded-xl text-xs font-medium flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-md'
                        : isToday
                        ? 'bg-pink-50 text-pink-600 font-bold'
                        : status === 'past'
                        ? 'text-gray-300'
                        : 'text-gray-700 hover:bg-pink-50'
                    }`}
                  >
                    {d.getDate()}
                  </button>
                  {/* Status dot */}
                  <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dotColor || 'invisible'}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        {selectedDate && !isPast && (
          <div className="bg-white rounded-3xl border border-pink-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">
              วัน{THAI_DAYS_SHORT[selectedDateObj.getDay()]}ที่ {selectedDateObj.getDate()} {THAI_MONTHS[selectedDateObj.getMonth()]}
            </h3>

            {selectedInfo?.loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-pink-400" size={22} />
              </div>
            ) : selectedInfo?.closed ? (
              <div className="bg-gray-50 rounded-2xl p-4 text-center">
                <p className="text-sm text-gray-500 font-medium">🔴 ร้านหยุดทำการวันนี้</p>
              </div>
            ) : selectedInfo ? (
              <div className="space-y-3">
                {/* Summary */}
                <div className={`rounded-2xl p-4 ${
                  selectedInfo.availableSlots > 2
                    ? 'bg-green-50 border border-green-100'
                    : selectedInfo.availableSlots > 0
                    ? 'bg-amber-50 border border-amber-100'
                    : 'bg-rose-50 border border-rose-100'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg ${
                      selectedInfo.availableSlots > 2 ? '🟢' :
                      selectedInfo.availableSlots > 0 ? '🟡' : '🔴'
                    }`}>
                      {selectedInfo.availableSlots > 2 ? '🟢' :
                       selectedInfo.availableSlots > 0 ? '🟡' : '🔴'}
                    </span>
                    <p className={`text-sm font-bold ${
                      selectedInfo.availableSlots > 2 ? 'text-green-700' :
                      selectedInfo.availableSlots > 0 ? 'text-amber-700' : 'text-rose-700'
                    }`}>
                      {selectedInfo.availableSlots > 0
                        ? `ยังว่างอยู่ ${selectedInfo.availableSlots} คิว (${selectedInfo.availableSlots}/${selectedInfo.totalSlots} ของทั้งหมด)`
                        : 'เต็มทุกคิว'}
                    </p>
                  </div>
                </div>

                {/* Time Slots Grid */}
                {selectedInfo.slots.length > 0 && (
                  <div className="grid grid-cols-5 gap-1.5">
                    {selectedInfo.slots.map((slot) => (
                      <div
                        key={slot.time}
                        className={`py-2 rounded-xl text-xs font-medium text-center ${
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

                {/* CTA */}
                <a
                  href={`/booking?date=${selectedDate}`}
                  className="block w-full text-center py-3 bg-gradient-to-r from-rose-400 to-pink-500 text-white font-bold rounded-2xl shadow-md shadow-pink-200/50 active:scale-95 transition-all text-sm"
                >
                  จองคิววันนี้ →
                </a>
              </div>
            ) : (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-pink-300" size={22} />
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-gray-400 py-2">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> ว่าง</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> เหลือน้อย</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /> เต็ม</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" /> ปิด</span>
        </div>
      </main>
    </div>
  );
}
