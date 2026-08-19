"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Send,
  Loader2,
  CalendarDays,
  CheckCircle,
  X,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { format, isToday, parseISO, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isSameDay, isSameMonth, isThisMonth } from 'date-fns';
import { th } from 'date-fns/locale';

// --- Helpers: อ่าน service name / note จาก bookings (note เป็น JSON หรือ plain text ได้) ---
const parseNote = (b: any): any => {
  try {
    const n = JSON.parse(b.note || '');
    return n && typeof n === 'object' && !Array.isArray(n) ? n : null;
  } catch {
    return null;
  }
};
const getServiceName = (b: any) => b.services?.name || parseNote(b)?.services?.[0]?.name || '';
const getNoteText = (b: any) => {
  const n = parseNote(b);
  return n ? (n.customerNote || '') : (b.note || '');
};
// คำนวณเวลาจบ: start_time + (duration ของบริการ + duration_adjusted)
const getEndTime = (b: any): string => {
  const base = b.services?.duration_minutes || 0;
  const total = Number(base) + Number(b.duration_adjusted || 0);
  if (!total) return String(b.start_time || '').slice(0, 5);
  const [h, m] = String(b.start_time).slice(0, 5).split(':').map(Number);
  const d = new Date();
  d.setHours(h, m + total, 0, 0);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// --- Types ---
interface Booking {
  id: number;
  customer_name: string; // เลขคิว (01, 02...) หรือชื่อจริงจากหน้าจอง
  booking_date: string;
  start_time: string;
  duration_adjusted?: number;
  discount?: number;
  final_price: number;
  note?: string;
  status: 'pending' | 'confirmed' | 'done' | 'cancelled';
  services?: { name?: string; duration_minutes?: number } | null;
}

export default function QueueManagement() {
  const [queues, setQueues] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Input & UI States
  const [inputText, setInputText] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Month Navigation State
  const [viewMonth, setViewMonth] = useState(new Date());

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQueue, setEditingQueue] = useState<Booking | null>(null);

  // Ref for scrolling
  const listRef = useRef<HTMLDivElement>(null);

  // --- Fetch Data (จาก bookings — เดือนที่เลือก) ---
  const fetchQueues = async () => {
    try {
      const startDate = format(startOfMonth(viewMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(viewMonth), 'yyyy-MM-dd');
      const isCurrentMonth = isThisMonth(viewMonth);

      const { data, error } = await supabase
        .from('bookings')
        .select('*, services(name, duration_minutes)')
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)
        .neq('status', 'cancelled')
        .order('booking_date')
        .order('start_time');

      if (error) {
        console.error('Error fetching bookings:', error);
        setQueues([]);
        return;
      }

      // เดือนปัจจุบัน: ซ่อนคิวที่จบงานแล้ว / เดือนก่อนๆ: แสดงทั้งหมดเป็น History
      const filteredData = (data || []).filter((q: any) => {
        if (!isCurrentMonth) return true;
        return q.status !== 'done';
      });

      setQueues(filteredData);
    } catch (err) {
      console.error('Error fetching queues:', err);
      setQueues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, [viewMonth]); // Re-fetch when month changes

  // --- Scroll to Date (Handle DateCarousel Click) ---
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    const element = document.getElementById(`date-section-${dateStr}`);

    if (element && listRef.current) {
      const topPos = element.offsetTop - 10;
      listRef.current.scrollTo({
        top: topPos,
        behavior: 'smooth'
      });
    }
  };

  // --- Magic Parser (V.6 - Auto Queue, Flexible Price/Note, Auto Deposit Note) ---
  const handleMagicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    let text = inputText.trim();
    const now = new Date();
    let targetDate = format(now, 'yyyy-MM-dd');
    let startTime = '';
    let endTime = '';
    let price = 0;
    let deposit = 0;

    let serviceName = 'บริการทั่วไป';
    let note = '';
    let processText = text;

    // 1. หา Date (DD/MM/YY หรือ DD/MM/YYYY)
    const thaiDateRegex = /^(\d{1,2})[/\.](\d{1,2})[/\.](\d{2,4})\s+/;
    const dateMatch = processText.match(thaiDateRegex);
    if (dateMatch) {
      let day = parseInt(dateMatch[1]);
      let month = parseInt(dateMatch[2]);
      let year = parseInt(dateMatch[3]);

      // แปลงปี พ.ศ. เป็น ค.ศ.
      if (year > 2300) {
        year -= 543;
      } else if (year < 100) {
        const fullBuddhistYear = 2500 + year;
        year = fullBuddhistYear - 543;
      }

      const parsedDate = new Date(year, month - 1, day);
      if (isNaN(parsedDate.getTime())) {
        targetDate = format(now, 'yyyy-MM-dd'); // Fallback to today
      } else {
        targetDate = format(parsedDate, 'yyyy-MM-dd');
      }

      processText = processText.replace(thaiDateRegex, '');
    }

    // 2. หา Time (HH:MM-HH:MM) หรือ (HH:MM)
    const timeRangeRegex = /(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})/;
    const singleTimeRegex = /(\d{1,2}[:.]\d{2})/;
    let timeMatch = processText.match(timeRangeRegex);

    if (timeMatch) {
      startTime = timeMatch[1].replace('.', ':').padStart(5, '0');
      endTime = timeMatch[2].replace('.', ':').padStart(5, '0');
      processText = processText.replace(timeRangeRegex, '').trim();
    } else {
      timeMatch = processText.match(singleTimeRegex);
      if (timeMatch) {
        startTime = timeMatch[1].replace('.', ':').padStart(5, '0');
        const [h, m] = startTime.split(':').map(Number);
        const endD = new Date();
        endD.setHours(h + 1, m);
        endTime = `${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}`;
        processText = processText.replace(singleTimeRegex, '').trim();
      }
    }

    // 3. Extract Price & Deposit (Flexible location)
    const depositRegex = /(มัดจำ|มัดจำ\s+)(\d{2,4})/i;
    const priceRegex = /(\d{3,4})/;

    const depositMatch = processText.match(depositRegex);
    if (depositMatch) {
      deposit = parseInt(depositMatch[2]);
      processText = processText.replace(depositRegex, '').trim();
    }

    const priceMatch = processText.match(priceRegex);
    if (priceMatch) {
      price = parseInt(priceMatch[1]);
      processText = processText.replace(priceRegex, '').trim();
    }

    // 4. แยก Service Name และ Note
    const parts = processText.split(/\s+/).filter(p => p.length > 0);
    if (parts.length > 0) {
      serviceName = parts[0];
      note = parts.slice(1).join(' ');
    }

    // 5. Auto Generate Note (มัดจำ)
    if (deposit > 0 && price > 0) {
      const remaining = price - deposit;
      note = `หักมัดจำแล้ว ${formatCurrency(deposit)} เหลือจ่าย ${formatCurrency(remaining)}. ${note}`.trim();
    } else if (deposit > 0 && price === 0) {
      note = `รับมัดจำแล้ว ${formatCurrency(deposit)}. (ยังไม่ระบุราคารวม). ${note}`.trim();
    }

    serviceName = serviceName.trim() || 'บริการทั่วไป';
    note = note.trim();

    // 6. Calculate Queue Number (NEW LOGIC)
    let customerName = 'ลูกค้าทั่วไป';

    if (startTime) {
      // 1. Get all existing bookings for the targetDate (ที่ยังไม่จบ/ยกเลิก)
      const { data: existingQueues } = await supabase
        .from('bookings')
        .select('id')
        .eq('booking_date', targetDate)
        .neq('status', 'done')
        .neq('status', 'cancelled');

      // 2. Count them and add 1 for the new booking
      const queueCount = (existingQueues || []).length + 1;
      customerName = String(queueCount).padStart(2, '0');

      // 7. Save to bookings
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const durationMin = Math.max((eh * 60 + em) - (sh * 60 + sm), 0);

      const insertData = {
        customer_name: customerName, // <-- เลขคิวอัตโนมัติ
        booking_date: targetDate,
        start_time: startTime,
        duration_adjusted: durationMin, // ระยะเวลารวม (คิวจาก admin)
        final_price: price,
        discount: 0,
        // เก็บชื่อบริการ + โน้ต ใน note (JSON) — bookings ไม่มีคอลัมน์ service_name
        note: JSON.stringify({ services: [{ name: serviceName, price }], customerNote: note }),
        status: 'pending'
      };

      const { error: insertError } = await supabase
        .from('bookings')
        .insert([insertData]);

      if (!insertError) {
        setInputText('');
        fetchQueues();
      } else {
        console.error('Insert error:', insertError);
        alert("บันทึกไม่สำเร็จ: " + insertError.message);
      }
    } else {
      alert("กรุณาระบุเวลาด้วยครับ (เช่น 13:00)");
    }
  };

  // --- Actions ---
  const handleStatusChange = async (id: number, newStatus: string) => {
    // 1. อัปเดต status ของ booking
    await supabase.from('bookings').update({ status: newStatus }).eq('id', id);

    // 2. ถ้ากดจบงาน (done) ให้สร้าง Receipt อัตโนมัติ + แจ้งลูกค้า
    if (newStatus === 'done') {
      const booking = queues.find(q => q.id === id);
      if (booking) {
        const invNo = `INV-${Date.now().toString().slice(-6)}`;

        const newReceipt = {
          booking_id: booking.id,
          customer_name: booking.customer_name,
          service_name: getServiceName(booking),
          original_price: booking.final_price,
          discount: booking.discount || 0,
          final_price: booking.final_price,
          invoice_no: invNo
        };

        // ถ้าตาราง receipts ยังไม่มีคอลัมน์ booking_id → ตัดออกแล้วลองใหม่
        let row: Record<string, unknown> = { ...newReceipt };
        let result = await supabase.from('receipts').insert([row]);
        if (result.error && String(result.error.message).toLowerCase().includes('booking_id')) {
          delete row.booking_id;
          result = await supabase.from('receipts').insert([row]);
        }
        if (result.error) {
          console.error('Error creating receipt:', result.error);
        }

        // เก็บเลขใบเสร็จลง note ของ booking (หน้าใบเสร็จแมตช์ด้วย invoiceNo ได้ทันที)
        const prevNote = parseNote(booking) || {};
        await supabase.from('bookings').update({
          note: JSON.stringify({ ...prevNote, invoiceNo: invNo }),
        }).eq('id', booking.id);

        // แจ้งสถานะกลับลูกค้า (LINE/Messenger ถ้ามี line_user_id / messenger_psid)
        try {
          await fetch('/api/booking/notify-customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId: id, action: 'done' }),
          });
        } catch (err) {
          console.error('notify-customer failed:', err);
        }
      }
    }

    fetchQueues();
    setExpandedId(null);
  };

  const handleDelete = async (id: number) => {
    if (confirm('ลบคิวนี้?')) {
      await supabase.from('bookings').delete().eq('id', id);
      fetchQueues();
    }
  };

  const handleOpenEdit = (q: Booking) => {
    setEditingQueue(q);
    setIsEditModalOpen(true);
  };

  // --- Group Data ---
  const groupedQueues = queues.reduce((acc, queue) => {
    const d = queue.booking_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(queue);
    return acc;
  }, {} as Record<string, Booking[]>);

  // คำนวณยอดเงินของวันที่เลือก (รวมทั้งหมด)
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const totalSelectedDate = (groupedQueues[selectedDateStr] || []).reduce((sum, q) => sum + (q.final_price || 0), 0);

  // --- UI Components ---
  const EditModal = () => {
    // FIX: ใช้ Local State เพื่อไม่ให้ Re-render ขณะพิมพ์
    const [tempData, setTempData] = useState({
      customer_name: editingQueue?.customer_name || '',
      service_name: getServiceName(editingQueue || {}),
      note: getNoteText(editingQueue || {}),
      start_time: editingQueue?.start_time?.slice(0, 5) || '',
      end_time: getEndTime(editingQueue || {}),
      price: editingQueue?.final_price || 0,
    });

    // ตั้งค่าเริ่มต้นเมื่อ Modal ถูกเปิด
    useEffect(() => {
      if (editingQueue) {
        setTempData({
          customer_name: editingQueue.customer_name,
          service_name: getServiceName(editingQueue),
          note: getNoteText(editingQueue),
          start_time: editingQueue.start_time.slice(0, 5),
          end_time: getEndTime(editingQueue),
          price: editingQueue.final_price || 0,
        });
      }
    }, [editingQueue]);

    if (!editingQueue) return null;

    const handleSaveEdit = async () => {
      // คำนวณระยะเวลาใหม่จาก start/end
      const [sh, sm] = tempData.start_time.split(':').map(Number);
      const [eh, em] = tempData.end_time.split(':').map(Number);
      const durationMin = Math.max((eh * 60 + em) - (sh * 60 + sm), 0);

      // เก็บชื่อบริการ + โน้ต ไว้ใน note (JSON) — bookings ไม่มีคอลัมน์ service_name
      const prev = parseNote(editingQueue) || { services: [] };
      const savedNote = JSON.stringify({
        ...prev,
        services: prev.services?.[0]
          ? [{ ...prev.services[0], name: tempData.service_name, price: tempData.price }]
          : [{ name: tempData.service_name, price: tempData.price }],
        customerNote: tempData.note,
      });

      await supabase.from('bookings').update({
        customer_name: tempData.customer_name,
        start_time: tempData.start_time,
        duration_adjusted: durationMin,
        final_price: tempData.price,
        note: savedNote,
      }).eq('id', editingQueue.id);
      fetchQueues();
      setIsEditModalOpen(false);
    };

    const handleChange = (field: keyof typeof tempData, value: string | number) => {
      setTempData(prev => ({ ...prev, [field]: value }));
    };

    return (
      <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm w-full h-full">
        <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
          <h3 className="text-xl font-bold mb-4 text-slate-800">แก้ไขข้อมูล</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">เลขคิว (ลูกค้า)</label>
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 outline-none focus:ring-2 focus:ring-primary/30"
                value={tempData.customer_name}
                onChange={e => handleChange('customer_name', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">บริการ</label>
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 outline-none focus:ring-2 focus:ring-primary/30"
                value={tempData.service_name}
                onChange={e => handleChange('service_name', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">โน้ต</label>
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 outline-none focus:ring-2 focus:ring-primary/30"
                value={tempData.note}
                onChange={e => handleChange('note', e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-400 uppercase">เริ่ม</label>
                <input
                  type="time"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 text-center outline-none focus:ring-2 focus:ring-primary/30"
                  value={tempData.start_time}
                  onChange={e => handleChange('start_time', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-400 uppercase">จบ</label>
                <input
                  type="time"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 text-center outline-none focus:ring-2 focus:ring-primary/30"
                  value={tempData.end_time}
                  onChange={e => handleChange('end_time', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">ราคา</label>
              <input
                type="number"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 font-bold text-primary text-lg outline-none focus:ring-2 focus:ring-primary/30"
                value={tempData.price}
                onChange={e => handleChange('price', Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">ยกเลิก</button>
            <button
              onClick={handleSaveEdit}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20"
            >บันทึก</button>
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render ---
  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-[#F8F9FA] relative">

      {/* 1. Header + Month Navigation */}
      <div className="bg-white shadow-sm z-30 shrink-0 w-full">
        <div className="px-5 pt-4 pb-2 flex justify-between items-center border-b border-slate-50 bg-white">
          <div>
            <h1 className="text-sm font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wide">
              <CalendarDays className="text-primary" size={16} />
              ยอดรวม {format(selectedDate, 'd MMM', { locale: th })}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-slate-800 tracking-tighter leading-none drop-shadow-sm">
              {formatCurrency(totalSelectedDate)}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              (รวมทุกคิวในวันที่เลือก)
            </p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="py-2 px-4 w-full border-b border-slate-50">
          <div className="flex items-center justify-between gap-2">
            {/* Previous Month */}
            <button
              onClick={() => setViewMonth(subMonths(viewMonth, 1))}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Current Month Display */}
            <div className="flex-1 text-center">
              <h2 className="text-lg font-bold text-slate-800">
                {format(viewMonth, 'MMMM yyyy', { locale: th })}
              </h2>
              <p className="text-xs text-slate-400">
                {queues.length} คิว • รวม {formatCurrency(queues.reduce((sum, q) => sum + (q.final_price || 0), 0))}
              </p>
            </div>

            {/* Next Month */}
            <button
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <ChevronRight size={20} />
            </button>

            {/* Today Button */}
            <button
              onClick={() => {
                setViewMonth(new Date());
                setSelectedDate(new Date());
              }}
              className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors"
            >
              วันนี้
            </button>
          </div>
        </div>

        {/* Day Picker Carousel - Full Month (scroll to see more) */}
        <div className="py-2 px-3 max-w-6xl overflow-x-auto no-scrollbar">
          <div className="flex gap-3 pb-2" style={{ width: 'max-content' }}>
            {eachDayOfInterval({
              start: startOfMonth(viewMonth),
              end: endOfMonth(viewMonth)
            }).map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const hasQueues = queues.some(q => q.booking_date === dayStr);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDay = isToday(day);
              const dayQueuesCount = queues.filter(q => q.booking_date === dayStr).length;

              return (
                <button
                  key={dayStr}
                  onClick={() => {
                    setSelectedDate(day);
                    const element = document.getElementById(`date-section-${dayStr}`);
                    if (element && listRef.current) {
                      const topPos = element.offsetTop - 10;
                      listRef.current.scrollTo({
                        top: topPos,
                        behavior: 'smooth'
                      });
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[90px] h-[85px] rounded-xl border transition-all duration-200 shrink-0",
                    isSelected
                      ? "bg-primary border-primary text-white shadow-lg shadow-primary/30"
                      : isTodayDay
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : hasQueues
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-white border-slate-100 text-slate-400 hover:border-primary/30"
                  )}
                >
                  <span className={cn(
                    "text-xs font-medium uppercase",
                    isSelected ? "text-white/80" : ""
                  )}>
                    {format(day, 'EEE', { locale: th }).slice(0, 2)}
                  </span>
                  <span className={cn(
                    "text-2xl font-bold mt-0.5",
                    isSelected ? "text-white" : ""
                  )}>
                    {format(day, 'd')}
                  </span>
                  {hasQueues && (
                    <span className={cn(
                      "text-[10px] font-bold mt-1",
                      isSelected ? "text-white/80" : "text-emerald-600"
                    )}>
                      {dayQueuesCount} คิว
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Scrollable List Area */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-2 pb-32 space-y-4 w-full bg-[#F8F9FA]"
      >
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          Object.keys(groupedQueues).map((dateStr) => {
            const dateObj = parseISO(dateStr);
            let dateLabel = format(dateObj, 'EEEE d MMM', { locale: th });
            const isTodayDate = isToday(dateObj);

            return (
              <div key={dateStr} id={`date-section-${dateStr}`} className="w-full pt-2">
                {/* Date Heading */}
                <div className="flex items-center gap-2 mb-2 sticky top-0 bg-[#F8F9FA]/95 backdrop-blur-sm py-2 z-10 w-full">
                  <div className={cn("w-1.5 h-4 rounded-full", isTodayDate ? "bg-primary" : "bg-slate-300")}></div>
                  <h3 className={cn("text-sm font-bold uppercase", isTodayDate ? "text-primary" : "text-slate-500")}>
                    {dateLabel} {isTodayDate && "(วันนี้)"}
                  </h3>
                </div>

                {/* Queue Cards */}
                <div className="space-y-2.5 w-full">
                  {groupedQueues[dateStr].map((q) => (
                    <div
                      key={q.id}
                      onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                      className={cn(
                        "bg-white rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden transition-all duration-200 cursor-pointer w-full select-none",
                        q.status === 'done' ? "opacity-60 grayscale-[0.3]" : "active:scale-[0.98]",
                        expandedId === q.id ? "ring-2 ring-primary ring-offset-2" : ""
                      )}
                    >
                      <div className="p-3.5 flex gap-3 items-center">
                        {/* Time */}
                        <div className="flex flex-col items-center justify-center min-w-[50px] bg-slate-50 rounded-lg py-1.5 px-1 border border-slate-100">
                          <span className="font-black text-slate-700 text-sm leading-none">{q.start_time.slice(0, 5)}</span>
                          <span className="text-[10px] text-slate-400 font-medium mt-1 leading-none">{getEndTime(q)}</span>
                        </div>

                        {/* Info (แสดงเลขคิว + บริการ/โน้ต) */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className={cn("font-black text-slate-800 text-base truncate", q.status === 'done' && "line-through")}>
                              {q.customer_name} {/* <--- เลขคิว */}
                            </h4>
                            {q.status === 'done' && <CheckCircle size={14} className="text-green-500 shrink-0" />}
                          </div>
                          <div className="text-xs text-slate-500 truncate mt-0.5">{getServiceName(q)}</div> {/* <--- ชื่อบริการ */}
                          {getNoteText(q) && <div className="text-[10px] text-orange-500 truncate mt-0.5">Note: {getNoteText(q)}</div>} {/* <--- โน้ต */}
                        </div>

                        {/* Price */}
                        <div className="text-right shrink-0">
                          <div className="font-black text-primary text-lg leading-tight">฿{q.final_price}</div>
                          <div className="scale-90 origin-right">
                            <StatusBadge status={q.status} />
                          </div>
                        </div>
                      </div>

                      {/* Action Panel */}
                      {expandedId === q.id && (
                        <div className="bg-slate-50 p-2 flex justify-end gap-2 border-t border-slate-100">
                          <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(q); }}
                            className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm">
                            <Edit2 size={14} /> แก้ไข
                          </button>

                          <button onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }}
                            className="flex items-center gap-1 px-3 py-2 bg-white border border-red-100 rounded-lg text-xs font-bold text-red-500 shadow-sm">
                            <Trash2 size={14} /> ลบ
                          </button>

                          {q.status !== 'done' ? (
                            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(q.id, 'done'); }}
                              className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-lg text-xs font-bold shadow-md shadow-green-200 ml-auto">
                              <CheckCircle size={14} /> จบงาน
                            </button>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(q.id, 'pending'); }}
                              className="flex items-center gap-1 px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold ml-auto">
                              <X size={14} /> ยกเลิกจบ
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Input Bar (Magic Input) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 px-4 py-3 w-full max-w-[100vw]">
        <div className="max-w-md mx-auto w-full">
          <form onSubmit={handleMagicSubmit} className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder='เช่น 13/12/68 13:00-15:00 ต่อปกติ 339 มัดจำ 100'
                className="w-full bg-slate-100 text-slate-800 rounded-xl px-4 py-3 text-base focus:bg-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-primary text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 disabled:bg-slate-200 disabled:shadow-none transition-all active:scale-95 shrink-0"
            >
              <Send size={20} />
            </button>
          </form>
          <div className="text-[10px] text-center text-slate-400 mt-2 font-medium">
            รูปแบบ: <b>วันที่/เดือน/ปี เวลาเริ่ม-จบ รายการ ราคา [มัดจำ XX] [โน้ต]</b>
          </div>
        </div>
        <div className="h-1 md:hidden"></div>
      </div>

      {/* Edit Modal (พร้อม Local State Fix) */}
      {isEditModalOpen && <EditModal />}
    </div>
  );
}
