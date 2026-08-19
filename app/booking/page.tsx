'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';  import {
  Sparkles, ChevronLeft, ChevronRight, Check, Clock,
  CalendarDays, User, Phone, FileText, Loader2, ArrowRight,
  MessageCircle, CheckCircle2, Facebook, Tag, ShoppingBag, Home,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}
interface Promotion {
  id: string;
  name: string;
  discount_type: 'percent' | 'amount';
  value: number;
}
interface Slot {
  time: string;
  available: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STEPS = ['เลือกบริการ', 'วัน & เวลา', 'ข้อมูลติดต่อ', 'ยืนยัน'];
const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

// ── Main Component ────────────────────────────────────────────────────────────
// useSearchParams ต้องอยู่ใน Suspense boundary (Next.js 16)
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDF2F8] flex items-center justify-center">
          <div className="animate-pulse text-primary font-bold">กำลังโหลด...</div>
        </div>
      }
    >
      <BookingPage />
    </Suspense>
  );
}

function BookingPage() {
  const searchParams = useSearchParams();
  // บัญชีที่เชื่อมจากแชท LINE / Messenger (ฝังในลิงก์จองที่บอทส่ง)
  const linkedLineUserId = searchParams.get('line_uid') || '';
  const linkedMessengerPsid = searchParams.get('psid') || '';

  const [step, setStep] = useState(searchParams.get('date') ? 1 : 0);

  // Data
  const [services, setServices] = useState<Service[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Form
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [promotionId, setPromotionId] = useState('');
  const [date, setDate] = useState(searchParams.get('date') || '');
  const [startTime, setStartTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');

  // State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Calendar
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  // ── คำนวณบริการที่เลือก + ยอดรวม ───────────────────────────────────────────
  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(String(s.id))),
    [services, selectedServiceIds],
  );

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (Number(s.duration_minutes) || 0), 0),
    [selectedServices],
  );

  const subtotal = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0),
    [selectedServices],
  );

  const selectedPromotion = useMemo(
    () => promotions.find((p) => String(p.id) === promotionId) || null,
    [promotions, promotionId],
  );

  const discount = useMemo(() => {
    if (!selectedPromotion) return 0;
    if (selectedPromotion.discount_type === 'percent') {
      return Math.round((subtotal * Number(selectedPromotion.value)) / 100);
    }
    return Math.min(Number(selectedPromotion.value) || 0, subtotal);
  }, [selectedPromotion, subtotal]);

  const totalPrice = subtotal - discount;

  // ── Load services + promotions ──────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/public/booking')
      .then((r) => r.json())
      .then((d) => {
        setServices(d.services || []);
        setPromotions(d.promotions || []);
      })
      .catch(() => setError('โหลดบริการไม่สำเร็จ'))
      .finally(() => setLoadingServices(false));
  }, []);

  // ── Load slots เมื่อวันที่หรือบริการที่เลือกเปลี่ยน ──────────────────────────
  useEffect(() => {
    if (!date || selectedServiceIds.length === 0) return;
    setLoadingSlots(true);
    setStartTime('');
    setError('');
    const q = new URLSearchParams({ date, services: selectedServiceIds.join(',') });
    fetch(`/api/public/booking?${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        setSlots(d.slots || []);
      })
      .catch(() => setError('โหลดเวลาว่างไม่สำเร็จ'))
      .finally(() => setLoadingSlots(false));
  }, [date, selectedServiceIds]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/public/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          date,
          startTime,
          services: selectedServices.map((s) => ({ id: String(s.id) })),
          promotionId: promotionId || undefined,
          note,
          lineUserId: linkedLineUserId || undefined,
          messengerPsid: linkedMessengerPsid || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'จองคิวไม่สำเร็จ');
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'จองคิวไม่สำเร็จ');
      setSubmitting(false);
    }
  }

  // ── Calendar helpers ────────────────────────────────────────────────────────
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayDate = new Date(todayStr() + 'T00:00:00');

  const canNext =
    step === 0 ? selectedServiceIds.length > 0 :
    step === 1 ? !!(date && startTime) :
    step === 2 ? !!(customerName && customerPhone) :
    true;

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (success) {
    const dateDisplay = date
      ? new Date(date + 'T12:00:00+07:00').toLocaleDateString('th-TH', {
          weekday: 'long', day: 'numeric', month: 'long',
        })
      : date;
    return (
      <div className="min-h-screen bg-[#FDF2F8] flex items-center justify-center px-5">
        <div className="max-w-sm w-full bg-white rounded-3xl border border-primary-light shadow-xl shadow-primary/10 p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-200">
            <CheckCircle2 size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">จองคิวสำเร็จ! 🎉</h2>
          <p className="text-sm text-slate-500 mb-6">ระบบได้รับข้อมูลการจองของคุณแล้ว แอดมินจะติดต่อกลับเพื่อยืนยันอีกครั้งค่ะ</p>
          {(linkedLineUserId || linkedMessengerPsid) && (
            <p className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 mb-4">
              ✅ เราได้ส่งใบยืนยันการจองไปยัง {linkedLineUserId ? 'LINE' : 'Messenger'} ของคุณแล้ว
            </p>
          )}
          <div className="bg-primary-light rounded-2xl p-4 text-left space-y-2 mb-6 text-sm">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">รายการบริการ ({selectedServices.length})</div>
            {selectedServices.map((s) => (
              <div key={s.id} className="flex justify-between">
                <span className="text-slate-600">{s.name}</span>
                <span className="font-bold text-slate-700">฿{Number(s.price).toLocaleString('th-TH')}</span>
              </div>
            ))}
            <div className="h-px bg-primary/20 my-1" />
            <div className="flex justify-between">
              <span className="text-slate-500">รวม</span>
              <span className="font-black text-primary">฿{totalPrice.toLocaleString('th-TH')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">วันที่</span>
              <span className="font-bold text-slate-700">{dateDisplay}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">เวลา</span>
              <span className="font-bold text-slate-700">{startTime} น.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ชื่อ</span>
              <span className="font-bold text-slate-700">{customerName}</span>
            </div>
          </div>
          <a
            href={process.env.NEXT_PUBLIC_LINE_OA_URL || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#06C755] text-white font-bold rounded-2xl shadow-lg shadow-green-200 hover:bg-green-600 transition mb-3"
          >
            <MessageCircle size={18} />
            ติดต่อแอดมินทาง LINE
          </a>
          <a
            href={process.env.NEXT_PUBLIC_MESSENGER_URL || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#0084FF] text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-600 transition mb-3"
          >
            <Facebook size={18} />
            ติดต่อแอดมินทาง Messenger
          </a>
          <button
            onClick={() => {
              setSuccess(false);
              setStep(0);
              setDate('');
              setStartTime('');
              setCustomerName('');
              setCustomerPhone('');
              setNote('');
              setSelectedServiceIds([]);
              setPromotionId('');
            }}
            className="text-sm text-slate-400 hover:text-slate-600 transition"
          >
            จองคิวใหม่
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loadingServices) {
    return (
      <div className="min-h-screen bg-[#FDF2F8] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  // ── Main UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FDF2F8]">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-primary-light sticky top-0 z-50">
        <div className="max-w-xl mx-auto px-5 py-4 flex items-center gap-3">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="w-8 h-8 rounded-xl bg-primary-light flex items-center justify-center text-primary hover:bg-primary-light transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
          ) : (
            <a
              href="/"
              className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 hover:bg-pink-100 transition-colors"
            >
              <Home size={16} />
            </a>
          )}
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">Fairymate.Nail</p>
            <p className="text-[10px] text-slate-400">จองคิวออนไลน์</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-sm">
            <Sparkles size={15} className="text-white" />
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 py-6 pb-36">
        {/* Progress Bar */}
        <div className="flex items-center gap-1 mb-4">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  i <= step
                    ? 'bg-gradient-to-br from-primary to-primary-hover text-white shadow-sm'
                    : 'bg-primary-light text-slate-400'
                }`}
              >
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 rounded ${i < step ? 'bg-primary' : 'bg-primary-light'}`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 text-center mb-6">{STEPS[step]}</p>

        {/* ────────── Step 0: เลือกบริการ (หลายรายการ) + โปรโมชั่น ────────── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                เลือกบริการที่ต้องการ (เลือกได้หลายรายการ)
              </h3>
              <div className="space-y-3">
                {services.map((s) => {
                  const isSelected = selectedServiceIds.includes(String(s.id));
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleService(String(s.id))}
                      className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-primary bg-primary-light shadow-sm'
                          : 'border-primary-light bg-white hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? 'bg-primary border-primary text-white' : 'border-primary/20 bg-white'
                          }`}
                        >
                          {isSelected && <Check size={14} strokeWidth={3} />}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-800">{s.name}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">ใช้เวลาประมาณ {s.duration_minutes} นาที</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-primary shrink-0">
                        ฿{Number(s.price).toLocaleString('th-TH')}
                      </span>
                    </button>
                  );
                })}
                {services.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">ยังไม่มีบริการในระบบ</p>
                )}
              </div>
            </div>

            {/* สรุปบริการที่เลือก */}
            {selectedServices.length > 0 && (
              <div className="bg-white rounded-2xl border border-primary-light p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-2">
                    <ShoppingBag size={14} className="text-primary" />
                    เลือกแล้ว {selectedServices.length} รายการ
                  </span>
                  <span className="font-semibold text-slate-600">รวมเวลา {totalDuration} นาที</span>
                </div>
                <div className="h-px bg-primary-light my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">ยอดรวม</span>
                  <span className="text-base font-black text-primary">
                    ฿{subtotal.toLocaleString('th-TH')}
                  </span>
                </div>
              </div>
            )}

            {/* โปรโมชั่น (แบบ nail-studio — เลือกได้ ไม่บังคับ) */}
            {promotions.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  โปรโมชั่น <span className="normal-case font-normal">(เลือกได้ ไม่บังคับ)</span>
                </h3>
                <div className="space-y-2">
                  {promotions.map((p) => {
                    const isSelected = String(p.id) === promotionId;
                    const promoText =
                      p.discount_type === 'percent' ? `ลด ${p.value}%` : `ลด ฿${Number(p.value).toLocaleString('th-TH')}`;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setPromotionId(isSelected ? '' : String(p.id))}
                        className={`w-full p-3.5 rounded-2xl border-2 transition-all text-left flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-amber-400 bg-amber-50 shadow-sm'
                            : 'border-amber-100 bg-white hover:border-amber-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-amber-400 text-white' : 'bg-amber-50 text-amber-500'
                            }`}
                          >
                            <Tag size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-800">{p.name}</p>
                            <p className="text-[11px] text-amber-600 font-medium">{promoText}</p>
                          </div>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-amber-400 border-amber-400 text-white' : 'border-amber-200 bg-white'
                          }`}
                        >
                          {isSelected && <Check size={14} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ────────── Step 1: เลือกวันที่ & เวลา ────────── */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Calendar */}
            <div className="bg-white rounded-2xl border border-primary-light p-5">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
                    else setCalMonth((m) => m - 1);
                  }}
                  className="p-1 hover:bg-primary-light rounded-lg transition"
                >
                  <ChevronLeft size={18} />
                </button>
                <h3 className="font-bold text-slate-700 text-sm">
                  {THAI_MONTHS[calMonth]} {calYear + 543}
                </h3>
                <button
                  onClick={() => {
                    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
                    else setCalMonth((m) => m + 1);
                  }}
                  className="p-1 hover:bg-primary-light rounded-lg transition"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 mb-1">
                {THAI_DAYS.map((d, i) => (
                  <div
                    key={d}
                    className={`text-center text-xs font-semibold py-1 ${i === 0 ? 'text-primary' : 'text-slate-400'}`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-1">
                {[...Array(firstDay)].map((_, i) => <div key={`e${i}`} />)}
                {[...Array(daysInMonth)].map((_, i) => {
                  const day = i + 1;
                  const thisDate = new Date(calYear, calMonth, day);
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isPast = thisDate < todayDate;
                  const isSel = date === dateStr;
                  const isSunday = thisDate.getDay() === 0;
                  const isDisabled = isPast;

                  return (
                    <button
                      key={day}
                      disabled={isDisabled}
                      onClick={() => setDate(dateStr)}
                      className={`py-2 rounded-xl text-sm font-medium transition-all ${
                        isSel
                          ? 'bg-gradient-to-br from-primary to-primary-hover text-white shadow-md'
                          : isPast
                          ? 'text-slate-200 cursor-not-allowed'
                          : isSunday
                          ? 'text-primary hover:bg-primary-light'
                          : 'text-slate-600 hover:bg-primary-light'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots */}
            {date && (
              <div className="bg-white rounded-2xl border border-primary-light p-5">
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-primary" />
                  เลือกเวลา
                </h4>
                {loadingSlots ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="animate-spin text-primary" size={24} />
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        disabled={!slot.available}
                        onClick={() => setStartTime(slot.time)}
                        className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          startTime === slot.time
                            ? 'bg-primary text-white border-transparent shadow-sm'
                            : slot.available
                            ? 'bg-white text-slate-600 border-primary-light hover:border-primary/40'
                            : 'cursor-not-allowed bg-slate-50 text-slate-300 border-slate-100 line-through'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                    {slots.length === 0 && !loadingSlots && (
                      <p className="col-span-4 text-center text-xs text-primary py-4">
                        ไม่มีช่วงเวลาว่างสำหรับวันนี้
                      </p>
                    )}
                  </div>
                )}
                {selectedServices.length > 0 && (
                  <p className="mt-3 text-[11px] text-slate-400 text-center">
                    รวม {selectedServices.length} รายการ ใช้เวลาประมาณ {totalDuration} นาที
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ────────── Step 2: ข้อมูลติดต่อ ────────── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-primary-light p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                ชื่อ-นามสกุล *
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="เช่น คุณนุ่น"
                  maxLength={100}
                  required
                  className="w-full px-4 py-3 pl-9 rounded-xl border border-primary/20 bg-primary-light/30 text-sm focus:ring-2 focus:ring-primary/40 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                เบอร์โทรศัพท์ *
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0812345678"
                  inputMode="tel"
                  maxLength={20}
                  required
                  className="w-full px-4 py-3 pl-9 rounded-xl border border-primary/20 bg-primary-light/30 text-sm focus:ring-2 focus:ring-primary/40 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                รายละเอียดเพิ่มเติม (ถ้ามี)
              </label>
              <div className="relative">
                <FileText size={15} className="absolute left-3 top-3 text-slate-400" />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น แนบรูปลายเล็บที่ต้องการ หรือข้อมูลอื่นๆ"
                  maxLength={300}
                  rows={3}
                  className="w-full px-4 py-3 pl-9 rounded-xl border border-primary/20 bg-primary-light/30 text-sm focus:ring-2 focus:ring-primary/40 focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ────────── Step 3: ยืนยัน ────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-primary-light p-5 space-y-3">
              <h4 className="font-semibold text-slate-800 text-sm mb-1">สรุปการจองคิว</h4>

              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">บริการที่เลือก ({selectedServices.length})</div>
              {selectedServices.map((s) => (
                <SummaryRow
                  key={s.id}
                  label={s.name}
                  value={`฿${Number(s.price).toLocaleString('th-TH')}`}
                  sub={`${s.duration_minutes} นาที`}
                />
              ))}
              <div className="h-px bg-primary-light" />
              <SummaryRow label="ยอดรวม" value={`฿${subtotal.toLocaleString('th-TH')}`} />
              {selectedPromotion && (
                <SummaryRow
                  label={`โปรโมชั่น: ${selectedPromotion.name}`}
                  value={`-฿${discount.toLocaleString('th-TH')}`}
                  highlight={false}
                  green
                />
              )}
              <SummaryRow
                label="ราคาสุทธิ"
                value={`฿${totalPrice.toLocaleString('th-TH')}`}
                highlight
              />
              <div className="h-px bg-primary-light" />
              <SummaryRow
                label="วันที่"
                value={
                  date
                    ? new Date(date + 'T12:00:00+07:00').toLocaleDateString('th-TH', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      })
                    : '-'
                }
              />
              <SummaryRow label="เวลา" value={`${startTime} น.`} />
              <SummaryRow label="รวมเวลาที่ใช้" value={`${totalDuration} นาที`} />
              <div className="h-px bg-primary-light" />
              <SummaryRow label="ชื่อ" value={customerName} />
              <SummaryRow label="เบอร์โทร" value={customerPhone} />
              {note && <SummaryRow label="หมายเหตุ" value={note} />}
            </div>

            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
              <p className="text-xs text-center text-amber-700 font-medium">
                เมื่อจองแล้ว แอดมินจะยืนยันการจองผ่าน LINE ค่ะ 💬
              </p>
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600 text-center border border-red-100">
                {error}
              </p>
            )}
          </div>
        )}
      </main>

      {/* ── Bottom Action Bar ────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-primary-light p-4 z-20">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-5 py-3 rounded-xl border border-primary/20 text-slate-600 text-sm font-medium hover:bg-primary-light transition-all"
            >
              <ChevronLeft size={16} className="inline" /> ย้อนกลับ
            </button>
          ) : (
            <a
              href="/"
              className="px-5 py-3 rounded-xl border border-primary/20 text-slate-600 text-sm font-medium hover:bg-primary-light transition-all"
            >
              <ChevronLeft size={16} className="inline" /> หน้าหลัก
            </a>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <button
              onClick={() => { setError(''); setStep((s) => s + 1); }}
              disabled={!canNext}
              className="px-6 py-3 bg-gradient-to-r from-primary to-primary-hover text-white font-bold rounded-xl shadow-lg shadow-primary/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all hover:shadow-xl"
            >
              ถัดไป <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-3 bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-200/50 disabled:opacity-50 flex items-center gap-2 transition-all hover:shadow-xl"
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> กำลังจอง...</>
              ) : (
                <><Sparkles size={16} /> ยืนยันจองคิว</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryRow({
  label, value, highlight, green, sub,
}: {
  label: string; value: string; highlight?: boolean; green?: boolean; sub?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2 text-sm">
      <span className="text-slate-400 shrink-0 flex items-center gap-1.5">
        {label}
        {sub && <span className="text-[10px] text-slate-300">({sub})</span>}
      </span>
      <span
        className={`font-semibold text-right ${
          highlight ? 'text-primary font-black text-base' :
          green ? 'text-emerald-600' :
          'text-slate-700'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
