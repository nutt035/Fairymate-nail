'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Clock, Save, Search, Tag } from 'lucide-react';
import { supabase } from '@/utils/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  services: any[];
  onSave: (bookingData: any) => Promise<void>;
}

export default function BookingModal({ isOpen, onClose, services, onSave }: Props) {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    service_id: '',
    booking_date: new Date().toISOString().split('T')[0],
    start_time: '15:30',
    discount: 0,
    duration_adj: 0,
    quantity: 1, // ✅ เพิ่มตัวนี้ (ค่าเริ่มต้น 1)
  });

  // --- Data State ---
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]); // เก็บโปรโมชั่น
  const [selectedPromoId, setSelectedPromoId] = useState<string>(''); // เก็บ ID โปรที่เลือก

  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // โหลดข้อมูล (ลูกค้า + โปรโมชั่น)
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        // 1. ลูกค้า
        const { data: custData } = await supabase.from('customers').select('id, name, phone');
        if (custData) setCustomers(custData);

        // 2. โปรโมชั่น (เอาเฉพาะที่เปิด active)
        const { data: promoData } = await supabase.from('promotions').select('*').eq('is_active', true);
        if (promoData) setPromotions(promoData);
      };
      loadData();
    }
  }, [isOpen]);

  // --- Search Logic ---
  const handleNameChange = (e: any) => {
    const value = e.target?.value || formData.customer_name;
    setFormData({ ...formData, customer_name: value });

    if (customers.length > 0) {
      if (!value) {
        setFilteredCustomers(customers.slice(0, 10));
      } else {
        const filtered = customers.filter(c => 
          c.name.toLowerCase().includes(value.toLowerCase()) || 
          (c.phone && c.phone.includes(value))
        );
        setFilteredCustomers(filtered);
      }
      setShowSuggestions(true);
    }
  };

  const selectCustomer = (customer: any) => {
    setFormData({ ...formData, customer_name: customer.name, customer_phone: customer.phone || '' });
    setShowSuggestions(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Promotion Logic (คำนวณส่วนลดอัตโนมัติ) ---
  const handlePromoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const promoId = e.target.value;
    setSelectedPromoId(promoId);

    if (!promoId) {
      setFormData({ ...formData, discount: 0 }); // ถ้าไม่เลือกโปร ก็เคลียร์ส่วนลด
      return;
    }

    const promo = promotions.find(p => p.id.toString() === promoId);
    if (!promo || !formData.service_id) return;

    // หาธาคาบริการ
    const service = services.find(s => s.id.toString() === formData.service_id);
    const basePrice = service?.price || 0;

    // คำนวณ
    let discountVal = 0;
    if (promo.discount_type === 'percent') {
      discountVal = Math.floor(basePrice * (promo.value / 100)); // ลด %
    } else {
      discountVal = promo.value; // ลดเป็นบาท
    }

    setFormData(prev => ({ ...prev, discount: discountVal }));
  };

  // ถ้าเปลี่ยนบริการ ก็ต้องคำนวณโปรใหม่ (เผื่อเป็น %)
  useEffect(() => {
    if (selectedPromoId) {
      // Trigger การคำนวณใหม่แบบ manual
      const event = { target: { value: selectedPromoId } } as any;
      handlePromoChange(event);
    }
  }, [formData.service_id]);


  // Time Slots
  const timeSlots = [];
  let startMin = 15 * 60 + 30; 
  const endMin = 22 * 60;      
  while (startMin <= endMin) {
    const h = Math.floor(startMin / 60);
    const m = startMin % 60;
    timeSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    startMin += 30;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData);
    setLoading(false);
    setFormData({ ...formData, customer_name: '', customer_phone: '', discount: 0 });
    setSelectedPromoId('');
  };

  // คำนวณเวลาเสร็จ (End Time) เพื่อโชว์ให้เห็นภาพ
const calculateEndTime = () => {
  if (!formData.start_time || !formData.service_id) return '-';

  const service = services.find(s => s.id.toString() === formData.service_id);
  const baseDuration = service?.duration || 60; // ค่าเดิม 60 นาที
  const adjust = Number(formData.duration_adj) || 0;
  const totalDuration = baseDuration + adjust;

  const [h, m] = formData.start_time.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(h, m + totalDuration); // บวกเวลาเพิ่มเข้าไป

  // จัดรูปแบบ HH:MM
  const endH = startDate.getHours().toString().padStart(2, '0');
  const endM = startDate.getMinutes().toString().padStart(2, '0');
  return `${endH}:${endM}`;
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock className="text-indigo-600" size={20} /> ลงคิวใหม่
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          
          {/* Search Customer */}
          <div className="relative" ref={searchRef}>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1">ชื่อลูกค้า</label>
            <div className="relative">
              <input 
                type="text" required 
                className="w-full px-4 py-2 pl-10 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="พิมพ์เพื่อค้นหา..."
                value={formData.customer_name}
                onChange={handleNameChange}
                onFocus={handleNameChange}
                autoComplete="off"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            </div>
            {showSuggestions && filteredCustomers.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto">
                {filteredCustomers.map((c) => (
                  <div key={c.id} onClick={() => selectCustomer(c)} className="px-4 py-3 hover:bg-indigo-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0">
                    <span className="text-sm font-bold text-slate-700">{c.name}</span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{c.phone}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1">เบอร์โทร</label>
            <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.customer_phone} onChange={e => setFormData({...formData, customer_phone: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1">วันที่</label>
              <input type="date" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.booking_date} onChange={e => setFormData({...formData, booking_date: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1">เวลา</label>
              <select required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})}>
                {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1">บริการ</label>
            <select required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              value={formData.service_id} onChange={e => setFormData({...formData, service_id: e.target.value})}>
              <option value="">-- เลือกบริการ --</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} (฿{s.price})</option>
              ))}
            </select>
          </div>

          {/* ✅ เพิ่มช่องจำนวน (Quantity) ตรงนี้ */}
          <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 mt-2">
             <label className="text-xs font-bold text-indigo-600 uppercase mb-1 block">จำนวน (ครั้ง/นิ้ว)</label>
             <div className="flex items-center gap-3">
                <button type="button" onClick={() => setFormData(prev => ({...prev, quantity: Math.max(1, prev.quantity - 1)}))} className="w-8 h-8 bg-white rounded border font-bold">-</button>
                <input 
                  type="number" 
                  className="flex-1 text-center bg-transparent font-bold text-lg outline-none" 
                  value={formData.quantity}
                  onChange={e => setFormData({...formData, quantity: Math.max(1, Number(e.target.value))})}
                />
                <button type="button" onClick={() => setFormData(prev => ({...prev, quantity: prev.quantity + 1}))} className="w-8 h-8 bg-white rounded border font-bold">+</button>
             </div>
             <p className="text-xs text-slate-400 text-center mt-1">ใช้สำหรับบริการที่คิดราคาต่อนิ้ว</p>
          </div>

          {/* --- Promotion Section --- */}
          <div className="bg-pink-50 p-3 rounded-xl border border-pink-100">
             <label className="text-xs font-bold text-pink-600 uppercase mb-1 flex items-center gap-1">
                <Tag size={14} /> โปรโมชั่น
             </label>
             <select 
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-pink-300"
                value={selectedPromoId}
                onChange={handlePromoChange}
             >
                <option value="">-- ไม่ใช้โปรโมชั่น --</option>
                {promotions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.discount_type === 'percent' ? `-${p.value}%` : `-฿${p.value}`})
                  </option>
                ))}
             </select>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">ส่วนลดสุทธิ (บาท)</label>
                <input type="number" className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="0"
                  value={formData.discount} onChange={e => setFormData({...formData, discount: Number(e.target.value)})} />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">ปรับเวลา (นาที)</label>
                <input type="number" className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="0"
                  value={formData.duration_adj} onChange={e => setFormData({...formData, duration_adj: Number(e.target.value)})} />
              </div>

            <div className="col-span-2 text-right text-xs text-slate-500 mt-1">
               จะเสร็จเวลาประมาณ: <span className="font-bold text-indigo-600 text-sm">{calculateEndTime()} น.</span>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 flex justify-center items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95">
            <Save size={18} /> {loading ? 'กำลังบันทึก...' : 'ยืนยันการจอง'}
          </button>
        </form>
      </div>
    </div>
  );
}
