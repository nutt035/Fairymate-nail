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
    duration: 60,
    end_time: '',
    manual_service: '',
    price: ''
  });

  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

  // -------------------------
  // ฟังก์ชันคำนวณเวลาเสร็จปลอดภัย
  // -------------------------
  function calculateEndTime(start: string | undefined, minutes: number | undefined) {
    if (!start || !minutes) return "";

    if (typeof start !== "string" || !start.includes(":"))
      return "";

    const [h, m] = start.split(":").map(Number);
    const totalMin = h * 60 + m + minutes;

    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;

    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }

  // -------------------------
  // โหลดข้อมูล booking เดิม
  // -------------------------
  useEffect(() => {
    if (!booking) return;

    setFormData({
      booking_date: booking.booking_date || "",
      start_time: booking.start_time ? booking.start_time.slice(0, 5) : "",
      duration: booking.duration || 60,
      end_time: booking.end_time || "",
      manual_service: booking.manual_service || booking.services?.name || '',
      price: booking.final_price || ''
    });

    // ดึงข้อมูลลูกค้า
    const fetchCustomerInfo = async () => {
      const { data } = await supabase
        .from('customers')
        .select('facebook, phone')
        .or(`name.eq.${booking.customer_name},phone.eq.${booking.customer_phone}`)
        .maybeSingle();

      if (data) setCustomerInfo(data);
    };

    fetchCustomerInfo();
  }, [booking]);


  // -------------------------
  // ฟังก์ชันตรวจคิวซ้อน
  // -------------------------
  async function checkOverlap(date: string, start: string, end: string) {
    if (!date || !start || !end) {
      setOverlapWarning(null);
      return;
    }

    const { data } = await supabase
      .from("bookings")
      .select("id, start_time, end_time")
      .eq("booking_date", date)
      .neq("id", booking.id);

    if (!data) {
      setOverlapWarning(null);
      return;
    }

    const toMinutes = (t: string | null) => {
      if (!t || !t.includes(":")) return null;
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const startMin = toMinutes(start);
    const endMin = toMinutes(end);

    if (startMin == null || endMin == null) return;

    for (let b of data) {
      const bs = toMinutes(b.start_time);
      const be = toMinutes(b.end_time);
      if (bs == null || be == null) continue;

      if (startMin < be && endMin > bs) {
        setOverlapWarning(`ช่วงเวลานี้ทับกับคิว #${b.id}`);
        return;
      }
    }

    setOverlapWarning(null);
  }


  // -------------------------
  // คำนวณเวลาเสร็จ + เช็คคิวซ้อน
  // -------------------------
  useEffect(() => {
    if (!formData.start_time || !formData.duration) return;

    const newEnd = calculateEndTime(formData.start_time, Number(formData.duration));

    setFormData(f => ({ ...f, end_time: newEnd }));

    checkOverlap(formData.booking_date, formData.start_time, newEnd);
  }, [formData.start_time, formData.duration, formData.booking_date]);


  // -------------------------
  // บันทึกข้อมูล
  // -------------------------
  const handleSave = async () => {
    if (overlapWarning) return;

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

  if (!isOpen || !booking) return null;

  const isLocked = booking.status === 'done' || booking.status === 'cancelled';


  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
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
                className="bg-white px-3 py-1.5 rounded-lg border text-xs font-bold text-blue-600 flex items-center gap-1"
              >
                <Facebook size={14} /> ทักแชท
              </a>
            )}
          </div>

          {/* ฟอร์ม */}
          <div className={`space-y-3 ${isLocked ? "opacity-50 pointer-events-none" : ""}`}>

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
                value={formData.duration}
                onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })}
              />
            </div>

            {/* เวลาเสร็จ */}
            <div>
              <label className="text-xs font-bold text-slate-500">เวลาสิ้นสุด</label>
              <input
                type="time"
                disabled
                className="w-full border px-3 py-2 rounded-xl bg-slate-100 font-bold text-slate-700 h-[45px]"
                value={formData.end_time}
              />
            </div>

            {/* แจ้งเตือนคิวซ้อน */}
            {overlapWarning && (
              <div className="p-3 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm flex items-center gap-2">
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
              className={`w-full py-2 rounded-lg font-bold text-white flex justify-center gap-2 
                ${overlapWarning ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"}
              `}
            >
              <Save size={18} /> บันทึกการแก้ไข
            </button>

          </div>

          <hr />

          {/* ปุ่มล่าง */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { if (confirm("ยกเลิกคิว?")) onUpdate(booking.id, { status: "cancelled" }); onClose(); }}
              className="py-2 border rounded-lg font-bold text-sm text-orange-600"
            >
              <Ban size={16} className="inline mr-1" /> ยกเลิก
            </button>

            <button
              onClick={() => onDelete(booking.id)}
              className="py-2 border rounded-lg font-bold text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 size={16} className="inline mr-1" /> ลบถาวร
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
