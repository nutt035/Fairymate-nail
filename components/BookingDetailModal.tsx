'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, Ban, Facebook, Phone, Save } from 'lucide-react';
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
    end_time: '',
    manual_service: '',
    price: ''
  });

  const [customerInfo, setCustomerInfo] = useState<any>(null);

  useEffect(() => {
    if (booking) {
      setFormData({
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time || "",     // ถ้ายังไม่มีเวลาจบ จะเป็นค่าว่างได้
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

  const handleSave = async () => {
    await onUpdate(booking.id, {
      booking_date: formData.booking_date,
      start_time: formData.start_time,
      end_time: formData.end_time,          // บันทึกเวลาจบที่ผู้ใช้กรอกเอง
      manual_service: formData.manual_service,
      final_price: Number(formData.price)
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">

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

          {/* ฟอร์มแก้ไข */}
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

            {/* วันที่ + เวลาเริ่ม + เวลาสิ้นสุด */}
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

            {/* เวลาเสร็จ */}
            <div>
              <label className="text-xs font-bold text-slate-500">เวลาสิ้นสุด</label>
              <input
                type="time"
                className="w-full border px-3 py-2 rounded-lg h-[45px] appearance-none box-border bg-indigo-50 font-bold text-indigo-700"
                value={formData.end_time}
                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>

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
              onClick={handleSave}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold flex justify-center gap-2"
            >
              <Save size={18} /> บันทึกการแก้ไข
            </button>
          </div>

          <hr className="border-slate-100" />

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
