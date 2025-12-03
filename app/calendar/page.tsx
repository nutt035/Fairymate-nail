'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import Sidebar from '@/components/Sidebar';
import { Menu, Calendar as CalIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import BookingDetailModal from '@/components/BookingDetailModal';

export default function CalendarPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // ดึงข้อมูลทั้งหมดมา
  const fetchBookings = async () => {
    const { data } = await supabase.from('bookings').select('*');
    if (data) setBookings(data);
  };

  useEffect(() => { fetchBookings(); }, []);

  // ฟังก์ชันเลื่อนเดือน
  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  // คำนวณวันในปฏิทิน
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handleUpdateBooking = async (id: number, updates: any) => {
    await supabase.from('bookings').update(updates).eq('id', id);
    fetchBookings(); // โหลดข้อมูลใหม่
    setSelectedBooking(null); // ปิด Modal
  };

  const handleDeleteBooking = async (id: number) => {
    if(confirm('ลบถาวร?')) {
        await supabase.from('bookings').delete().eq('id', id);
        fetchBookings();
        setSelectedBooking(null);
    }
  };


  const daysArray = [];
  // เติมช่องว่างข้างหน้า (ถ้าวันที่ 1 ไม่ใช่วันอาทิตย์)
  for (let i = 0; i < firstDayOfMonth; i++) daysArray.push(null);
  // เติมวันที่จริง
  for (let i = 1; i <= daysInMonth; i++) daysArray.push(new Date(year, month, i));

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] font-sans text-slate-600">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 flex flex-col">
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu /></button>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <CalIcon className="text-indigo-600" /> ตารางงานรายเดือน
            </h1>
          </div>
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border shadow-sm">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft /></button>
            <span className="font-bold text-lg w-32 text-center">
              {currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded"><ChevronRight /></button>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            
            {/* หัวตาราง (วัน) */}
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center py-3 text-sm font-bold text-slate-500">
              {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => <div key={d}>{d}</div>)}
            </div>

            {/* ช่องวันที่ */}
            <div className="grid grid-cols-7 auto-rows-[120px] divide-x divide-y divide-slate-100">
              {daysArray.map((date, i) => {
                if (!date) return <div key={i} className="bg-slate-50/50"></div>;
                
                const dateStr = date.toLocaleDateString('en-CA');
                // หาคิวของวันนี้
                const dayBookings = bookings.filter(b => b.booking_date === dateStr);
                const isToday = new Date().toDateString() === date.toDateString();

                return (
                  <div key={i} className={`p-2 hover:bg-slate-50 transition ${isToday ? 'bg-indigo-50/30' : ''}`}>
                    <div className={`text-sm font-bold mb-2 ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {date.getDate()}
                    </div>
                    
                    <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide">
                      {dayBookings.map(b => (
                        <div key={b.id} onClick={() => setSelectedBooking(b)} className={`text-[10px] px-1.5 py-1 rounded truncate font-medium
                          ${b.status === 'done' ? 'bg-green-100 text-green-700' : 
                            b.status === 'cancelled' ? 'bg-red-100 text-red-700 line-through opacity-50' : 
                            'bg-indigo-100 text-indigo-700'}`}>
                          {b.start_time.slice(0,5)} {b.customer_name}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ✅ เพิ่ม Modal ไว้ตรงนี้ */}
        <BookingDetailModal 
          isOpen={!!selectedBooking} 
          onClose={() => setSelectedBooking(null)} 
          booking={selectedBooking} 
          onUpdate={handleUpdateBooking} 
          onDelete={handleDeleteBooking} 
        />

      </main>
    </div>
  );
}