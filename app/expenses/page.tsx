'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import Sidebar from '@/components/Sidebar';
import { Menu, Wallet, Plus, Trash2 } from 'lucide-react';

export default function ExpensesPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  
  const [form, setForm] = useState({ title: '', amount: '', category: 'ทั่วไป' });

  const fetchExpenses = async () => {
    const { data } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
    if (data) setExpenses(data);
  };

  useEffect(() => { fetchExpenses(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.amount) return;

    const { error } = await supabase.from('expenses').insert([{
      title: form.title,
      amount: Number(form.amount),
      category: form.category
    }]);

    if (!error) {
      alert('✅ บันทึกรายจ่ายแล้ว');
      setForm({ title: '', amount: '', category: 'ทั่วไป' });
      fetchExpenses();
    }
  };

  const handleDelete = async (id: number) => {
    if(!confirm('ลบรายการนี้?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    fetchExpenses();
  };

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] font-sans text-slate-600">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 flex flex-col">
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu /></button>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Wallet className="text-red-500" /> บันทึกรายจ่าย
            </h1>
          </div>
        </header>

        <div className="p-8 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form ฝั่งซ้าย */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
              <h3 className="font-bold text-slate-800 mb-4">💸 เพิ่มรายการจ่าย</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400">รายการ</label>
                  <input type="text" className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-200" 
                    placeholder="เช่น ซื้อสีเจลเพิ่ม"
                    value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400">จำนวนเงิน (บาท)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-200" 
                    placeholder="0.00"
                    value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400">หมวดหมู่</label>
                  <select className="w-full border rounded-lg px-3 py-2 bg-white"
                    value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  >
                    <option>ทั่วไป</option>
                    <option>ซื้อของเข้าร้าน</option>
                    <option>ค่าน้ำ/ไฟ/เช่า</option>
                    <option>เงินเดือนพนักงาน</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition">
                   <Plus size={18} /> บันทึกจ่าย
                </button>
              </form>
            </div>
          </div>

          {/* List ฝั่งขวา */}
          <div className="lg:col-span-2">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
               <table className="w-full text-left">
                 <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm uppercase">
                   <tr>
                     <th className="p-4">วันที่</th>
                     <th className="p-4">รายการ</th>
                     <th className="p-4 text-right">จำนวน</th>
                     <th className="p-4"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {expenses.map(ex => (
                     <tr key={ex.id} className="hover:bg-slate-50">
                       <td className="p-4 text-sm text-slate-500">{new Date(ex.expense_date).toLocaleDateString('th-TH')}</td>
                       <td className="p-4 font-medium text-slate-700">
                         {ex.title}
                         <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-400">{ex.category}</span>
                       </td>
                       <td className="p-4 text-right font-bold text-red-500">-฿{ex.amount.toLocaleString()}</td>
                       <td className="p-4 text-right">
                         <button onClick={() => handleDelete(ex.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                       </td>
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