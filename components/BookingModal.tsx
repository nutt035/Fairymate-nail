'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Save, Hourglass, DollarSign } from 'lucide-react';
import { supabase } from '@/utils/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bookingData: any) => Promise<void>;
}

export default function BookingModal({ isOpen, onClose, onSave }: Props) {
  const [loading, setLoading] = useState(false);
  
  // State ของฟอร์ม
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    facebook: '',
    booking_date: new Date().toISOString().split('T')[0],
    start_time: '15:30',
    duration_minutes: 60,
    manual_service: '',
    price: '',
  });

  // ระบบค้นหาลูกค้า
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      const loadCust = async () => {
        const { data } = await supabase.from('customers').select('id, name, phone, facebook');
        if (data) setCustomers(data);
      };
      loadCust();
    }
  }, [isOpen]);

  const handleNameChange = (e: any) => {
    const val = e.target.value;
    setFormData({ ...formData, customer_name: val });
    if (val) {
      const filtered = customers.filter(c => c.name.toLowerCase().includes(val.toLowerCase()));
      setFilteredCustomers(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectCustomer = (c: any) => {
    setFormData({ ...formData, customer_name: c.name, customer_phone: c.phone || '', facebook: c.facebook || '' });
    setShowSuggestions(false);
  };

  const calculateEndTime = () => {
    if (!formData.start_time) return '-';
    const [h, m] = formData.start_time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + Number(formData.duration_minutes));
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData);
    setLoading(false);
    setFormData({ 
      customer_name: '', customer_phone: '', facebook: '',
      booking_date: new Date().toISOString().split('T')[0],
      start_time: '15:30', duration_minutes: 60, 
      manual_service: '', price: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      {/* ✅ ปรับ max-w-lg ให้กว้างขึ้นสำหรับ iPad */}
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock className="text-indigo-600" size={20} /> ลงคิวด่วน (Fast Mode)
          </h3>
          <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          
          {/* ชื่อลูกค้า */}
          <div className="relative">
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">ชื่อลูกค้า</label>
            <input type="text" className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-base"
              placeholder="พิมพ์ชื่อ..." value={formData.customer_name} onChange={handleNameChange} required />
            
            {showSuggestions && filteredCustomers.length > 0 && (
              <div className="absolute z-10 w-full bg-white border shadow-xl max-h-40 overflow-y-auto mt-1 rounded-lg">
                {filteredCustomers.map(c => (
                  <div key={c.id} onClick={() => selectCustomer(c)} className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b text-sm">
                    <span className="font-bold text-slate-700">{c.name}</span> <span className="text-slate-400 ml-2">{c.phone}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* เบอร์ + Facebook (เรียงซ้อนบนมือถือ, แนวนอนบนไอแพด) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
               <label className="text-xs font-bold text-slate-500 mb-1 block">เบอร์โทร</label>
               <input type="text" className="w-full px-4 py-2 border rounded-xl outline-none" value={formData.customer_phone} onChange={e=>setFormData({...formData, customer_phone:e.target.value})}/>
             </div>
             <div>
               <label className="text-xs font-bold text-slate-500 mb-1 block">Facebook</label>
               <input type="text" className="w-full px-4 py-2 border rounded-xl outline-none" value={formData.facebook} onChange={e=>setFormData({...formData, facebook:e.target.value})}/>
             </div>
          </div>

          <hr className="border-slate-100 my-2" />

          {/* วัน + เวลา */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">วันที่</label>
              <input type="date" className="w-full px-4 py-2 border rounded-xl outline-none"
                value={formData.booking_date} onChange={e => setFormData({...formData, booking_date: e.target.value})} required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">เริ่มกี่โมง</label>
              <input type="time" className="w-full px-4 py-2 border rounded-xl bg-indigo-50 font-bold text-indigo-700 outline-none"
                value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} required />
            </div>
          </div>

          {/* คำนวณเวลา */}
          <div className="bg-slate-100 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg text-slate-400"><Hourglass size={20}/></div>
                <div>
                   <label className="text-xs font-bold text-slate-500 block mb-1">ทำกี่นาที?</label>
                   <input type="number" className="w-24 bg-white border px-3 py-1 rounded-lg text-center font-bold outline-none" 
                     value={formData.duration_minutes} onChange={e=>setFormData({...formData, duration_minutes:Number(e.target.value)})} />
                </div>
             </div>
             <div className="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-0 border-slate-200">
                <p className="text-xs text-slate-400">เสร็จเวลา (โดยประมาณ)</p>
                <p className="text-2xl font-bold text-green-600 leading-none mt-1">{calculateEndTime()} น.</p>
             </div>
          </div>

          {/* บริการ */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">ทำอะไรบ้าง?</label>
            <input type="text" className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-base"
              placeholder="เช่น ทาสีเจลมือ + ต่อ PVC"
              value={formData.manual_service} onChange={e => setFormData({...formData, manual_service: e.target.value})} required />
          </div>

          {/* ราคา */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">ราคา (บาท)</label>
            <div className="relative">
               <DollarSign size={18} className="absolute left-3 top-3.5 text-slate-400"/>
               <input type="number" className="w-full px-4 py-3 pl-10 border rounded-xl font-bold text-xl outline-none"
                 placeholder="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 flex justify-center items-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 transition-all mt-4">
            <Save size={20} /> {loading ? 'กำลังบันทึก...' : 'ลงคิวทันที'}
          </button>
        </form>
      </div>
    </div>
  );
}
