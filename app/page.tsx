'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { Menu, Search, Bell, CreditCard, Power, Users, Calendar, Receipt, Plus, LogOut, CheckCircle, Edit3, X } from 'lucide-react';

// Import Components
import Sidebar from '@/components/Sidebar';
import BookingModal from '@/components/BookingModal';
import BookingDetailModal from '@/components/BookingDetailModal';
import RevenueChart from '@/components/RevenueChart';
import { sendLineMessage, generateOpenShopFlex, generateCloseShopFlex } from '@/utils/lineService';

// --- Component: PromptPay Modal ---
function PromptPayModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-xs w-full text-center relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        <h3 className="text-lg font-bold text-indigo-900 mb-1">สแกนจ่ายเงิน</h3>
        <p className="text-xs text-slate-500 mb-3">PromptPay QR Code</p>
        <div className="bg-white p-2 rounded-xl border border-slate-200 inline-block shadow-inner">
          {/* ⚠️ อย่าลืมเอารูป qrcode.jpg ไปใส่ในโฟลเดอร์ public นะครับ */}
          <img src="/qr.jpg" alt="QR Code" className="w-48 h-48 object-contain" />
        </div>
        <p className="mt-3 text-xs font-bold text-indigo-600">Fairymate Nail</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  // --- States ---
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showPromptPay, setShowPromptPay] = useState(false);

  // Shop Status
  const [isShopOpen, setIsShopOpen] = useState(false);

  // Stats & Target
  const [target, setTarget] = useState(50000);
  const [stats, setStats] = useState({
    todayQueue: 0,
    todayIncome: 0,
    monthIncome: 0,
    completed: 0,
    queueGrowth: 0,
    incomeGrowth: 0
  });

  // --- 1. Fetch Data & Calculate ---
  const fetchData = async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // ดึง Booking ทั้งหมด
    const { data: allBookings } = await supabase
      .from('bookings')
      .select('*, services(name, price)')
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true });

    // ดึง Target
    const { data: settings } = await supabase.from('shop_settings').select('monthly_target').single();
    if (settings) setTarget(settings.monthly_target);

    // ดึง Services
    const { data: allServices } = await supabase.from('services').select('*');
    if (allServices) setServices(allServices);

    if (allBookings) {
      // ข้อมูลวันนี้
      const todayData = allBookings.filter((b: any) => b.booking_date === todayStr);
      const todayDone = todayData.filter((b: any) => b.status === 'done');
      const todayIncome = todayDone.reduce((sum: number, b: any) => sum + ((b.services?.price || 0) - (b.discount || 0)), 0);

      // ข้อมูลเมื่อวาน (เพื่อหา % Growth)
      const yesterdayData = allBookings.filter((b: any) => b.booking_date === yesterdayStr);
      const yesterdayDone = yesterdayData.filter((b: any) => b.status === 'done');
      const yesterdayIncome = yesterdayDone.reduce((sum: number, b: any) => sum + ((b.services?.price || 0) - (b.discount || 0)), 0);

      // สูตรคำนวณ %
      const calcGrowth = (current: number, prev: number) => {
        if (prev === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - prev) / prev) * 100);
      };

      // ข้อมูลทั้งเดือน
      const doneData = allBookings.filter((b: any) => b.status === 'done');
      
      setBookings(todayData); // แสดงเฉพาะคิววันนี้ในตาราง
      setStats({
        todayQueue: todayData.length,
        todayIncome: todayIncome,
        monthIncome: doneData.reduce((sum: number, b: any) => sum + ((b.services?.price || 0) - (b.discount || 0)), 0),
        completed: todayDone.length,
        queueGrowth: calcGrowth(todayData.length, yesterdayData.length),
        incomeGrowth: calcGrowth(todayIncome, yesterdayIncome)
      });
    }
  };

  useEffect(() => { 
    fetchData(); 
    const savedStatus = localStorage.getItem('shopStatus');
    if (savedStatus === 'open') setIsShopOpen(true);
  }, []);

  // --- 2. Functions: Save / Update / Delete / Complete ---

  // --- Logic: บันทึกการจอง (แก้ไข Error ตัวแดงแล้ว) ---
  const handleSaveBooking = async (formData: any) => {
    if (!formData.service_id) return alert('กรุณาเลือกบริการ');

    // 1. เตรียมข้อมูลคิวใหม่
    const selectedService = services.find(s => s.id.toString() === formData.service_id);
    
    const [newH, newM] = formData.start_time.split(':');
    const newStartMin = parseInt(newH) * 60 + parseInt(newM);
    const newDuration = (selectedService?.duration || 60) + Number(formData.duration_adj);
    const newEndMin = newStartMin + newDuration;

    // 2. ดึงคิวเก่า
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('start_time, duration_adjusted, services(duration)')
      .eq('booking_date', formData.booking_date)
      .neq('status', 'cancelled');

    // 3. วนลูปเช็คการชน
    let isConflict = false;
    let conflictTime = '';

    if (existingBookings) {
      // 🔴 แก้ตรงนี้: เติม "as any[]" เพื่อปิดปาก TypeScript ไม่ให้บ่นเรื่อง Type
      for (const b of existingBookings as any[]) {
        const [bH, bM] = b.start_time.split(':');
        const bStartMin = parseInt(bH) * 60 + parseInt(bM);
        
        // ดึงเวลาทำ (รองรับทั้งแบบ Array และ Object)
        const serviceObj = Array.isArray(b.services) ? b.services[0] : b.services;
        const serviceDuration = serviceObj?.duration || 60; // ถ้าหาไม่เจอให้ดีฟอลต์ 60 นาที
        
        const bDuration = serviceDuration + (b.duration_adjusted || 0);
        const bEndMin = bStartMin + bDuration;

        // เช็คชน: (เริ่มA < จบB) AND (เริ่มB < จบA)
        if (newStartMin < bEndMin && bStartMin < newEndMin) {
          isConflict = true;
          const endH = Math.floor(bEndMin / 60);
          const endM = bEndMin % 60;
          conflictTime = `${b.start_time} - ${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
          break; 
        }
      }
    }

    if (isConflict) {
      return alert(`❌ จองไม่ได้! เวลาชนกับคิวอื่น\n(ติดคิวช่วง: ${conflictTime})`);
    }

    // ---------------------------------------------------------
    // ส่วนบันทึกข้อมูล (เหมือนเดิม)
    // ---------------------------------------------------------

    const { data: existingCust } = await supabase
      .from('customers')
      .select('id')
      .or(`name.eq.${formData.customer_name},phone.eq.${formData.customer_phone}`)
      .maybeSingle();

    if (!existingCust) {
      await supabase.from('customers').insert([{
        name: formData.customer_name,
        phone: formData.customer_phone,
        visit_count: 1,
        total_spent: 0,
        last_visit: new Date().toISOString()
      }]);
    } else {
      await supabase.from('customers').update({
        last_visit: new Date().toISOString()
      }).eq('id', existingCust.id);
    }

    const finalPrice = (selectedService?.price || 0) - Number(formData.discount);

    const { error } = await supabase.from('bookings').insert([{
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone,
      service_id: parseInt(formData.service_id),
      booking_date: formData.booking_date,
      start_time: formData.start_time,
      discount: Number(formData.discount),
      duration_adjusted: Number(formData.duration_adj),
      final_price: finalPrice,
      status: 'pending'
    } as any]);

    if (!error) {
      alert('✅ จองคิวเรียบร้อย');
      setShowModal(false);
      fetchData(); 
    } else {
      alert('Error: ' + error.message);
    }
  };

  // แก้ไขคิว (เลื่อนเวลา / ยกเลิก)
  const handleUpdateBooking = async (id: number, updates: any) => {
    const { error } = await supabase.from('bookings').update(updates).eq('id', id);
    if (!error) {
      alert('✅ อัปเดตข้อมูลเรียบร้อย');
      fetchData();
      setSelectedBooking(null);
    } else {
      alert('❌ แก้ไขไม่สำเร็จ: ' + error.message);
    }
  };

  // ลบคิวถาวร
  const handleDeleteBooking = async (id: number) => {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (!error) {
      alert('🗑️ ลบข้อมูลเรียบร้อย');
      fetchData();
      setSelectedBooking(null);
    } else {
      alert('❌ ลบไม่สำเร็จ: ' + error.message);
    }
  };

  // จบงาน + ตัดสต็อก
  const handleComplete = async (bookingId: number, serviceId: number) => {
    if (!confirm('ยืนยันงานเสร็จสิ้น? (ระบบจะตัดสต็อกและออกใบเสร็จ)')) return;
    
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: 'done' })
      .eq('id', bookingId);

    if (bookingError) return alert('Error: ' + bookingError.message);

    // ตัดสต็อกตามสูตร
    const { data: recipes } = await supabase
      .from('service_recipes')
      .select('inventory_id, quantity_used, inventory(quantity)')
      .eq('service_id', serviceId);

    if (recipes && recipes.length > 0) {
      for (const recipe of recipes as any[]) {
        const inventoryItem = Array.isArray(recipe.inventory) ? recipe.inventory[0] : recipe.inventory;
        const currentQty = inventoryItem?.quantity || 0;
        const newQty = currentQty - recipe.quantity_used;

        await supabase
          .from('inventory')
          .update({ quantity: newQty })
          .eq('id', recipe.inventory_id);
      }
      alert(`✅ จบงานและตัดสต็อก ${recipes.length} รายการแล้ว`);
    } else {
      alert('✅ จบงานเรียบร้อย');
    }

    fetchData(); 
  };

  // --- 3. Shop Management Functions ---

  // เปิดร้าน -> ส่ง LINE
  const handleOpenShop = async () => {
    if (!confirm('ยืนยันส่งแจ้งเตือนเปิดร้านเข้า LINE?')) return;
    
    const msg = generateOpenShopFlex(bookings, stats.todayIncome); 
    const success = await sendLineMessage(msg);
    
    if (success) {
      alert('✅ แจ้งเตือนเรียบร้อย');
      setIsShopOpen(true); 
      localStorage.setItem('shopStatus', 'open');
    }
  };

  // ปิดร้าน -> ส่ง LINE
  const handleCloseShop = async () => {
    if (!isShopOpen) return; 
    if (!confirm('ยืนยันการปิดร้าน? (สรุปยอดเงินเข้า LINE กลุ่ม)')) return;

    const doneBookings = bookings.filter(b => b.status === 'done');
    const actualIncome = doneBookings.reduce((sum, b) => sum + ((b.services?.price || 0) - (b.discount || 0)), 0);
    const doneCount = doneBookings.length;
    const cancelCount = bookings.filter(b => b.status === 'cancelled').length;

    const msg = generateCloseShopFlex(actualIncome, doneCount, cancelCount);
    const success = await sendLineMessage(msg);

    if (success) {
      alert('✅ ส่งสรุปยอดปิดร้านเรียบร้อย');
      setIsShopOpen(false);
      localStorage.setItem('shopStatus', 'closed');
    }
  };

  // แก้ไขเป้าหมายรายเดือน
  const handleEditTarget = async () => {
    const newTarget = prompt("ตั้งเป้าหมายรายเดือนใหม่ (บาท):", target.toString());
    if (newTarget && !isNaN(Number(newTarget))) {
      const val = Number(newTarget);
      await supabase.from('shop_settings').update({ monthly_target: val }).eq('id', 1);
      setTarget(val);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] font-sans text-slate-600">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 w-full flex flex-col">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-4 lg:px-8 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600"><Menu size={24} /></button>
            <div className="hidden md:flex items-center gap-3 bg-slate-100/50 px-4 py-2.5 rounded-full w-72">
              <Search size={18} className="text-slate-400" />
              <input type="text" placeholder="ค้นหา..." className="bg-transparent outline-none text-sm w-full" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* ปุ่ม PromptPay */}
            <button 
              onClick={() => setShowPromptPay(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 text-sm font-bold shadow-md shadow-pink-200 transition-all"
            >
              <CreditCard size={16} /> PromptPay
            </button>
            
            {/* ปุ่มเปิดร้าน */}
            <button 
              onClick={handleOpenShop} 
              disabled={isShopOpen}
              className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all ${
                isShopOpen 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-green-500 text-white hover:bg-green-600 shadow-green-200'
              }`}
            >
              <Power size={16} /> {isShopOpen ? 'ร้านเปิดอยู่' : 'เปิดร้าน'}
            </button>

            {/* ปุ่มปิดร้าน */}
            <button 
              onClick={handleCloseShop} 
              disabled={!isShopOpen}
              className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all ${
                !isShopOpen 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-red-500 text-white hover:bg-red-600 shadow-red-200'
              }`}
            >
              <LogOut size={16} /> ปิดร้าน
            </button>

            <div className="w-px h-8 bg-slate-200 mx-2 hidden sm:block"></div>
            <button className="p-2 relative text-slate-400 hover:bg-slate-50 rounded-full">
              <Bell size={20} /><span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold border border-white shadow-sm cursor-pointer">A</div>
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <StatCard title="คิววันนี้" value={stats.todayQueue} unit="คน" icon={<Users size={24} />} color="text-blue-600" bg="bg-blue-50" trend={stats.queueGrowth} />
              <StatCard title="ทำสำเร็จแล้ว" value={stats.completed} unit="คน" icon={<CheckCircle size={24} />} color="text-emerald-600" bg="bg-emerald-50" trend={0} />
              <StatCard title="รายรับวันนี้" value={stats.todayIncome.toLocaleString()} unit="บาท" icon={<Receipt size={24} />} color="text-orange-600" bg="bg-orange-50" trend={stats.incomeGrowth} />
              
              <div className="col-span-1 sm:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-80">
                 <RevenueChart bookings={bookings} />
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
               {/* การ์ดเป้าหมาย */}
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative group">
                  <button onClick={handleEditTarget} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition" title="แก้ไขเป้าหมาย">
                    <Edit3 size={16} />
                  </button>
                  <h3 className="font-bold text-slate-800 mb-4">เป้าหมายเดือนนี้</h3>
                  <div className="flex justify-center py-4">
                    <div className="w-32 h-32 rounded-full border-8 border-slate-100 flex items-center justify-center border-t-indigo-500 relative">
                       <span className="font-bold text-xl text-slate-700">{target > 0 ? Math.round((stats.monthIncome / target) * 100) : 0}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm mt-4">
                    <span className="text-slate-500">เป้าหมาย: ฿{target.toLocaleString()}</span>
                    <span className="font-bold text-indigo-600">฿{stats.monthIncome.toLocaleString()}</span>
                  </div>
               </div>

               {/* ตารางคิวล่าสุด */}
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-slate-800">คิวล่าสุด</h3>
                   <button onClick={() => setShowModal(true)} className="text-indigo-600 bg-indigo-50 p-1 rounded hover:bg-indigo-100 transition"><Plus size={20}/></button>
                 </div>
                 <div className="space-y-3">
                   {bookings.length === 0 ? <div className="text-center py-4 text-slate-400 text-sm">ไม่มีคิววันนี้</div> : 
                     bookings.slice(0, 4).map((b, i) => (
                       <div 
                         key={i} 
                         onClick={() => setSelectedBooking(b)} 
                         className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition group cursor-pointer"
                       >
                         <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-500 font-bold shadow-sm">{b.customer_name.charAt(0)}</div>
                         <div className="flex-1">
                            <p className="text-sm font-bold text-slate-700">{b.customer_name}</p>
                            <p className="text-xs text-slate-400">{b.services?.name}</p>
                         </div>
                         <div className="text-right flex flex-col items-end gap-1">
                            <p className="text-xs font-bold text-slate-600">{b.start_time.slice(0,5)}</p>
                            {b.status === 'done' ? (
                                <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-600 rounded-full font-bold">เสร็จแล้ว</span>
                            ) : b.status === 'cancelled' ? (
                                <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-bold">ยกเลิก</span>
                            ) : (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleComplete(b.id, b.service_id);
                                    }}
                                    className="p-1 bg-slate-200 hover:bg-green-500 hover:text-white rounded-full transition text-slate-500"
                                    title="กดเพื่อจบงาน"
                                >
                                    <CheckCircle size={16} />
                                </button>
                            )}
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

      {/* Modals */}
      <BookingModal isOpen={showModal} onClose={() => setShowModal(false)} services={services} onSave={handleSaveBooking} />
      
      <BookingDetailModal 
        isOpen={!!selectedBooking} 
        onClose={() => setSelectedBooking(null)} 
        booking={selectedBooking}
        onUpdate={handleUpdateBooking}
        onDelete={handleDeleteBooking}
      />
      
      <PromptPayModal isOpen={showPromptPay} onClose={() => setShowPromptPay(false)} />
    </div>
  );
}

// Stat Card Component (โชว์ลูกศรเขียว/แดง)
function StatCard({ title, value, unit, icon, color, bg, trend }: any) {
  const isPositive = trend >= 0;
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center`}>{icon}</div>
        <span className={`text-xs px-2 py-1 rounded-lg font-bold flex items-center gap-1 ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {isPositive ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      </div>
      <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</h4>
      <div className="flex items-baseline gap-1"><h2 className="text-2xl font-bold text-slate-800">{value}</h2><span className="text-xs text-slate-400 font-medium">{unit}</span></div>
    </div>
  );
}