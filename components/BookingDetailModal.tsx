'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Trash2, Ban, Save, AlertTriangle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onUpdate: (id: number, updates: any) => void;
  onDelete: (id: number) => void;
}

export default function BookingDetailModal({ isOpen, onClose, booking, onUpdate, onDelete }: ModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (booking) {
      setDate(booking.booking_date);
      setTime(booking.start_time);
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const isCancelled = booking.status === 'cancelled';
  const isDone = booking.status === 'done';
  const isLocked = isCancelled || isDone; // ล็อกถ้าเสร็จหรือยกเลิกแล้ว

  const handleReschedule = async () => {
    if (isLocked) return;
    setLoading(true);
    await onUpdate(booking.id, { booking_date: date, start_time: time });
    setLoading(false);
    onClose();
  };

  const handleCancel = async () => {
    if (isLocked) return;
    if(!confirm('ยืนยันยกเลิกคิวนี้?')) return;
    await onUpdate(booking.id, { status: 'cancelled' });
    onClose();
  };

  const handleDelete = async () => {
    if(!confirm('⚠️ ยืนยันลบถาวร? (กู้คืนไม่ได้)')) return;
    await onDelete(booking.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">📝 จัดการคิว</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* สถานะแจ้งเตือน */}
          {isCancelled && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl flex items-center gap-2 font-bold justify-center">
              <Ban size={20} /> คิวนี้ถูกยกเลิกแล้ว
            </div>
          )}
          {isDone && (
            <div className="bg-green-50 border border-green-100 text-green-600 p-3 rounded-xl flex items-center gap-2 font-bold justify-center">
              <CheckCircle size={20} /> คิวนี้เสร็จสิ้นแล้ว
            </div>
          )}

          {/* ข้อมูลลูกค้า */}
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <p className="text-xs text-slate-500 uppercase font-bold">ลูกค้า</p>
            <p className="text-lg font-bold text-slate-800">{booking.customer_name}</p>
            <p className="text-sm text-slate-500">{booking.customer_phone || '-'}</p>
            
            <div className="mt-3 pt-3 border-t border-indigo-100 flex justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">บริการ</p>
                <p className="text-sm font-semibold text-indigo-700">{booking.services?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase font-bold">ราคา</p>
                <p className="text-sm font-semibold text-indigo-700">฿{booking.final_price || booking.services?.price}</p>
              </div>
            </div>
          </div>

          {/* โซนแก้ไขเวลา */}
          <div className={`space-y-3 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Clock size={16} /> เลื่อนวัน/เวลา
            </p>
            <div className="grid grid-cols-2 gap-4">
              <input type="date" className="input-field border px-3 py-2 rounded-lg" value={date} onChange={(e) => setDate(e.target.value)} />
              <input type="time" className="input-field border px-3 py-2 rounded-lg" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <button onClick={handleReschedule} disabled={loading} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">
              บันทึกการเปลี่ยนแปลง
            </button>
          </div>

          <hr className="border-slate-100" />

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleCancel}
              disabled={isLocked} // ล็อกปุ่มถ้ายกเลิกไปแล้ว
              className={`py-2 px-4 border rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition
                ${isLocked ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100'}
              `}
            >
              <Ban size={16} /> ยกเลิกคิว
            </button>
            <button 
              onClick={handleDelete}
              className="py-2 px-4 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-bold hover:bg-red-100 transition flex justify-center items-center gap-2"
            >
              <Trash2 size={16} /> ลบถาวร
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { CheckCircle } from 'lucide-react';