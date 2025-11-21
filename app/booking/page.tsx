'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { XCircle, CheckCircle, Facebook } from 'lucide-react'; // เปลี่ยนไอคอนเป็น Facebook
import { format, addDays, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale';

// ตั้งค่าร้าน
const SHOP_OPEN = 10; 
const SHOP_CLOSE = 20;

// --- ตั้งค่า Facebook ตรงนี้ ---
// ให้เอา Page ID หรือ ชื่อเพจมาใส่ (เช่น 'nailsalon' หรือตัวเลขยาวๆ)
// วิธีเช็คลิงก์: ลองเข้า m.me/ชื่อเพจ ต้องเด้งเข้าแชท
const FACEBOOK_PAGE_ID = 'ชื่อเพจของคุณ'; 

export default function BookingPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const dates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));
  const timeSlots = Array.from({ length: SHOP_CLOSE - SHOP_OPEN + 1 }, (_, i) => {
    const hour = SHOP_OPEN + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // ดึงข้อมูล
  const fetchBookings = async (date: Date) => {
    setLoading(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    const { data } = await supabase
      .from('bookings')
      .select('start_time, status')
      .eq('booking_date', dateStr)
      .neq('status', 'cancelled');

    if (data) setBookings(data);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(selectedDate); }, [selectedDate]);

  const isSlotBusy = (time: string) => {
    return bookings.some(b => b.start_time.startsWith(time.split(':')[0]));
  };

  return (
    <div className="min-h-screen bg-white font-sans pb-24">
      
      {/* Header */}
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold shadow-sm">
           N
        </div>
        <div>
            <h1 className="font-bold text-gray-800 leading-tight">เช็คคิวว่าง</h1>
            <p className="text-xs text-gray-400">Nail Salon Studio</p>
        </div>
      </header>

      {/* Date Picker */}
      <div className="bg-white py-4 pl-4 border-b border-gray-50">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide pr-4">
          {dates.map((date, i) => {
            const isSelected = isSameDay(date, selectedDate);
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center justify-center min-w-[4rem] h-16 rounded-2xl border transition-all duration-200 ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-200 transform scale-105' 
                    : 'border-gray-100 bg-white text-gray-400'
                }`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wider mb-1 opacity-80">
                    {format(date, 'EEE', { locale: th })}
                </span>
                <span className="text-lg font-bold leading-none">
                  {format(date, 'd')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slots Grid */}
      <div className="p-4">
        <div className="flex justify-between items-end mb-6">
          <h2 className="font-bold text-gray-800 text-lg">
            {format(selectedDate, 'd MMMM yyyy', { locale: th })}
          </h2>
          {loading ? (
              <span className="text-xs text-blue-500 animate-pulse">กำลังเช็ค...</span>
          ) : (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                  อัปเดตล่าสุดเมื่อกี้
              </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {timeSlots.map((time) => {
            const busy = isSlotBusy(time);
            return (
              <div
                key={time}
                className={`relative p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  busy 
                    ? 'bg-gray-50 border-transparent opacity-60' 
                    : 'bg-white border-emerald-200 shadow-sm'
                }`}
              >
                <span className={`font-bold text-lg ${busy ? 'text-gray-400' : 'text-gray-800'}`}>{time}</span>
                
                {/* Status Badge */}
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    busy 
                    ? 'bg-gray-200 text-gray-500' 
                    : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {busy ? (
                      <>ไม่ว่าง <XCircle size={10}/></>
                  ) : (
                      <>ว่าง <CheckCircle size={10}/></>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- Fixed Bottom Button (Facebook Messenger) --- */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
         <div className="max-w-md mx-auto">
            <a 
                href={`https://m.me/${FACEBOOK_PAGE_ID}`} // ลิงก์เข้า Messenger
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full bg-[#0084FF] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-[#0073e6] transition active:scale-95"
            >
                <Facebook size={24} fill="white" /> {/* ไอคอน Facebook */}
                ทักแชท จองคิวเลย
            </a>
            <p className="text-center text-xs text-gray-400 mt-2">
                เช็คเวลาว่างด้านบน แล้วทักแชทเพจได้เลยค่ะ
            </p>
         </div>
      </div>

    </div>
  );
}