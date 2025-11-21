'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import Sidebar from '@/components/Sidebar';
import { Menu, Tag, Plus, Trash2, Power } from 'lucide-react';

export default function PromotionsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [promos, setPromos] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', type: 'percent', value: '' });

  const fetchPromos = async () => {
    const { data } = await supabase.from('promotions').select('*').order('id');
    if (data) setPromos(data);
  };

  useEffect(() => { fetchPromos(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.value) return;

    const { error } = await supabase.from('promotions').insert([{
      name: form.name,
      discount_type: form.type,
      value: Number(form.value),
      is_active: true
    }]);

    if (!error) {
      alert('✅ เพิ่มโปรโมชั่นแล้ว');
      setForm({ name: '', type: 'percent', value: '' });
      fetchPromos();
    }
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    await supabase.from('promotions').update({ is_active: !currentStatus }).eq('id', id);
    fetchPromos();
  };

  const handleDelete = async (id: number) => {
    if(!confirm('ลบโปรโมชั่นนี้?')) return;
    await supabase.from('promotions').delete().eq('id', id);
    fetchPromos();
  };

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] font-sans text-slate-600">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 flex flex-col">
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu /></button>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Tag className="text-pink-500" /> จัดการโปรโมชั่น
            </h1>
          </div>
        </header>

        <div className="p-8 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form เพิ่มโปร */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
              <h3 className="font-bold text-slate-800 mb-4">✨ สร้างโปรใหม่</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400">ชื่อโปรโมชั่น</label>
                  <input type="text" className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-pink-200" 
                    placeholder="เช่น ลดวันเกิด"
                    value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400">ประเภท</label>
                    <select className="w-full border rounded-lg px-3 py-2 bg-white"
                      value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                    >
                      <option value="percent">เปอร์เซ็นต์ (%)</option>
                      <option value="amount">บาท (฿)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400">มูลค่าลด</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-pink-200" 
                      placeholder="0"
                      value={form.value} onChange={e => setForm({...form, value: e.target.value})}
                    />
                  </div>
                </div>
                <button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition">
                   <Plus size={18} /> บันทึก
                </button>
              </form>
            </div>
          </div>

          {/* List รายการโปร */}
          <div className="lg:col-span-2">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
               <table className="w-full text-left">
                 <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm uppercase">
                   <tr>
                     <th className="p-4">ชื่อโปรโมชั่น</th>
                     <th className="p-4">ส่วนลด</th>
                     <th className="p-4 text-center">สถานะ</th>
                     <th className="p-4"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {promos.map(p => (
                     <tr key={p.id} className="hover:bg-slate-50">
                       <td className="p-4 font-medium text-slate-700">{p.name}</td>
                       <td className="p-4 text-pink-600 font-bold">
                         {p.discount_type === 'percent' ? `${p.value}%` : `฿${p.value}`}
                       </td>
                       <td className="p-4 text-center">
                         <button 
                           onClick={() => toggleActive(p.id, p.is_active)}
                           className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 mx-auto transition
                             ${p.is_active ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}
                           `}
                         >
                           <Power size={12} /> {p.is_active ? 'เปิดใช้' : 'ปิด'}
                         </button>
                       </td>
                       <td className="p-4 text-right">
                         <button onClick={() => handleDelete(p.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
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