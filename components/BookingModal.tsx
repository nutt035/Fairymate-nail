'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Save, Hourglass, DollarSign, Calendar, User, Phone, Facebook } from 'lucide-react';
import { supabase } from '@/utils/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bookingData: any) => Promise<void>;
}

export default function BookingModal({ isOpen, onClose, onSave }: Props) {
  const [loading, setLoading] = useState(false);
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
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      {/* ✅ แก้ไข 1: ขยายความกว้างเป็น max-w-2xl (สำหรับ iPad/Com) 
         และใส่ w-full mx-auto เพื่อให้เต็มความกว้างในมือถือ 
      */}
      <div className="bg-white w-full md:max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Clock className="text-indigo-600" size={24} /> ลงคิวด่วน
            </h3>
            <p className="text-xs text-slate-400 mt-1">กรอกข้อมูลเพื่อจองคิวใหม่ (Fast Mode)</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition"><X className="text-slate-400 hover:text-slate-600" size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto">
          
          {/* ส่วนที่ 1: ข้อมูลลูกค้า */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <User size={16}/> ข้อมูลลูกค้า
            </h4>
            
            {/* ชื่อลูกค้า */}
            <div className="relative">
              <input type="text" className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-lg font-medium transition-all"
                placeholder="พิมพ์ชื่อลูกค้า..." value={formData.customer_name} onChange={handleNameChange} required />
              
              {showSuggestions && filteredCustomers.length > 0 && (
                <div className="absolute z-20 w-full bg-white border shadow-xl max-h-48 overflow-y-auto mt-2 rounded-xl">
                  {filteredCustomers.map(c => (
                    <div key={c.id} onClick={() => selectCustomer(c)} className="px-5 py-3 hover:bg-indigo-50 cursor-pointer border-b last:border-0 border-slate-50 flex justify-between items-center">
                      <span className="font-bold text-slate-700">{c.name}</span> <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{c.phone}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* เบอร์ + Facebook (แก้ให้เป็น grid-cols-1 บนมือถือ เพื่อไม่ให้เบียด) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
               <div className="relative">
                 <Phone size={18} className="absolute left-4 top-4 text-slate-400"/>
                 <input type="text" className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500" 
                   placeholder="เบอร์โทรศัพท์" value={formData.customer_phone} onChange={e=>setFormData({...formData, customer_phone:e.target.value})}/>
               </div>
               <div className="relative">
                 <Facebook size={18} className="absolute left-4 top-4 text-slate-400"/>
                 <input type="text" className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500" 
                   placeholder="Facebook / Line" value={formData.facebook} onChange={e=>setFormData({...formData, facebook:e.target.value})}/>
               </div>
            </div>
          </div>

          <div className="border-t border-slate-100 my-2"></div>

          {/* ส่วนที่ 2: วันและเวลา */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Calendar size={16}/> วันและเวลา
            </h4>
            
            {/* วันที่ + เวลาเริ่ม */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block ml-1">วันที่จอง</label>
                <input type="date" className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                  value={formData.booking_date} onChange={e => setFormData({...formData, booking_date: e.target.value})} required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block ml-1">เริ่มทำกี่โมง</label>
                <input type="time" className="w-full px-4 py-3 border border-indigo-200 bg-indigo-50/50 text-indigo-700 font-bold rounded-xl outline-none focus:border-indigo-500"
                  value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} required />
              </div>
            </div>

            {/* ระยะเวลา (Card ใหญ่ขึ้น) */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100"><Hourglass size={24}/></div>
                  <div>
                     <label className="text-sm font-bold text-slate-700 block mb-1">ใช้เวลาทำกี่นาที?</label>
                     <div className="flex items-center gap-2">
                       <button type="button" onClick={() => setFormData(p => ({...p, duration_minutes: Math.max(30, p.duration_minutes - 30)}))} className="w-8 h-8 rounded-lg bg-white border hover:bg-slate-50 text-slate-500 font-bold">-</button>
                       <input type="number" className="w-20 bg-white border px-2 py-1.5 rounded-lg text-center font-bold text-lg outline-none" 
                         value={formData.duration_minutes} onChange={e=>setFormData({...formData, duration_minutes:Number(e.target.value)})} />
                       <button type="button" onClick={() => setFormData(p => ({...p, duration_minutes: p.duration_minutes + 30}))} className="w-8 h-8 rounded-lg bg-white border hover:bg-slate-50 text-slate-500 font-bold">+</button>
                       <span className="text-sm text-slate-500">นาที</span>
                     </div>
                  </div>
               </div>
               <div className="text-left md:text-right pt-3 md:pt-0 border-t md:border-0 border-slate-200">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">เสร็จเวลา (โดยประมาณ)</p>
                  <p className="text-3xl font-black text-green-600 mt-1 leading-none">{calculateEndTime()} <span className="text-sm font-normal text-green-500">น.</span></p>
               </div>
            </div>
          </div>

          <div className="border-t border-slate-100 my-2"></div>

          {/* ส่วนที่ 3: บริการและราคา */}
          <div className="space-y-4">
             {/* บริการ */}
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block ml-1">รายละเอียดบริการ</label>
                <input type="text" className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-base"
                  placeholder="เช่น ทาสีเจลมือ + ต่อ PVC..."
                  value={formData.manual_service} onChange={e => setFormData({...formData, manual_service: e.target.value})} required />
             </div>

             {/* ราคา */}
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block ml-1">ราคา (บาท)</label>
                <div className="relative">
                   <DollarSign size={20} className="absolute left-5 top-4 text-slate-400"/>
                   <input type="number" className="w-full px-5 py-3 pl-12 border border-slate-200 rounded-2xl font-bold text-2xl outline-none text-slate-800 placeholder-slate-300 focus:border-indigo-500"
                     placeholder="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
                </div>
             </div>
          </div>

          {/* ปุ่มบันทึก */}
          <div className="pt-2">
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 flex justify-center items-center gap-3 shadow-lg shadow-indigo-200 active:scale-95 transition-all">
              <Save size={22} /> {loading ? 'กำลังบันทึก...' : 'บันทึกการจอง'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
