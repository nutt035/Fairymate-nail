'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import Sidebar from '@/components/Sidebar';
import { Menu, Settings, Plus, Trash2, Save, X, Edit2 } from 'lucide-react';

export default function SettingsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับ Modal (เพิ่ม/แก้ไข)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', price: '', duration: '60' });

  // ดึงข้อมูลบริการ
  const fetchServices = async () => {
    setLoading(true);
    const { data } = await supabase.from('services').select('*').order('id');
    if (data) setServices(data);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  // เปิด Modal (ถ้ามี service ส่งมา แปลว่าแก้ไข)
  const openModal = (service: any = null) => {
    setEditingService(service);
    if (service) {
      setFormData({ name: service.name, price: service.price, duration: service.duration });
    } else {
      setFormData({ name: '', price: '', duration: '60' });
    }
    setIsModalOpen(true);
  };

  // บันทึกข้อมูล (เพิ่ม หรือ แก้ไข)
  const handleSave = async () => {
    if (!formData.name || !formData.price) return alert('กรุณากรอกข้อมูลให้ครบ');

    const payload = {
      name: formData.name,
      price: Number(formData.price),
      duration: Number(formData.duration)
    };

    let error;
    if (editingService) {
      // แก้ไข
      const { error: updateError } = await supabase
        .from('services')
        .update(payload)
        .eq('id', editingService.id);
      error = updateError;
    } else {
      // เพิ่มใหม่
      const { error: insertError } = await supabase
        .from('services')
        .insert([payload]);
      error = insertError;
    }

    if (!error) {
      alert('✅ บันทึกเรียบร้อย');
      setIsModalOpen(false);
      fetchServices();
    } else {
      alert('❌ เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  // ลบรายการ
  const handleDelete = async (id: number) => {
    if (!confirm('⚠️ ยืนยันลบบริการนี้? (จะไม่สามารถเลือกในหน้าจองได้อีก)')) return;
    
    const { error } = await supabase.from('services').delete().eq('id', id);
    
    if (!error) {
      fetchServices();
    } else {
      alert('❌ ลบไม่ได้ (อาจมีการใช้งานในประวัติการจองแล้ว)');
    }
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
            onClick={() => openModal()}
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
                  <th className="p-6 font-semibold">ราคา (บาท)</th>
                  <th className="p-6 font-semibold">เวลา (นาที)</th>
                  <th className="p-6 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="p-6 font-bold text-slate-700">{s.name}</td>
                    <td className="p-6 text-indigo-600 font-bold">฿{s.price.toLocaleString()}</td>
                    <td className="p-6 text-slate-500">{s.duration} นาที</td>
                    <td className="p-6 text-right flex justify-end gap-2">
                      <button onClick={() => openModal(s)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
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

      {/* Modal เพิ่ม/แก้ไข */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">{editingService ? '✏️ แก้ไขบริการ' : '✨ เพิ่มบริการใหม่'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ชื่อบริการ</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="เช่น ทาสีเจลมือ"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ราคา (บาท)</label>
                   <input 
                     type="number" 
                     className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                     value={formData.price}
                     onChange={(e) => setFormData({...formData, price: e.target.value})}
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">เวลา (นาที)</label>
                   <input 
                     type="number" 
                     className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                     value={formData.duration}
                     onChange={(e) => setFormData({...formData, duration: e.target.value})}
                   />
                </div>
              </div>
              <button onClick={handleSave} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex justify-center items-center gap-2 mt-2">
                <Save size={18} /> บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}