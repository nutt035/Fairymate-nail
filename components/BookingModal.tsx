'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Save, Search, DollarSign, Hourglass, AlertTriangle } from 'lucide-react';
import { supabase } from '@/utils/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bookingData: any) => Promise<void>;
}

export default function BookingModal({ isOpen, onClose, onSave }: Props) {
  const [loading, setLoading] = useState(false);

  // State
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

  // ระบบค้นหาลูกค้า (เดิม)
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ระบบกันคิวซ้อน
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

  // โหลดข้อมูลลูกค้า
  useEffect(() => {
    if (isOpen) {
      const loadCust = async () => {
        const { data } = await supabase.from('customers').select('id, name, phone, facebook');
        if (data) setCustomers(data);
      };
      loadCust();
      setOverlapWarning(null); // รีเซ็ตเตือนคิวซ้อน
    }
  }, [isOpen]);

  // คำนวณเวลาเสร็จ
  const calculateEndTime = () => {
    if (!formData.start_time) return '-';
    const [h, m] = formData.start_time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + Number(formData.duration_minutes));

    const endH = date.getHours().toString().padStart(2, '0');
    const endM = date.getMinutes().toString().padStart(2, '0');
    return `${endH}:${endM}`;
  };

  // ตรวจคิวซ้อน
  async function checkOverlap() {
    const date = formData.booking_date;
    const start = formData.start_time;
    const end = calculateEndTime();

    if (!date || !start || !end) return setOverlapWarning(null);

    const { data } = await supabase
      .from("bookings")
      .select("id, start_time, end_time")
      .eq("booking_date", date);

    if (!data) return setOverlapWarning(null);

    const toMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const startMin = toMinutes(start);
    const endMin = toMinutes(end);

    for (let b of data) {
      if (!b.start_time || !b.end_time) continue;

      const bs = toMinutes(b.start_time);
      const be = toMinutes(b.end_time);

      const overlap = startMin < be && endMin > bs;

      if (overlap) {
        setOverlapWarning(`ช่วงเวลานี้ทับกับคิวหมายเลข #${b.id}`);
        return;
      }
    }

    setOverlapWarning(null);
  }

  // ให้มันเช็คคิวซ้อนทุกครั้งที่เวลาเริ่ม/นาที/วันที่เปลี่ยน
  useEffect(() => {
    checkOverlap();
  }, [formData.start_time, formData.duration_minutes, formData.booking_date]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (overlapWarning) return;   // กันบันทึกถ้าคิวชน

    setLoading(true);
    await onSave({
      ...formData,
      end_time: calculateEndTime(),  // เพิ่มเวลาจบเข้า DB
    });
    setLoading(false);

    // reset
    setFormData({
      customer_name: '',
      customer_phone: '',
      facebook: '',
      booking_date: new Date().toISOString().split('T')[0],
      start_time: '15:30',
      duration_minutes: 60,
      manual_service: '',
      price: '',
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

          {/* ลูกค้า */}
          <div className="relative">
            <label className="text-xs font-bold text-slate-500 uppercase">ลูกค้า</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="พิมพ์ชื่อ..." 
              value={formData.customer_name} 
              onChange={handleNameChange} 
              required 
            />
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

          {/* เบอร์, FB */}
          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="text-xs font-bold text-slate-500">เบอร์โทร</label>
               <input type="text" className="w-full px-4 py-2 border rounded-lg"
                 value={formData.customer_phone} 
                 onChange={e=>setFormData({...formData, customer_phone:e.target.value})}/>
             </div>

             <div>
               <label className="text-xs font-bold text-slate-500">Facebook</label>
               <input type="text" className="w-full px-4 py-2 border rounded-lg"
                 value={formData.facebook} 
                 onChange={e=>setFormData({...formData, facebook:e.target.value})}/>
             </div>
          </div>

          <hr />

          {/* วัน-เวลา */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">วันที่</label>
              <input
                type="date"
                className="w-full px-4 py-2 border rounded-lg h-[45px] appearance-none box-border"
                value={formData.booking_date}
                onChange={e => setFormData({...formData, booking_date: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">เริ่มกี่โมง</label>
              <input
                type="time"
                className="w-full px-4 py-2 border rounded-lg h-[45px] appearance-none box-border bg-indigo-50 font-bold text-indigo-700"
                value={formData.start_time}
                onChange={e => setFormData({...formData, start_time: e.target.value})}
                required
              />
            </div>
          </div>

          {/* ระยะเวลาทำงาน */}
          <div className="bg-slate-100 p-3 rounded-xl flex items-center justify-between">
             <div className="flex items-center gap-2">
                <Hourglass size={18} className="text-slate-400"/>
                <div>
                   <label className="text-xs font-bold text-slate-500 block">ทำกี่นาที?</label>
                   <input 
                     type="number" 
                     className="w-20 bg-white border px-2 py-1 rounded text-center font-bold"
                     value={formData.duration_minutes}
                     onChange={e=>setFormData({...formData, duration_minutes:Number(e.target.value)})} 
                   />
                </div>
             </div>
             <div className="text-right">
                <p className="text-xs text-slate-400">เสร็จเวลา (อัตโนมัติ)</p>
                <p className="text-xl font-bold text-green-600">{calculateEndTime()} น.</p>
             </div>
          </div>

          {/* คิวซ้อนเตือน */}
          {overlapWarning && (
            <div className="p-3 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm flex gap-2">
              <AlertTriangle size={18} /> {overlapWarning}
            </div>
          )}

          {/* รายการบริการ */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">ทำอะไรบ้าง?</label>
            <input type="text" className="w-full px-4 py-2 border rounded-lg"
              placeholder="เช่น ทาสีเจลมือ + ต่อ PVC"
              value={formData.manual_service} 
              onChange={e => setFormData({...formData, manual_service: e.target.value})}
              required 
            />
          </div>

          {/* ราคา */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">ราคา</label>
            <div className="relative">
               <DollarSign size={16} className="absolute left-3 top-3 text-slate-400"/>
               <input 
                 type="number" 
                 className="w-full px-4 py-2 pl-9 border rounded-lg font-bold text-lg"
                 placeholder="0" 
                 value={formData.price} 
                 onChange={e => setFormData({...formData, price: e.target.value})} 
                 required 
               />
            </div>
          </div>

          {/* ปุ่ม */}
          <button 
            type="submit" 
            disabled={loading || !!overlapWarning}
            className={`w-full text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all flex justify-center items-center gap-2 
              ${overlapWarning ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"}
            `}
          >
            <Save size={18} /> {loading ? 'บันทึก...' : 'ลงคิวทันที'}
          </button>

        </form>
      </div>
    </div>
  );
}