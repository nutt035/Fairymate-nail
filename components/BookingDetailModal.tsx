'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, Ban, Facebook, Phone, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '@/utils/supabase';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onUpdate: (id: number, updates: any) => void;
  onDelete: (id: number) => void;
}

export default function BookingDetailModal({ isOpen, onClose, booking, onUpdate, onDelete }: ModalProps) {

  const [formData, setFormData] = useState({
    booking_date: '',
    start_time: '',
    duration: '',
    end_time: '',
    manual_service: '',
    price: ''
  });

  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);   // เตือนคิวชน

  // คำนวณเวลาเสร็จอัตโนมัติ
  function calculateEndTime(start: string, minutes: number) {
    if (!start || !minutes) return '';
    const [h, m] = start.split(':').map(Number);
    const total = h * 60 + m + minutes;

    const endH = Math.floor(total / 60) % 24;
    const endM = total % 60;

    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  }

  // โหลด booking เดิม
  useEffect(() => {
    if (booking) {

      setFormData({
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        duration: booking.duration || '',
        end_time: booking.end_time || '',
        manual_service: booking.manual_service || booking.services?.name || '',
        price: booking.final_price || ''
      });

      const fetchCustomerInfo = async () => {
        const { data } = await supabase
          .from('customers')
          .select('facebook, phone')
          .or(`name.eq.${booking.customer_name},phone.eq.${booking.customer_phone}`)
          .maybeSingle();
        
        if (data) setCustomerInfo(data);
      };

      fetchCustomerInfo();
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const isLocked = booking.status === 'done' || booking.status === 'cancelled';


  // ตรวจคิวชน
  async function checkOverlap(date: string, start: string, end: string) {
    if (!date || !start || !end) return setOverlapWarning(null);

    const { data } = await supabase
      .from("bookings")
      .select("id, start_time, end_time")
      .eq("booking_date", date)
      .neq("id", booking.id);     // ไม่เทียบกับตัวเอง

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

  // คำนวณเวลาเสร็จ + เช็คคิวชน
  useEffect(() => {
    const calculated = calculateEndTime(formData.start_time, Number(formData.duration));
    setFormData(f => ({ ...f, end_time: calculated }));

    checkOverlap(formData.booking_date, formData.start_time, calculated);
  }, [formData.start_time, formData.duration, formData.booking_date]);


  // บันทึก
  const handleSave = async () => {
    if (overlapWarning) return; // กันบันทึกถ้าชน

    await onUpdate(booking.id, {
      booking_date: formData.booking_date,
      start_time: formData.start_time,
      duration: Number(formData.duration),
      end_time: formData.end_time,
      manual_service: formData.manual_service,
      final_price: Number(formData.price)
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="text-lg font-bold">📝 แก้ไขคิว</h3>
          <button onClick={onClose}><X className="text-slate-400" /></button>
        </div>

        <div className="p-6 space-y-4">

          {/* ข้อมูลลูกค้า */}
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-start">
            <div>
              <p className="text-lg font-bold text-slate-800">{booking.customer_name}</p>
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                <Phone size={14} /> {booking.customer_phone || customerInfo?.phone || '-'}
              </div>
            </div>

            {customerInfo?.facebook && (
              <a
                href={`https://www.facebook.com/search/top?q=${encodeURIComponent(customerInfo.facebook)}`}
                target="_blank"
                className="bg-white text-blue-600 px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1"
              >
                <Facebook size={14} /> ทักแชท
              </a>
            )}
          </div>

          {/* ฟอร์ม */}
          <div className={`space-y-3 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>

            {/* บริการ */}
            <div>
              <label className="text-xs font-bold text-slate-500">บริการ</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded-lg"
                value={formData.manual_service}
                onChange={e => setFormData({ ...formData, manual_service: e.target.value })}
              />
            </div>

            {/* วันที่ + เวลาเริ่ม */}
            <div className="grid grid-cols-2 gap-3">

              <div>
                <label className="text-xs font-bold text-slate-500">วันที่</label>
                <input
                  type="date"
                  className="w-full border px-3 py-2 rounded-lg h-[45px] appearance-none box-border"
                  value={formData.booking_date}
                  onChange={e => setFormData({ ...formData, booking_date: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500">เวลาเริ่ม</label>
                <input
                  type="time"
                  className="w-full border px-3 py-2 rounded-lg h-[45px] appearance-none box-border bg-indigo-50 font-bold text-indigo-700"
                  value={formData.start_time}
                  onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>

            </div>

            {/* ระยะเวลา */}
            <div>
              <label className="text-xs font-bold text-slate-500">ใช้เวลา (นาที)</label>
              <input
                type="number"
                className="w-full border px-3 py-2 rounded-lg"
                placeholder="เช่น 90"
                value={formData.duration}
                onChange={e => setFormData({ ...formData, duration: e.target.value })}
              />
            </div>

            {/* เวลาเสร็จ */}
            <div>
              <label className="text-xs font-bold text-slate-500">เวลาสิ้นสุด</label>
              <input
                type="time"
                disabled
                className="w-full border px-3 py-2 rounded-lg bg-slate-100 font-bold text-slate-700 h-[45px]"
                value={formData.end_time}
              />
            </div>

            {/* คิวซ้อน */}
            {overlapWarning && (
              <div className="p-3 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm flex gap-2">
                <AlertTriangle size={18} /> {overlapWarning}
              </div>
            )}

            {/* ราคา */}
            <div>
              <label className="text-xs font-bold text-slate-500">ราคา</label>
              <input
                type="number"
                className="w-full border px-3 py-2 rounded-lg font-bold text-lg"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
              />
            </div>

            {/* ปุ่มบันทึก */}
            <button
              disabled={!!overlapWarning}
              onClick={handleSave}
              className={`w-full py-2 rounded-lg font-bold flex justify-center gap-2 
                ${overlapWarning ? "bg-slate-400" : "bg-indigo-600"} text-white`}
            >
              <Save size={18} /> บันทึกการแก้ไข
            </button>

          </div>

          <hr className="border-slate-100" />

          {/* ปุ่มล่าง */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { if (confirm('ยกเลิกคิว?')) onUpdate(booking.id, { status: 'cancelled' }); onClose(); }}
              className="py-2 border rounded-lg text-sm font-bold text-orange-600"
            >
              <Ban size={16} className="inline mr-1" /> ยกเลิก
            </button>

            <button
              onClick={() => onDelete(booking.id)}
              className="py-2 border rounded-lg text-sm font-bold text-red-600 hover:bg-red-50"
            >
              <Trash2 size={16} className="inline mr-1" /> ลบถาวร
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
