'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import Sidebar from '@/components/Sidebar';
import { Menu, Wallet, Plus, Trash2 } from 'lucide-react';

export default function ExpensesPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  
  // รายการของในสต็อก (สำหรับ Dropdown)
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  const [form, setForm] = useState({ 
    title: '', 
    amount: '', 
    category: 'ทั่วไป',
    isStockPurchase: false,
    stockId: '',
    stockQty: ''
  });

  // ✅ แก้ชื่อฟังก์ชันเป็น fetchExpenses (ให้ตรงกันทั้งไฟล์)
  const fetchExpenses = async () => {
    // 1. ดึงรายจ่าย
    const { data: expData } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
    if (expData) setExpenses(expData);

    // 2. ดึงของในสต็อก (เตรียมไว้เผื่อซื้อของเข้า)
    const { data: invData } = await supabase.from('inventory').select('*').order('name');
    if (invData) setInventoryItems(invData);
  };

  useEffect(() => { fetchExpenses(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.amount) return;

    // 1. บันทึกรายจ่าย
    const { error } = await supabase.from('expenses').insert([{
      title: form.title,
      amount: Number(form.amount),
      category: form.category
    }]);

    if (error) return alert('❌ บันทึกไม่ผ่าน: ' + error.message);

    // 2. ถ้าเป็นการซื้อของเข้าสต็อก
    if (form.isStockPurchase && form.stockId && form.stockQty) {
      const { data: currentItem } = await supabase.from('inventory').select('quantity').eq('id', form.stockId).single();
      if (currentItem) {
        const newQty = currentItem.quantity + Number(form.stockQty);
        await supabase.from('inventory').update({ quantity: newQty }).eq('id', form.stockId);
        alert(`✅ บันทึกและเติมสต็อก +${form.stockQty} ชิ้น เรียบร้อย!`);
      }
    } else {
      alert('✅ บันทึกรายจ่ายเรียบร้อย');
    }

    setForm({ title: '', amount: '', category: 'ทั่วไป', isStockPurchase: false, stockId: '', stockQty: '' });
    fetchExpenses(); // ✅ เรียกชื่อถูกต้องแล้ว
  };

  const handleDelete = async (id: number) => {
    if(!confirm('ลบรายการนี้?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    fetchExpenses(); // ✅ เรียกชื่อถูกต้องแล้ว
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
                  <input type="text" className="w-full border rounded-lg px-3 py-2" placeholder="เช่น ซื้อสีเจลเพิ่ม"
                    value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400">จำนวนเงิน (บาท)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2" placeholder="0.00"
                    value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400">หมวดหมู่</label>
                  <select className="w-full border rounded-lg px-3 py-2 bg-white"
                    value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option>ทั่วไป</option>
                    <option>ซื้อของเข้าร้าน</option>
                    <option>ค่าน้ำ/ไฟ/เช่า</option>
                    <option>เงินเดือนพนักงาน</option>
                  </select>
                </div>

                <hr className="border-slate-100" />

                {/* Checkbox ซื้อของเข้าสต็อก */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="checkbox" className="w-4 h-4"
                      checked={form.isStockPurchase}
                      onChange={e => setForm({...form, isStockPurchase: e.target.checked})} />
                    <span className="text-sm font-bold text-slate-700">อัปเดตสต็อกด้วย?</span>
                  </label>

                  {form.isStockPurchase && (
                    <div className="space-y-2">
                      <select className="w-full border rounded-lg px-3 py-2 bg-white text-sm"
                        value={form.stockId} onChange={e => setForm({...form, stockId: e.target.value})}>
                        <option value="">-- เลือกสินค้า --</option>
                        {inventoryItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                      <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="จำนวนที่ซื้อเพิ่ม"
                        value={form.stockQty} onChange={e => setForm({...form, stockQty: e.target.value})} />
                    </div>
                  )}
                </div>

                <button type="submit" className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                   <Plus size={18} /> บันทึกจ่าย
                </button>
              </form>
            </div>
          </div>

          {/* Table ฝั่งขวา */}
          <div className="lg:col-span-2">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
               <table className="w-full text-left">
                 <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                   <tr><th className="p-4">วันที่</th><th className="p-4">รายการ</th><th className="p-4 text-right">จำนวน</th><th className="p-4"></th></tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {expenses.map(ex => (
                     <tr key={ex.id} className="hover:bg-slate-50">
                       <td className="p-4 text-sm text-slate-500">{new Date(ex.expense_date).toLocaleDateString('th-TH')}</td>
                       <td className="p-4 font-medium text-slate-700">{ex.title} <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-400">{ex.category}</span></td>
                       <td className="p-4 text-right font-bold text-red-500">-฿{ex.amount.toLocaleString()}</td>
                       <td className="p-4 text-right"><button onClick={() => handleDelete(ex.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></td>
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