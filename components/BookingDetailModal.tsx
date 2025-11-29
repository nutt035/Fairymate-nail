'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Trash2, Ban, Facebook, Phone, Save } from 'lucide-react';
import { supabase } from '@/utils/supabase';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onUpdate: (id: number, updates: any) => void;
  onDelete: (id: number) => void;
}

export default function BookingDetailModal({ isOpen, onClose, booking, onUpdate, onDelete }: ModalProps) {
  const [formData, setFormData] = useState({ booking_date: '', start_time: '', manual_service: '', price: '' });
  const [customerInfo, setCustomerInfo] = useState<any>(null);

  useEffect(() => {
    if (booking) {
      setFormData({
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        manual_service: booking.manual_service || booking.services?.name || '',
        price: booking.final_price || ''
      });
      
      const fetchCustomerInfo = async () => {
        const { data } = await supabase.from('customers').select('facebook, phone').or(`name.eq.${booking.customer_name},phone.eq.${booking.customer_phone}`).maybeSingle();
        if (data) setCustomerInfo(data);
      };
      fetchCustomerInfo();
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const isLocked = booking.status === 'done' || booking.status === 'cancelled';

  const handleSave = async () => {
    await onUpdate(booking.id, { 
      booking_date: formData.booking_date, 
      start_time: formData.start_time,
      manual_service: formData.manual_service,
      final_price: Number(formData.price)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      {/* ✅ ใช้ max-w-lg เพื่อความกว้างที่เหมาะสม */}
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">📝 แก้ไขคิว / รายละเอียด</h3>
          <button onClick={onClose}><X className="text-slate-400" /></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* ข้อมูลลูกค้า */}
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
               <p className="text-lg font-bold text-slate-800">{booking.customer_name}</p>
               <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                 <Phone size={14} /> {booking.customer_phone || customerInfo?.phone || '-'}
               </div>
            </div>
            {customerInfo?.facebook && (
              <a href={`https://www.facebook.com/search/top?q=${encodeURIComponent(customerInfo.facebook)}`} target="_blank" className="bg-white text-blue-600 px-4 py-2 rounded-lg border border-blue-100 text-sm font-bold flex items-center gap-2 hover:bg-blue-50 transition shadow-sm">
                <Facebook size={16} /> ทักแชท
              </a>
            )}
          </div>

          {/* ฟอร์มแก้ไข */}
          <div className={`space-y-4 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            
            {/* บริการ (แก้ได้) */}
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">บริการ</label>
              <input type="text" className="w-full border px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                value={formData.manual_service} onChange={e=>setFormData({...formData, manual_service:e.target.value})} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                 <label className="text-xs font-bold text-slate-500 mb-1 block">วันที่</label>
                 <input type="date" className="w-full border px-4 py-2 rounded-xl outline-none" 
                   value={formData.booking_date} onChange={e=>setFormData({...formData, booking_date:e.target.value})} />
               </div>
               <div>
                 <label className="text-xs font-bold text-slate-500 mb-1 block">เวลา</label>
                 <input type="time" className="w-full border px-4 py-2 rounded-xl outline-none font-bold" 
                   value={formData.start_time} onChange={e=>setFormData({...formData, start_time:e.target.value})} />
               </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">ราคา</label>
              <input type="number" className="w-full border px-4 py-2 rounded-xl font-bold text-lg outline-none text-green-600" 
                value={formData.price} onChange={e=>setFormData({...formData, price:e.target.value})} />
            </div>
            
            <button onClick={handleSave} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex justify-center gap-2 hover:bg-indigo-700 transition shadow-md">
              <Save size={18}/> บันทึกการแก้ไข
            </button>
          </div>

          <hr className="border-slate-100" />
          
          {/* ปุ่มยกเลิก/ลบ */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={()=>{if(confirm('ยกเลิกคิว?')) onUpdate(booking.id, {status:'cancelled'}); onClose();}} className="py-3 border rounded-xl text-sm font-bold text-orange-600 hover:bg-orange-50 transition">
              <Ban size={16} className="inline mr-1"/> ยกเลิกคิว
            </button>
            <button onClick={()=>onDelete(booking.id)} className="py-3 border rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition">
              <Trash2 size={16} className="inline mr-1"/> ลบถาวร
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
