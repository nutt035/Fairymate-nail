'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { Menu, Search, Bell, CreditCard, Power, Users, Calendar, Receipt, Plus, LogOut, CheckCircle, Edit3, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

// Import Components
import Sidebar from '@/components/Sidebar';
import BookingModal from '@/components/BookingModal';
import BookingDetailModal from '@/components/BookingDetailModal';
import RevenueChart from '@/components/RevenueChart';
import { sendLineMessage, generateOpenShopFlex, generateCloseShopFlex } from '@/utils/lineService';

// PromptPay Modal
function PromptPayModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-xs w-full text-center relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        <h3 className="text-lg font-bold text-indigo-900 mb-1">สแกนจ่ายเงิน</h3>
        <div className="bg-white p-2 rounded-xl border border-slate-200 inline-block shadow-inner mt-2">
          <img src="/qrcode.jpg" alt="QR Code" className="w-48 h-48 object-contain" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showPromptPay, setShowPromptPay] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [target, setTarget] = useState(50000);
  const [stats, setStats] = useState({ todayQueue: 0, todayIncome: 0, monthIncome: 0, completed: 0, queueGrowth: 0, incomeGrowth: 0 });

  const fetchData = async () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const { data: allBookings } = await supabase
      .from('bookings')
      .select('*') // ไม่ต้อง join services แล้ว เพราะเราใช้ manual_service
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true });

    const { data: settings } = await supabase.from('shop_settings').select('monthly_target').single();
    if (settings) setTarget(settings.monthly_target);

    if (allBookings) {
      const todayData = allBookings.filter((b: any) => b.booking_date === today);
      const todayDone = todayData.filter((b: any) => b.status === 'done');
      const todayIncome = todayDone.reduce((sum: number, b: any) => sum + (b.final_price || 0), 0);

      const yesterdayData = allBookings.filter((b: any) => b.booking_date === yesterdayStr);
      const doneData = allBookings.filter((b: any) => b.status === 'done');
      
      setBookings(todayData);
      setStats({
        todayQueue: todayData.length,
        todayIncome: todayIncome,
        monthIncome: doneData.reduce((sum: number, b: any) => sum + (b.final_price || 0), 0),
        completed: todayDone.length,
        queueGrowth: 0, // คำนวณตามต้องการ
        incomeGrowth: 0
      });
    }
  };

  useEffect(() => { fetchData(); const savedStatus = localStorage.getItem('shopStatus'); if (savedStatus === 'open') setIsShopOpen(true); }, []);

  // --- Logic: บันทึกการจองแบบ Manual (Fast Mode) ---
  const handleSaveBooking = async (formData: any) => {
    // 1. คำนวณเวลา (ง่ายๆ ตรงไปตรงมา)
    const [h, m] = formData.start_time.split(':').map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + Number(formData.duration_minutes);

    // 2. เช็คคิวชน (Conflict Check)
    const { data: existing } = await supabase.from('bookings')
      .select('start_time, duration_adjusted') // duration_adjusted ในที่นี้เราจะใช้เก็บ duration จริงๆ
      .eq('booking_date', formData.booking_date).neq('status', 'cancelled');

    if (existing) {
      for (const b of existing) {
        const [bh, bm] = b.start_time.split(':').map(Number);
        const bStart = bh * 60 + bm;
        const bEnd = bStart + (b.duration_adjusted || 60); // ใช้ duration_adjusted เป็นตัวเก็บเวลาทำ
        if (startMin < bEnd && bStart < endMin) {
           if(!confirm(`⚠️ เวลาชนกับคิวอื่น! (ช่วง ${b.start_time})\nยังต้องการลงคิวซ้อนไหม?`)) return;
        }
      }
    }

    // 3. บันทึกลูกค้า
    const { data: cust } = await supabase.from('customers').select('id').or(`name.eq.${formData.customer_name},phone.eq.${formData.customer_phone}`).maybeSingle();
    if (!cust) await supabase.from('customers').insert([{ name: formData.customer_name, phone: formData.customer_phone, facebook: formData.facebook, visit_count: 1, total_spent: 0, last_visit: new Date().toISOString() }]);
    else await supabase.from('customers').update({ facebook: formData.facebook, last_visit: new Date().toISOString() }).eq('id', cust.id);

    // 4. บันทึก Booking (ใส่ Manual Service)
    const { error } = await supabase.from('bookings').insert([{
      customer_name: formData.customer_name, customer_phone: formData.customer_phone,
      booking_date: formData.booking_date, start_time: formData.start_time,
      manual_service: formData.manual_service, // ✅ ใส่ชื่อบริการที่พิมพ์เอง
      final_price: Number(formData.price),     // ✅ ใส่ราคาที่พิมพ์เอง
      duration_adjusted: Number(formData.duration_minutes), // ✅ ใส่เวลาทำ (นาที)
      status: 'pending'
    }]);

    if (!error) { alert('✅ ลงคิวเรียบร้อย'); setShowModal(false); fetchData(); } 
    else alert('Error: ' + error.message);
  };

  // --- Logic: จบงาน (ตัดระบบสต็อกออกแล้ว ตามคำขอ) ---
  const handleComplete = async (bid: number) => {
    if (!confirm('ยืนยันจบงาน? (รับเงินแล้ว)')) return;
    await supabase.from('bookings').update({ status: 'done' }).eq('id', bid);
    alert('✅ บันทึกยอดขายเรียบร้อย');
    fetchData();
  };

  // --- Logic: แก้ไข / ลบ ---
  const handleUpdateBooking = async (id: number, updates: any) => {
    await supabase.from('bookings').update(updates).eq('id', id);
    alert('✅ แก้ไขเรียบร้อย'); fetchData(); setSelectedBooking(null);
  };
  const handleDeleteBooking = async (id: number) => {
    if(confirm('ลบถาวร?')) { await supabase.from('bookings').delete().eq('id', id); fetchData(); setSelectedBooking(null); }
  };

  // --- Shop Open/Close ---
  const handleOpenShop = async () => { if(confirm('เปิดร้าน?')) { await sendLineMessage(generateOpenShopFlex(bookings, stats.todayIncome)); setIsShopOpen(true); localStorage.setItem('shopStatus', 'open'); }};
  const handleCloseShop = async () => { if(confirm('ปิดร้าน?')) { await sendLineMessage(generateCloseShopFlex(stats.todayIncome, stats.completed, 0)); setIsShopOpen(false); localStorage.setItem('shopStatus', 'closed'); }};
  const handleEditTarget = async () => { const t = prompt("เป้าหมายเดือนนี้:", target.toString()); if(t) { await supabase.from('shop_settings').update({monthly_target:Number(t)}).eq('id',1); setTarget(Number(t)); }};

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] font-sans text-slate-600">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 w-full flex flex-col">
        <header className="h-20 bg-white border-b border-slate-200 px-4 lg:px-8 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu /></button>
            
            {/* ✅ ปุ่มไปหน้าลูกค้าดูคิว (เพิ่มใหม่) */}
            <Link href="/booking" target="_blank" className="hidden md:flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg text-sm font-bold hover:bg-indigo-100 transition">
               <ExternalLink size={16}/> หน้าลูกค้าดูคิว
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowPromptPay(true)} className="flex items-center gap-2 px-3 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 text-sm font-bold shadow-md transition-all"><CreditCard size={16} /><span className="hidden xs:inline">QR Pay</span></button>
            <button onClick={handleOpenShop} disabled={isShopOpen} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold shadow-md transition-all ${isShopOpen ? 'bg-slate-100 text-slate-400' : 'bg-green-500 text-white'}`}><Power size={16} /><span className="hidden xs:inline">{isShopOpen?'เปิดอยู่':'เปิดร้าน'}</span></button>
            <button onClick={handleCloseShop} disabled={!isShopOpen} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold shadow-md transition-all ${!isShopOpen ? 'bg-slate-100 text-slate-400' : 'bg-red-500 text-white'}`}><LogOut size={16} /><span className="hidden xs:inline">ปิดร้าน</span></button>
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6">
          {/* Stats & Content (เหมือนเดิม) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
               <StatCard title="คิววันนี้" value={stats.todayQueue} unit="คน" icon={<Users size={24}/>} color="text-blue-600" bg="bg-blue-50" trend={0} />
               <StatCard title="ทำสำเร็จแล้ว" value={stats.completed} unit="คน" icon={<CheckCircle size={24}/>} color="text-emerald-600" bg="bg-emerald-50" trend={0} />
               <StatCard title="รายรับวันนี้" value={stats.todayIncome.toLocaleString()} unit="บาท" icon={<Receipt size={24}/>} color="text-orange-600" bg="bg-orange-50" trend={0} />
               <div className="col-span-1 sm:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-80"><RevenueChart bookings={bookings} /></div>
            </div>

            <div className="lg:col-span-4 space-y-6">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative group">
                  <button onClick={handleEditTarget} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-indigo-600 rounded-full"><Edit3 size={16}/></button>
                  <h3 className="font-bold text-slate-800 mb-4">เป้าหมาย</h3>
                  <div className="flex justify-center py-4"><div className="w-32 h-32 rounded-full border-8 border-slate-100 flex items-center justify-center border-t-indigo-500"><span className="font-bold text-xl text-slate-700">{target>0?Math.round((stats.monthIncome/target)*100):0}%</span></div></div>
                  <div className="flex justify-between text-sm mt-4"><span className="text-slate-500">เป้า: ฿{target.toLocaleString()}</span><span className="font-bold text-indigo-600">฿{stats.monthIncome.toLocaleString()}</span></div>
               </div>

               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-slate-800">คิวล่าสุด</h3>
                   <button onClick={() => setShowModal(true)} className="text-indigo-600 bg-indigo-50 p-1 rounded hover:bg-indigo-100 transition"><Plus size={20}/></button>
                 </div>
                 <div className="space-y-3">
                   {bookings.length === 0 ? <div className="text-center py-4 text-slate-400 text-sm">ไม่มีคิว</div> : 
                     bookings.slice(0, 4).map((b, i) => (
                       <div key={i} onClick={() => setSelectedBooking(b)} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer">
                         <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-500 font-bold shadow-sm">{b.customer_name.charAt(0)}</div>
                         <div className="flex-1">
                            <p className="text-sm font-bold text-slate-700">{b.customer_name}</p>
                            <p className="text-xs text-slate-400">{b.manual_service || b.services?.name || 'ไม่ระบุ'}</p>
                         </div>
                         <div className="text-right flex flex-col items-end gap-1">
                            <p className="text-xs font-bold text-slate-600">{b.start_time.slice(0,5)}</p>
                            {b.status === 'done' ? <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-600 rounded-full font-bold">เสร็จ</span> : 
                                <button onClick={(e) => { e.stopPropagation(); handleComplete(b.id); }} className="p-1 bg-slate-200 hover:bg-green-500 hover:text-white rounded-full"><CheckCircle size={16} /></button>
                            }
                         </div>
                       </div>
                     ))
                   }
                 </div>
               </div>
            </div>
          </div>
        </div>
      </main>

      <BookingModal isOpen={showModal} onClose={() => setShowModal(false)} onSave={handleSaveBooking} />
      <BookingDetailModal isOpen={!!selectedBooking} onClose={() => setSelectedBooking(null)} booking={selectedBooking} onUpdate={handleUpdateBooking} onDelete={handleDeleteBooking} />
      <PromptPayModal isOpen={showPromptPay} onClose={() => setShowPromptPay(false)} />
    </div>
  );
}

function StatCard({ title, value, unit, icon, color, bg }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-start mb-4"><div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center`}>{icon}</div></div>
      <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</h4>
      <div className="flex items-baseline gap-1"><h2 className="text-2xl font-bold text-slate-800">{value}</h2><span className="text-xs text-slate-400 font-medium">{unit}</span></div>
    </div>
  );
}
