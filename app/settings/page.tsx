'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import Sidebar from '@/components/Sidebar';
import { Menu, Settings, Plus, Trash2, Edit2, Link, Package, X } from 'lucide-react';

export default function SettingsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', price: '', duration: '60' });
  const [currentRecipes, setCurrentRecipes] = useState<any[]>([]);
  const [newRecipe, setNewRecipe] = useState({ inventory_id: '', quantity: '1' });

  const fetchData = async () => {
    const { data: s } = await supabase.from('services').select('*').order('id');
    if(s) setServices(s);
    const { data: i } = await supabase.from('inventory').select('*').order('name');
    if(i) setInventory(i);
  };
  useEffect(() => { fetchData(); }, []);

  // ... (Logic Functions เดิม: openServiceModal, handleSaveService, handleDeleteService, openRecipeModal, handleAddRecipe, handleDeleteRecipe) ...
  // เพื่อความสั้น ผมขอละ Logic เดิมไว้ ให้ใช้ของเดิมได้เลยครับ
  // (ถ้าต้องการ Logic เต็มบอกได้ครับ แต่เน้นแก้ UI)
  
  const openServiceModal = (s:any=null) => { setEditingService(s); setFormData(s ? {name:s.name, price:s.price, duration:s.duration} : {name:'', price:'', duration:'60'}); setIsServiceModalOpen(true); };
  const handleSaveService = async () => { const p = {name:formData.name, price:Number(formData.price), duration:Number(formData.duration)}; editingService ? await supabase.from('services').update(p).eq('id',editingService.id) : await supabase.from('services').insert([p]); setIsServiceModalOpen(false); fetchData(); };
  const handleDeleteService = async (id:number) => { if(confirm('ลบ?')) await supabase.from('services').delete().eq('id',id); fetchData(); };
  const openRecipeModal = async (s:any) => { setEditingService(s); const {data} = await supabase.from('service_recipes').select('*, inventory(name, unit)').eq('service_id',s.id); if(data) setCurrentRecipes(data); setIsRecipeModalOpen(true); };
  const handleAddRecipe = async () => { if(!newRecipe.inventory_id) return; await supabase.from('service_recipes').insert([{service_id:editingService.id, inventory_id:Number(newRecipe.inventory_id), quantity_used:Number(newRecipe.quantity)}]); openRecipeModal(editingService); };
  const handleDeleteRecipe = async (rid:number) => { await supabase.from('service_recipes').delete().eq('id',rid); openRecipeModal(editingService); };


  return (
    <div className="flex min-h-screen bg-[#F1F5F9] font-sans text-slate-600">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 flex flex-col w-full">
        <header className="h-20 bg-white border-b border-slate-200 px-4 lg:px-8 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu /></button>
            <h1 className="text-lg lg:text-xl font-bold text-slate-800 flex items-center gap-2"><Settings className="text-indigo-600" /> ตั้งค่าบริการ</h1>
          </div>
          <button onClick={() => openServiceModal()} className="bg-indigo-600 text-white px-3 py-2 rounded-lg shadow-md hover:bg-indigo-700 flex items-center gap-2 font-bold text-sm"><Plus size={18} /> <span className="hidden sm:inline">เพิ่มบริการ</span></button>
        </header>

        <div className="p-4 lg:p-8 max-w-4xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* ✅ แก้ Overflow */}
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-slate-50 border-b text-slate-500 text-sm uppercase"><tr><th className="p-4 lg:p-6">บริการ</th><th className="p-4 lg:p-6">ราคา</th><th className="p-4 lg:p-6">เวลา</th><th className="p-4 lg:p-6 text-right">จัดการ</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {services.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-4 lg:p-6 font-bold text-slate-700">{s.name}</td>
                      <td className="p-4 lg:p-6 text-indigo-600 font-bold">฿{s.price}</td>
                      <td className="p-4 lg:p-6 text-slate-500">{s.duration} นาที</td>
                      <td className="p-4 lg:p-6 text-right flex justify-end gap-2">
                        <button onClick={() => openRecipeModal(s)} className="p-2 border rounded hover:bg-orange-50 text-slate-400"><Link size={18} /></button>
                        <button onClick={() => openServiceModal(s)} className="p-2 border rounded hover:bg-indigo-50 text-slate-400"><Edit2 size={18} /></button>
                        <button onClick={() => handleDeleteService(s.id)} className="p-2 border rounded hover:bg-red-50 text-slate-400"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Modal ต่างๆ (UI เดิมแต่แก้ Responsive นิดหน่อย) */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
             <h3 className="font-bold text-lg mb-4">{editingService ? '✏️ แก้ไข' : '✨ เพิ่มบริการ'}</h3>
             <input className="w-full border px-3 py-2 rounded mb-3" placeholder="ชื่อ" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} />
             <div className="flex gap-3 mb-3">
                <input className="w-full border px-3 py-2 rounded" type="number" placeholder="ราคา" value={formData.price} onChange={e=>setFormData({...formData, price:e.target.value})} />
                <input className="w-full border px-3 py-2 rounded" type="number" placeholder="นาที" value={formData.duration} onChange={e=>setFormData({...formData, duration:e.target.value})} />
             </div>
             <div className="flex gap-2"><button onClick={() => setIsServiceModalOpen(false)} className="flex-1 py-2 border rounded">ยกเลิก</button><button onClick={handleSaveService} className="flex-1 py-2 bg-indigo-600 text-white rounded font-bold">บันทึก</button></div>
          </div>
        </div>
      )}
      
      {/* Recipe Modal */}
      {isRecipeModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b bg-orange-50 flex justify-between items-center"><h3 className="font-bold text-orange-800 flex items-center gap-2"><Package size={20}/> ตัดสต็อก</h3><button onClick={() => setIsRecipeModalOpen(false)}><X/></button></div>
            <div className="p-6 overflow-y-auto">
               <div className="space-y-2 mb-6">{currentRecipes.map((r, i) => (<div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100"><span className="font-bold text-slate-700 text-sm">{r.inventory?.name}</span><div className="flex items-center gap-3"><span className="text-sm text-red-500 font-bold">-{r.quantity_used} {r.inventory?.unit}</span><button onClick={() => handleDeleteRecipe(r.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></div></div>))}</div>
               <div className="bg-slate-100 p-4 rounded-xl"><p className="text-xs font-bold text-slate-400 uppercase mb-2">เพิ่มรายการ</p><div className="flex gap-2"><select className="flex-1 border rounded-lg px-2 py-2 text-sm w-full" value={newRecipe.inventory_id} onChange={e => setNewRecipe({...newRecipe, inventory_id: e.target.value})}><option value="">-- เลือก --</option>{inventory.map(i => (<option key={i.id} value={i.id}>{i.name}</option>))}</select><input type="number" className="w-16 border rounded-lg px-2 py-2 text-sm text-center" value={newRecipe.quantity} onChange={e => setNewRecipe({...newRecipe, quantity: e.target.value})}/><button onClick={handleAddRecipe} className="bg-orange-500 text-white p-2 rounded-lg"><Plus/></button></div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}