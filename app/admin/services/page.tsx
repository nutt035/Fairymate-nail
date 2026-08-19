'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { Settings, Plus, Trash2, X, Edit2, Package, Link, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]); // รายการของในคลัง
  const [loading, setLoading] = useState(true);

  // Modals
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false); // Modal ผูกสูตร

  const [editingService, setEditingService] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', price: '', duration: '60' });

  // Recipe States
  const [currentRecipes, setCurrentRecipes] = useState<any[]>([]); // สูตรปัจจุบันของบริการที่เลือก
  const [newRecipe, setNewRecipe] = useState({ inventory_id: '', quantity: '1' });

  const fetchData = async () => {
    setLoading(true);
    const { data: sData } = await supabase.from('services').select('*').order('id');
    if (sData) setServices(sData);

    const { data: iData } = await supabase.from('inventory').select('*').order('name');
    if (iData) setInventory(iData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- Service Functions ---
  const openServiceModal = (service: any = null) => {
    setEditingService(service);
    if (service) {
      setFormData({ name: service.name, price: service.price, duration: service.duration_minutes });
    } else {
      setFormData({ name: '', price: '', duration: '60' });
    }
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async () => {
    const payload = { name: formData.name, price: Number(formData.price), duration_minutes: Number(formData.duration) };
    if (editingService) {
      await supabase.from('services').update(payload).eq('id', editingService.id);
    } else {
      await supabase.from('services').insert([payload]);
    }
    setIsServiceModalOpen(false);
    fetchData();
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm('ลบบริการนี้?')) return;
    await supabase.from('services').delete().eq('id', id);
    fetchData();
  };

  // --- Recipe Functions (ผูกสูตร) ---
  const openRecipeModal = async (service: any) => {
    setEditingService(service);
    // ดึงสูตรที่มีอยู่แล้วมาโชว์
    const { data } = await supabase
      .from('service_recipes')
      .select('id, inventory_id, quantity_used, inventory(name, unit)')
      .eq('service_id', service.id);

    if (data) setCurrentRecipes(data);
    setNewRecipe({ inventory_id: '', quantity: '1' });
    setIsRecipeModalOpen(true);
  };

  const handleAddRecipe = async () => {
    if (!newRecipe.inventory_id) return;
    await supabase.from('service_recipes').insert([{
      service_id: editingService.id,
      inventory_id: Number(newRecipe.inventory_id),
      quantity_used: Number(newRecipe.quantity)
    }]);
    openRecipeModal(editingService); // รีโหลดสูตร
  };

  const handleDeleteRecipe = async (recipeId: number) => {
    await supabase.from('service_recipes').delete().eq('id', recipeId);
    openRecipeModal(editingService); // รีโหลดสูตร
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-primary" size={28} />
            บริการและสูตรตัดสต็อก
          </h1>
          <p className="text-slate-500 mt-1">ตั้งค่าบริการ + ผูกสูตรว่าจบงานต้องตัดสต็อกอะไรบ้าง</p>
        </div>
        <button
          onClick={() => openServiceModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus size={18} /> เพิ่มบริการใหม่
        </button>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">รายการบริการ ({services.length})</h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Settings size={40} className="mx-auto mb-2 opacity-50" />
            <p>ยังไม่มีบริการ</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {services.map((s) => (
              <div key={s.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Settings size={18} className="text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-700 truncate">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.duration_minutes} นาที</p>
                </div>

                <p className="font-bold text-primary shrink-0">฿{s.price}</p>

                <div className="flex gap-1 shrink-0">
                  {/* ปุ่มผูกสูตร */}
                  <button onClick={() => openRecipeModal(s)} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition" title="ผูกสูตรตัดสต็อก">
                    <Link size={18} />
                  </button>
                  <button onClick={() => openServiceModal(s)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDeleteService(s.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal 1: เพิ่ม/แก้ไข บริการ */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">{editingService ? '✏️ แก้ไขบริการ' : '✨ เพิ่มบริการ'}</h3>
              <button onClick={() => setIsServiceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">ชื่อบริการ</label>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 focus:ring-2 focus:ring-primary/30 outline-none"
                  placeholder="เช่น ต่อเจล + เพ้นท์"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">ราคา (฿)</label>
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 focus:ring-2 focus:ring-primary/30 outline-none"
                    type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">เวลา (นาที)</label>
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 focus:ring-2 focus:ring-primary/30 outline-none"
                    type="number" value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsServiceModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">ยกเลิก</button>
              <button onClick={handleSaveService} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors">บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: ผูกสูตร (Recipes) */}
      {isRecipeModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b bg-orange-50 flex justify-between items-center">
              <h3 className="font-bold text-orange-800 flex items-center gap-2"><Package size={20} /> ตัดสต็อกอัตโนมัติ</h3>
              <button onClick={() => setIsRecipeModalOpen(false)} className="text-orange-400 hover:text-orange-600"><X size={24} /></button>
            </div>

            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-slate-500 mb-4">เมื่อจบงาน <b className="text-slate-700">"{editingService?.name}"</b> จะตัดสต็อกดังนี้:</p>

              {/* List รายการที่ผูกไว้ */}
              <div className="space-y-2 mb-6">
                {currentRecipes.length === 0 ? <p className="text-center text-slate-300 py-4">ยังไม่ได้ผูกสูตร</p> :
                  currentRecipes.map((r, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-700">{r.inventory?.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-red-500 font-bold">-{r.quantity_used} {r.inventory?.unit}</span>
                        <button onClick={() => handleDeleteRecipe(r.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))
                }
              </div>

              {/* Form เพิ่มสูตร */}
              <div className="bg-slate-100 p-4 rounded-2xl">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">เพิ่มการตัดสต็อก</p>
                <div className="flex gap-2">
                  <select
                    className="flex-1 border rounded-xl px-3 py-2 text-sm bg-white"
                    value={newRecipe.inventory_id}
                    onChange={e => setNewRecipe({ ...newRecipe, inventory_id: e.target.value })}
                  >
                    <option value="">-- เลือกสินค้า --</option>
                    {inventory.map(item => (
                      <option key={item.id} value={item.id}>{item.name} (หน่วย: {item.unit})</option>
                    ))}
                  </select>
                  <input
                    type="number" className="w-20 border rounded-xl px-3 py-2 text-sm text-center"
                    placeholder="1"
                    value={newRecipe.quantity}
                    onChange={e => setNewRecipe({ ...newRecipe, quantity: e.target.value })}
                  />
                  <button onClick={handleAddRecipe} className="bg-primary text-white p-2 rounded-xl hover:bg-primary/90"><Plus /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
