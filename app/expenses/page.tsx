'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import Sidebar from '@/components/Sidebar';
import { Menu, Wallet, Plus, Trash2 } from 'lucide-react';

export default function ExpensesPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', amount: '', category: 'ทั่วไป', isStockPurchase: false, stockId: '', stockQty: '' });

  const fetchExpenses = async () => {
    const { data: exp } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
    if (exp) setExpenses(exp);
    const { data: inv } = await supabase.from('inventory').select('*').order('name');
    if (inv) setInventoryItems(inv);
  };
  useEffect(() => { fetchExpenses(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.amount) return;

    const { error } = await supabase.from('expenses').insert([{ title: form.title, amount: Number(form.amount), category: form.category }]);
    if (error) return alert('Error: ' + error.message);

    if (form.isStockPurchase && form.stockId) {
      const { data: item } = await supabase.from('inventory').select('quantity').eq('id', form.stockId).single();
      if (item) await supabase.from('inventory').update({ quantity: item.quantity + Number(form.stockQty) }).eq('id', form.stockId);
      alert('✅ บันทึกและเติมสต็อกแล้ว');
    } else {
      alert('✅ บันทึกแล้ว');
    }
    setForm({ title: '', amount: '', category: 'ทั่วไป', isStockPurchase: false, stockId: '', stockQty: '' });
    fetchExpenses();
  };

  const handleDelete = async (id: number) => {
    if(!confirm('ลบรายการนี้?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    fetchExpenses();
  };

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] font-sans text-slate-600">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 flex flex-col w-full">
        <header className="h-20 bg-white border-b border-slate-200 px-4 lg:px-8 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu /></button>
            <h1 className="text-lg lg:text-xl font-bold text-slate-800 flex items-center gap-2"><Wallet className="text-red-500" /> รายจ่าย</h1>
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 order-1 lg:order-1">
            <div className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4">💸 เพิ่มรายจ่าย</h3>
              <form onSubmit={handleAdd} className="space-y-3">
                <div><label className="text-xs font-bold text-slate-400">รายการ</label><input className="w-full border rounded-lg px-3 py-2" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} /></div>
                <div><label className="text-xs font-bold text-slate-400">บาท</label><input type="number" className="w-full border rounded-lg px-3 py-2" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} /></div>
                <div><label className="text-xs font-bold text-slate-400">หมวดหมู่</label><select className="w-full border rounded-lg px-3 py-2 bg-white" value={form.category} onChange={e=>setForm({...form, category:e.target.value})}><option>ทั่วไป</option><option>ซื้อของเข้าร้าน</option><option>ค่าเช่า/น้ำไฟ</option><option>เงินเดือน</option></select></div>
                <div className="bg-slate-50 p-3 rounded-xl border">
                  <label className="flex items-center gap-2 mb-2"><input type="checkbox" checked={form.isStockPurchase} onChange={e=>setForm({...form, isStockPurchase:e.target.checked})}/><span className="text-sm font-bold">อัปเดตสต็อก?</span></label>
                  {form.isStockPurchase && <div className="space-y-2"><select className="w-full border rounded-lg px-2 py-2 text-sm" value={form.stockId} onChange={e=>setForm({...form, stockId:e.target.value})}><option value="">เลือกสินค้า</option>{inventoryItems.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select><input type="number" className="w-full border rounded-lg px-2 py-2 text-sm" placeholder="จำนวน" value={form.stockQty} onChange={e=>setForm({...form, stockQty:e.target.value})}/></div>}
                </div>
                <button type="submit" className="w-full bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600"><Plus className="inline mr-1"/> บันทึก</button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 order-2 lg:order-2">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left min-w-[500px]">
                   <thead className="bg-slate-50 border-b text-slate-500 text-sm"><tr><th className="p-4">วันที่</th><th className="p-4">รายการ</th><th className="p-4 text-right">จำนวน</th><th className="p-4"></th></tr></thead>
                   <tbody className="divide-y divide-slate-50">
                     {expenses.map(ex => (
                       <tr key={ex.id} className="hover:bg-slate-50"><td className="p-4 text-sm text-slate-500">{new Date(ex.expense_date).toLocaleDateString('th-TH')}</td><td className="p-4 font-medium">{ex.title} <span className="text-xs bg-slate-100 px-1 rounded text-slate-400">{ex.category}</span></td><td className="p-4 text-right font-bold text-red-500">-฿{ex.amount.toLocaleString()}</td><td className="p-4 text-right"><button onClick={()=>handleDelete(ex.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></td></tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}