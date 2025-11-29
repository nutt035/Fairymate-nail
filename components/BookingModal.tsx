'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Clock, Save, Search, DollarSign, Hourglass } from 'lucide-react';
import { supabase } from '@/utils/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bookingData: any) => Promise<void>;
}

export default function BookingModal({ isOpen, onClose, onSave }: Props) {
  const [loading, setLoading] = useState(false);
  
  // State ของฟอร์ม (เน้นกรอกเอง)
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    facebook: '',
    booking_date: new Date().toISOString().split('T')[0],
    start_time: '15:30', // เวลาเริ่ม (พิมพ์แก้ได้)
    duration_minutes: 60, // ระยะเวลาทำ (นาที)
    manual_service: '',   // ชื่อบริการ (พิมพ์เอง)
    price: '',            // ราคา (พิมพ์เอง)
  });

  // ระบบค้นหาลูกค้า (เหมือนเดิม เพราะสะดวกดี)
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

  // 🕒 ฟังก์ชันคำนวณเวลาเสร็จ (Start + Duration)
  const calculateEndTime = () => {
    if (!formData.start_time) return '-';
    const [h, m] = formData.start_time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + Number(formData.duration_minutes));
    
    const endH = date.getHours().toString().padStart(2, '0');
    const endM = date.getMinutes().toString().padStart(2, '0');
    return `${endH}:${endM}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData); // ส่งข้อมูลไปบันทึก
    setLoading(false);
    // Reset Form
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
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock className="text-indigo-600" size={20} /> ลงคิวด่วน (Fast Mode)
          </h3>
          <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          
          {/* 1. ชื่อลูกค้า */}
          <div className="relative">
            <label className="text-xs font-bold text-slate-500 uppercase">ลูกค้า</label>
            <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="พิมพ์ชื่อ..." value={formData.customer_name} onChange={handleNameChange} required />
            {showSuggestions && filteredCustomers.length > 0 && (
              <div className="absolute z-10 w-full bg-white border shadow-xl max-h-40 overflow-y-auto mt-1 rounded-lg">
                {filteredCustomers.map(c => (
                  <div key={c.id} onClick={() => selectCustomer(c)} className="px-4 py-2 hover:bg-indigo-50 cursor-pointer border-b">
                    {c.name} <span className="text-xs text-gray-400">{c.phone}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div><label className="text-xs font-bold text-slate-500">เบอร์โทร</label><input type="text" className="w-full px-4 py-2 border rounded-lg" value={formData.customer_phone} onChange={e=>setFormData({...formData, customer_phone:e.target.value})}/></div>
             <div><label className="text-xs font-bold text-slate-500">Facebook</label><input type="text" className="w-full px-4 py-2 border rounded-lg" value={formData.facebook} onChange={e=>setFormData({...formData, facebook:e.target.value})}/></div>
          </div>

          <hr />

          {/* 2. วันและเวลา (ไฮไลท์สำคัญ) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">วันที่</label>
              <input
                type="date"
                className="
                  w-full px-4 py-2 border rounded-lg
                  h-[45px]
                  appearance-none
                  box-border
                  focus:outline-none
                "
                value={formData.booking_date}
                onChange={e => setFormData({...formData, booking_date: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">เริ่มกี่โมง</label>
              <input
                type="time"
                className="
                  w-full px-4 py-2 border rounded-lg
                  h-[45px]
                  appearance-none
                  box-border
                  bg-indigo-50 font-bold text-indigo-700
                  focus:outline-none
                "
                value={formData.start_time}
                onChange={e => setFormData({...formData, start_time: e.target.value})}
                required
              />
            </div>
          </div>

          {/* ระยะเวลา (คำนวณเวลาจบ) */}
          <div className="bg-slate-100 p-3 rounded-xl flex items-center justify-between">
             <div className="flex items-center gap-2">
                <Hourglass size={18} className="text-slate-400"/>
                <div>
                   <label className="text-xs font-bold text-slate-500 block">ทำกี่นาที?</label>
                   <input type="number" className="w-20 bg-white border px-2 py-1 rounded text-center font-bold" 
                     value={formData.duration_minutes} onChange={e=>setFormData({...formData, duration_minutes:Number(e.target.value)})} />
                </div>
             </div>
             <div className="text-right">
                <p className="text-xs text-slate-400">เสร็จเวลา (โดยประมาณ)</p>
                <p className="text-xl font-bold text-green-600">{calculateEndTime()} น.</p>
             </div>
          </div>

          {/* 3. บริการและราคา (กรอกเองล้วนๆ) */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">ทำอะไรบ้าง?</label>
            <input type="text" className="w-full px-4 py-2 border rounded-lg"
              placeholder="เช่น ทาสีเจลมือ + ต่อ PVC"
              value={formData.manual_service} onChange={e => setFormData({...formData, manual_service: e.target.value})} required />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">ราคา (บาท)</label>
            <div className="relative">
               <DollarSign size={16} className="absolute left-3 top-3 text-slate-400"/>
               <input type="number" className="w-full px-4 py-2 pl-9 border rounded-lg font-bold text-lg"
                 placeholder="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 flex justify-center items-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 transition-all">
            <Save size={18} /> {loading ? 'บันทึก...' : 'ลงคิวทันที'}
          </button>
        </form>
      </div>
    </div>
  );
}
