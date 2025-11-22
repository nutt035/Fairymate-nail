'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import Sidebar from '@/components/Sidebar';
import { Menu, Search, User, Crown, ExternalLink, Facebook } from 'lucide-react';

export default function CustomersPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('total_spent', { ascending: false });
    if (data) setCustomers(data);
  };
  useEffect(() => { fetchCustomers(); }, []);

  const getContactLink = (text: string) => {
    if (!text) return null;
    if (text.startsWith('http')) return text;
    return `https://www.facebook.com/search/top?q=${encodeURIComponent(text)}`;
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] font-sans text-slate-600">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 flex flex-col w-full">
        <header className="h-20 bg-white border-b border-slate-200 px-4 lg:px-8 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu /></button>
            <h1 className="text-lg lg:text-xl font-bold text-slate-800 flex items-center gap-2"><User className="text-indigo-600" /> ประวัติลูกค้า</h1>
          </div>
          <div className="bg-slate-100 px-3 py-2 rounded-lg flex items-center gap-2 w-36 lg:w-64">
             <Search size={18} className="text-slate-400" />
             <input type="text" placeholder="ค้นหา..." className="bg-transparent outline-none text-sm w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6">
             <div className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="p-3 lg:p-4 bg-purple-50 text-purple-600 rounded-xl"><User size={24} /></div>
                <div><p className="text-slate-400 text-xs font-bold uppercase">ลูกค้าทั้งหมด</p><h2 className="text-2xl lg:text-3xl font-bold text-slate-800">{customers.length}</h2></div>
             </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm uppercase">
                  <tr><th className="p-4 lg:p-6">ชื่อลูกค้า</th><th className="p-4 lg:p-6">ติดต่อ</th><th className="p-4 lg:p-6 text-center">มาใช้บริการ</th><th className="p-4 lg:p-6 text-right">ยอดรวม</th><th className="p-4 lg:p-6 text-right">ล่าสุด</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredCustomers.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="p-4 lg:p-6 font-bold text-slate-700 flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold ${i < 3 ? 'bg-amber-400' : 'bg-slate-300'}`}>{i + 1}</div>
                        {c.name} {i === 0 && <Crown size={14} className="text-amber-500" />}
                      </td>
                      <td className="p-4 lg:p-6 text-sm">
                        <div className="flex flex-col gap-1">
                          {c.phone && <span className="text-slate-500">{c.phone}</span>}
                          {c.facebook && <a href={getContactLink(c.facebook) || '#'} target="_blank" className="text-blue-600 flex items-center gap-1 hover:underline font-medium"><Facebook size={14}/> {c.facebook}</a>}
                        </div>
                      </td>
                      <td className="p-4 lg:p-6 text-center"><span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs font-bold">{c.visit_count} ครั้ง</span></td>
                      <td className="p-4 lg:p-6 text-right font-bold text-indigo-600">฿{c.total_spent.toLocaleString()}</td>
                      <td className="p-4 lg:p-6 text-right text-slate-400 text-sm">{c.last_visit ? new Date(c.last_visit).toLocaleDateString('th-TH') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}