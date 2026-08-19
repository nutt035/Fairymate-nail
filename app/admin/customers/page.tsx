'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { Search, User, Crown, Facebook, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ดึงข้อมูลทั้งหมดมาคำนวณ (bookings เป็นตัวหลัก — ใช้ได้กับข้อมูลที่ migrate มา)
  const fetchCustomers = async () => {
    setLoading(true);
    // ดึง Booking ทั้งหมด (ที่เสร็จแล้ว)
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, services(price)')
      .eq('status', 'done'); // เอาเฉพาะที่จ่ายเงินแล้ว

    // เติม facebook จากตาราง customers (ถ้ามี) — เผื่อข้อมูลจาก admin สมัครสมาชิก
    const { data: customerRows } = await supabase
      .from('customers')
      .select('name, phone, facebook');

    const fbMap = new Map<string, string>();
    (customerRows || []).forEach((c: any) => {
      if (c.facebook) fbMap.set(String(c.name).toLowerCase() + (c.phone || ''), c.facebook);
    });

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

      // ใส่ facebook ที่เจอจากตาราง customers (ถ้ามี)
      customerMap.forEach((c: any) => {
        c.facebook = fbMap.get(String(c.name).toLowerCase() + (c.phone || '')) || null;
      });

      // แปลงกลับเป็น Array แล้วเรียงตามยอดซื้อมากสุด
      const customerList = Array.from(customerMap.values()).sort((a, b) => b.total_spent - a.total_spent);
      setCustomers(customerList);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);

  const getContactLink = (text: string) => {
    if (!text) return null;
    if (text.startsWith('http')) return text;
    return `https://www.facebook.com/search/top?q=${encodeURIComponent(text)}`;
  };

  // ฟังก์ชันค้นหา
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            <User className="text-primary" size={28} />
            ประวัติลูกค้า (CRM)
          </h1>
          <p className="text-slate-500 mt-1">ดูยอดใช้บริการและยอดรวมของลูกค้าแต่ละคน</p>
        </div>
        <div className="bg-white rounded-xl px-4 py-2.5 shadow-sm flex items-center gap-2 w-full md:w-64 shrink-0">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, เบอร์โทร..."
            className="bg-transparent outline-none text-sm w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><User size={18} /></div>
            <span className="text-slate-400 text-xs font-bold uppercase">ลูกค้าทั้งหมด</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{customers.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-amber-50 text-amber-500 rounded-xl"><Crown size={18} /></div>
            <span className="text-amber-500 text-xs font-bold uppercase">Top Spender</span>
          </div>
          <p className="text-lg font-bold text-slate-800 truncate">{customers[0]?.name || '-'}</p>
        </div>
        <div className="bg-gradient-to-br from-primary to-pink-600 rounded-2xl p-5 text-white shadow-lg shadow-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <Crown size={18} />
            <span className="text-white/80 text-xs font-bold uppercase">ยอดสูงสุด</span>
          </div>
          <p className="text-2xl font-black">{customers[0] ? `฿${customers[0].total_spent.toLocaleString()}` : '-'}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm uppercase">
              <tr>
                <th className="p-4 lg:p-6">ชื่อลูกค้า</th>
                <th className="p-4 lg:p-6">ติดต่อ</th>
                <th className="p-4 lg:p-6 text-center">มาใช้บริการ</th>
                <th className="p-4 lg:p-6 text-right">ยอดรวม (LTV)</th>
                <th className="p-4 lg:p-6 text-right">มาล่าสุด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin text-primary mx-auto" /></td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">ไม่พบข้อมูล</td></tr>
              ) : (
                filteredCustomers.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="p-4 lg:p-6 font-bold text-slate-700 flex items-center gap-2">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold",
                        i < 3 ? "bg-amber-400" : "bg-slate-300"
                      )}>
                        {i + 1}
                      </div>
                      {c.name}
                      {i === 0 && <Crown size={14} className="text-amber-500" />}
                    </td>
                    <td className="p-4 lg:p-6 text-sm">
                      <div className="flex flex-col gap-1">
                        {c.phone && <span className="text-slate-500">{c.phone}</span>}
                        {c.facebook && <a href={getContactLink(c.facebook) || '#'} target="_blank" className="text-blue-600 flex items-center gap-1 hover:underline font-medium"><Facebook size={14} /> {c.facebook}</a>}
                      </div>
                    </td>
                    <td className="p-4 lg:p-6 text-center">
                      <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">
                        {c.visit_count} ครั้ง
                      </span>
                    </td>
                    <td className="p-4 lg:p-6 text-right font-bold text-primary">
                      ฿{c.total_spent.toLocaleString()}
                    </td>
                    <td className="p-4 lg:p-6 text-right text-slate-400 text-sm">
                      {c.last_visit ? new Date(c.last_visit).toLocaleDateString('th-TH') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
