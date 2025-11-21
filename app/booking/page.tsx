'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { XCircle, CheckCircle, Facebook, Calendar } from 'lucide-react';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

// ตั้งค่าร้าน (15:30 - 22:00)
const SHOP_OPEN_HOUR = 15; 
const SHOP_OPEN_MIN = 30;
const SHOP_CLOSE_HOUR = 22;

const FACEBOOK_PAGE_ID = 'https://www.facebook.com/profile.php?id=61574818834872'; 

export default function BookingPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // สร้างรายการวันที่ (14 วันล่วงหน้า)
  const dates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  // สร้างรายการเวลา (Time Slots) ทีละ 30 นาที
  // ตั้งแต่ 15:30 ถึง 22:00
  const timeSlots = [];
  let currentMin = SHOP_OPEN_HOUR * 60 + SHOP_OPEN_MIN;
  const endMin = SHOP_CLOSE_HOUR * 60;

  while (currentMin < endMin) {
    const h = Math.floor(currentMin / 60);
    const m = currentMin % 60;
    timeSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    currentMin += 30;
  }

  // ดึงข้อมูลการจอง
  const fetchBookings = async (date: Date) => {
    setLoading(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const { data } = await supabase
      .from('bookings')
      .select('start_time, duration_adjusted, services(duration)')
      .eq('booking_date', dateStr)
      .neq('status', 'cancelled');

    if (data) setBookings(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings(selectedDate);
  }, [selectedDate]);

  // ฟังก์ชันเช็คว่า "ไม่ว่าง" หรือไม่
  const isSlotBusy = (slotTime: string) => {
    const [slotH, slotM] = slotTime.split(':').map(Number);
    const slotTotalMins = slotH * 60 + slotM;

    // วนลูปดู booking ทุกอันในวันนั้น
    return bookings.some(b => {
      const [bH, bM] = b.start_time.split(':').map(Number);
      const bStartMins = bH * 60 + bM;
      
      // หาเวลาจบ (Start + Duration + Adjust)
      // ใช้ as any เพื่อแก้ปัญหา TypeScript
      const service = Array.isArray(b.services) ? b.services[0] : b.services;
      const duration = (service?.duration || 60) + (b.duration_adjusted || 0);
      const bEndMins = bStartMins + duration;

      // เช็คการทับซ้อน: ถ้า Slot อยู่ระหว่าง Start และ End ของคิว
      // (Slot >= Start) และ (Slot < End)
      return slotTotalMins >= bStartMins && slotTotalMins < bEndMins;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* Header */}
      <div className="bg-white p-6 shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="text-pink-500" /> เช็คคิวว่าง
        </h1>
        <p className="text-sm text-slate-500 mt-1">เลือกวันที่เพื่อดูเวลาว่าง</p>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {/* Date Picker (แนวนอน) */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide mb-6">
          {dates.map((date, i) => {
            const active = isSameDay(date, selectedDate);
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(date)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl border transition-all ${
                  active 
                    ? 'bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-200' 
                    : 'bg-white text-slate-400 border-slate-100'
                }`}
              >
                <span className="text-xs font-medium">{format(date, 'EEE', { locale: th })}</span>
                <span className="text-xl font-bold">{format(date, 'd')}</span>
              </button>
            );
          })}
        </div>

        {/* Time Slots Grid */}
        <div className="space-y-3">
          <h2 className="font-bold text-slate-700 mb-2">
            ตารางเวลา {format(selectedDate, 'd MMM', { locale: th })}
          </h2>
          
          {loading ? (
            <div className="text-center py-8 text-slate-400">กำลังโหลดข้อมูล...</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {timeSlots.map((time, i) => {
                const busy = isSlotBusy(time);
                return (
                  <div 
                    key={i}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      busy 
                        ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' 
                        : 'bg-white border-emerald-100 shadow-sm'
                    }`}
                  >
                    <span className={`text-lg font-bold ${busy ? 'text-slate-400' : 'text-slate-700'}`}>
                      {time}
                    </span>
                    
                    {/* Status Badge */}
                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        busy 
                        ? 'bg-gray-200 text-gray-500' 
                        : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {busy ? (
                          <>เต็ม <XCircle size={10}/></>
                      ) : (
                          <>ว่าง <CheckCircle size={10}/></>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- Fixed Bottom Button (Facebook Messenger) --- */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
         <div className="max-w-md mx-auto">
            <a 
                href={FACEBOOK_PAGE_ID}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full bg-[#0084FF] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-[#0073e6] transition active:scale-95"
            >
                <Facebook size={24} fill="white" />
                ทักแชทจองคิว
            </a>
            <p className="text-center text-xs text-slate-400 mt-2">
              กดปุ่มเพื่อทักแชทและยืนยันการจองกับแอดมิน
            </p>
         </div>
      </div>
    </div>
  );
}