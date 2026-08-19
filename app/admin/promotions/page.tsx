'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { Tag, Plus, Trash2, Power, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PromotionsPage() {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', type: 'percent', value: '' });

  const fetchPromos = async () => {
    setLoading(true);
    const { data } = await supabase.from('promotions').select('*').order('id');
    if (data) setPromos(data);
    setLoading(false);
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
    if (!confirm('ลบโปรโมชั่นนี้?')) return;
    await supabase.from('promotions').delete().eq('id', id);
    fetchPromos();
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
          <Tag className="text-primary" size={28} />
          จัดการโปรโมชั่น
        </h1>
        <p className="text-slate-500 mt-1">สร้างโปรโมชั่นส่วนลดสำหรับลูกค้า</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form เพิ่มโปร */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:sticky lg:top-24">
            <h3 className="font-bold text-slate-800 mb-4">✨ สร้างโปรใหม่</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">ชื่อโปรโมชั่น</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 focus:ring-2 focus:ring-primary/30 outline-none"
                  placeholder="เช่น ลดวันเกิด"
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">ประเภท</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 focus:ring-2 focus:ring-primary/30 outline-none bg-white"
                    value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                  >
                    <option value="percent">เปอร์เซ็นต์ (%)</option>
                    <option value="amount">บาท (฿)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">มูลค่าลด</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 focus:ring-2 focus:ring-primary/30 outline-none"
                    placeholder="0"
                    value={form.value} onChange={e => setForm({...form, value: e.target.value})}
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition">
                 <Plus size={18} /> บันทึก
              </button>
            </form>
          </div>
        </div>

        {/* List รายการโปร */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">รายการโปรโมชั่น ({promos.length})</h3>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-primary" />
              </div>
            ) : promos.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Tag size={40} className="mx-auto mb-2 opacity-50" />
                <p>ยังไม่มีโปรโมชั่น</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {promos.map(p => (
                  <div key={p.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0",
                      p.is_active ? "bg-primary/10" : "bg-slate-100"
                    )}>
                      <Tag size={18} className={p.is_active ? "text-primary" : "text-slate-400"} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-700 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">
                        ลด {p.discount_type === 'percent' ? `${p.value}%` : `฿${p.value}`}
                      </p>
                    </div>

                    <button
                      onClick={() => toggleActive(p.id, p.is_active)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition",
                        p.is_active ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                      )}
                    >
                      <Power size={12} /> {p.is_active ? 'เปิดใช้' : 'ปิด'}
                    </button>

                    <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
