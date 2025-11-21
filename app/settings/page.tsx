'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import Sidebar from '@/components/Sidebar';
import { Menu, Settings, Plus, Trash2, Save, X, Edit2, Package, Link } from 'lucide-react';

export default function SettingsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]); // รายการของในคลัง
  
  // Modals
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false); // Modal ผูกสูตร

  const [editingService, setEditingService] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', price: '', duration: '60' });
  
  // Recipe States
  const [currentRecipes, setCurrentRecipes] = useState<any[]>([]); // สูตรปัจจุบันของบริการที่เลือก
  const [newRecipe, setNewRecipe] = useState({ inventory_id: '', quantity: '1' });

  const fetchData = async () => {
    const { data: sData } = await supabase.from('services').select('*').order('id');
    if (sData) setServices(sData);
    
    const { data: iData } = await supabase.from('inventory').select('*').order('name');
    if (iData) setInventory(iData);
  };

  useEffect(() => { fetchData(); }, []);

  // --- Service Functions ---
  const openServiceModal = (service: any = null) => {
    setEditingService(service);
    if (service) {
      setFormData({ name: service.name, price: service.price, duration: service.duration });
    } else {
      setFormData({ name: '', price: '', duration: '60' });
    }
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async () => {
    const payload = { name: formData.name, price: Number(formData.price), duration: Number(formData.duration) };
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
    <div className="flex min-h-screen bg-[#F1F5F9] font-sans text-slate-600">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 flex flex-col">
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu /></button>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Settings className="text-indigo-600" /> ตั้งค่าบริการ (Services)
            </h1>
          </div>
          <button 
            onClick={() => openServiceModal()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-700 flex items-center gap-2 font-bold"
          >
            <Plus size={18} /> เพิ่มบริการใหม่
          </button>
        </header>

        <div className="p-8 max-w-4xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm uppercase tracking-wider">
                <tr>
                  <th className="p-6 font-semibold">ชื่อบริการ</th>
                  <th className="p-6 font-semibold">ราคา</th>
                  <th className="p-6 font-semibold">เวลา</th>
                  <th className="p-6 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="p-6 font-bold text-slate-700">{s.name}</td>
                    <td className="p-6 text-indigo-600 font-bold">฿{s.price}</td>
                    <td className="p-6 text-slate-500">{s.duration} นาที</td>
                    <td className="p-6 text-right flex justify-end gap-2">
                      
                      {/* ปุ่มผูกสูตร */}
                      <button onClick={() => openRecipeModal(s)} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition" title="ผูกสูตรตัดสต็อก">
                        <Link size={18} />
                      </button>
                      
                      <button onClick={() => openServiceModal(s)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDeleteService(s.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal 1: เพิ่ม/แก้ไข บริการ (เหมือนเดิม) */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
             {/* ... (Form เดิม) ... */}
             <h3 className="font-bold text-lg mb-4">{editingService ? '✏️ แก้ไขบริการ' : '✨ เพิ่มบริการ'}</h3>
             <input className="w-full border px-4 py-2 rounded mb-3" placeholder="ชื่อ" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} />
             <input className="w-full border px-4 py-2 rounded mb-3" type="number" placeholder="ราคา" value={formData.price} onChange={e=>setFormData({...formData, price:e.target.value})} />
             <input className="w-full border px-4 py-2 rounded mb-3" type="number" placeholder="เวลา (นาที)" value={formData.duration} onChange={e=>setFormData({...formData, duration:e.target.value})} />
             <div className="flex gap-2">
               <button onClick={() => setIsServiceModalOpen(false)} className="flex-1 py-2 border rounded">ยกเลิก</button>
               <button onClick={handleSaveService} className="flex-1 py-2 bg-indigo-600 text-white rounded">บันทึก</button>
             </div>
          </div>
        </div>
      )}

      {/* Modal 2: ผูกสูตร (Recipes) */}
      {isRecipeModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b bg-orange-50 flex justify-between items-center">
               <h3 className="font-bold text-orange-800 flex items-center gap-2"><Package size={20}/> ตัดสต็อกอัตโนมัติ</h3>
               <button onClick={() => setIsRecipeModalOpen(false)}><X/></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
               <p className="text-sm text-slate-500 mb-4">เมื่อจบงาน <b>"{editingService?.name}"</b> จะตัดสต็อกดังนี้:</p>
               
               {/* List รายการที่ผูกไว้ */}
               <div className="space-y-2 mb-6">
                 {currentRecipes.length === 0 ? <p className="text-center text-slate-300 py-4">ยังไม่ได้ผูกสูตร</p> : 
                   currentRecipes.map((r, i) => (
                     <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="font-bold text-slate-700">{r.inventory?.name}</span>
                        <div className="flex items-center gap-3">
                           <span className="text-sm text-red-500 font-bold">-{r.quantity_used} {r.inventory?.unit}</span>
                           <button onClick={() => handleDeleteRecipe(r.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                     </div>
                   ))
                 }
               </div>

               {/* Form เพิ่มสูตร */}
               <div className="bg-slate-100 p-4 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">เพิ่มการตัดสต็อก</p>
                  <div className="flex gap-2">
                     <select 
                       className="flex-1 border rounded-lg px-3 py-2 text-sm"
                       value={newRecipe.inventory_id}
                       onChange={e => setNewRecipe({...newRecipe, inventory_id: e.target.value})}
                     >
                        <option value="">-- เลือกสินค้า --</option>
                        {inventory.map(item => (
                          <option key={item.id} value={item.id}>{item.name} (หน่วย: {item.unit})</option>
                        ))}
                     </select>
                     <input 
                       type="number" className="w-20 border rounded-lg px-3 py-2 text-sm text-center" placeholder="1"
                       value={newRecipe.quantity}
                       onChange={e => setNewRecipe({...newRecipe, quantity: e.target.value})}
                     />
                     <button onClick={handleAddRecipe} className="bg-orange-500 text-white p-2 rounded-lg hover:bg-orange-600"><Plus/></button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}