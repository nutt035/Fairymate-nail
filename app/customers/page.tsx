'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import Sidebar from '@/components/Sidebar';
import { Menu, Search, User, DollarSign, Calendar, Crown } from 'lucide-react';

export default function CustomersPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ดึงข้อมูลทั้งหมดมาคำนวณ
  const fetchCustomers = async () => {
    setLoading(true);
    // ดึง Booking ทั้งหมด (ที่เสร็จแล้ว)
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, services(price)')
      .eq('status', 'done'); // เอาเฉพาะที่จ่ายเงินแล้ว

    if (bookings) {
      // รวมข้อมูลลูกค้า (Group by Name/Phone)
      const customerMap = new Map();

      bookings.forEach((b) => {
        const key = b.customer_name + (b.customer_phone || ''); // ใช้ชื่อ+เบอร์เป็น ID
        
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            name: b.customer_name,
            phone: b.customer_phone,
            visit_count: 0,
            total_spent: 0,
            last_visit: b.booking_date
          });
        }

        const current = customerMap.get(key);
        const price = (b.final_price || b.services?.price || 0);
        
        current.visit_count += 1;
        current.total_spent += price;
        // อัปเดตวันล่าสุด
        if (new Date(b.booking_date) > new Date(current.last_visit)) {
          current.last_visit = b.booking_date;
        }
      });

      // แปลงกลับเป็น Array แล้วเรียงตามยอดซื้อมากสุด
      const customerList = Array.from(customerMap.values()).sort((a, b) => b.total_spent - a.total_spent);
      setCustomers(customerList);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);

  // ฟังก์ชันค้นหา
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] font-sans text-slate-600">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 flex flex-col">
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu /></button>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <User className="text-indigo-600" /> ประวัติลูกค้า (CRM)
            </h1>
          </div>
          <div className="bg-slate-100 px-4 py-2 rounded-lg flex items-center gap-2 w-64">
             <Search size={18} className="text-slate-400" />
             <input 
               type="text" 
               placeholder="ค้นหาชื่อ, เบอร์โทร..." 
               className="bg-transparent outline-none text-sm w-full"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto w-full">
          
          {/* Cards Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="p-4 bg-purple-50 text-purple-600 rounded-xl"><User size={32} /></div>
                <div><p className="text-slate-400 text-xs font-bold uppercase">ลูกค้าทั้งหมด</p><h2 className="text-3xl font-bold text-slate-800">{customers.length}</h2></div>
             </div>
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="p-4 bg-amber-50 text-amber-500 rounded-xl"><Crown size={32} /></div>
                <div><p className="text-slate-400 text-xs font-bold uppercase">Top Spender</p><h2 className="text-lg font-bold text-slate-800 truncate w-32">{customers[0]?.name || '-'}</h2></div>
             </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm uppercase tracking-wider">
                <tr>
                  <th className="p-6 font-semibold">ชื่อลูกค้า</th>
                  <th className="p-6 font-semibold">เบอร์โทร</th>
                  <th className="p-6 font-semibold text-center">จำนวนครั้งที่มา</th>
                  <th className="p-6 font-semibold text-right">ยอดรวม (LTV)</th>
                  <th className="p-6 font-semibold text-right">มาล่าสุด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                   <tr><td colSpan={5} className="p-8 text-center">กำลังโหลด...</td></tr>
                ) : filteredCustomers.length === 0 ? (
                   <tr><td colSpan={5} className="p-8 text-center">ไม่พบข้อมูล</td></tr>
                ) : (
                  filteredCustomers.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition group">
                      <td className="p-6 font-bold text-slate-700 flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold ${i < 3 ? 'bg-amber-400 shadow-amber-200' : 'bg-slate-300'}`}>
                           {i + 1}
                        </div>
                        {c.name}
                        {i === 0 && <Crown size={14} className="text-amber-500" />}
                      </td>
                      <td className="p-6 text-slate-500">{c.phone || '-'}</td>
                      <td className="p-6 text-center">
                        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">
                          {c.visit_count} ครั้ง
                        </span>
                      </td>
                      <td className="p-6 text-right font-bold text-indigo-600">
                         ฿{c.total_spent.toLocaleString()}
                      </td>
                      <td className="p-6 text-right text-slate-400 text-sm">
                         {new Date(c.last_visit).toLocaleDateString('th-TH')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
}