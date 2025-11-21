'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import Sidebar from '@/components/Sidebar';
import { Menu, Search, Printer, FileText, Filter, X, Eye } from 'lucide-react';

// Import ตัวโชว์ PDF
import { PDFViewer } from '@react-pdf/renderer';
import { ReceiptDoc } from '@/components/ReceiptPDF';

export default function ReceiptsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับเก็บใบเสร็จที่กำลังดูอยู่ (เพื่อเปิด Modal)
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const fetchReceipts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('*, services(name, price)')
      .eq('status', 'done')
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false });
    
    if (data) setReceipts(data);
    setLoading(false);
  };

  useEffect(() => { fetchReceipts(); }, []);

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] font-sans text-slate-600">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 flex flex-col">
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu /></button>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-indigo-600" /> ประวัติใบเสร็จ
            </h1>
          </div>
          <div className="bg-slate-100 px-4 py-2 rounded-lg flex items-center gap-2 w-64">
             <Search size={18} className="text-slate-400" />
             <input type="text" placeholder="ค้นหาลูกค้า..." className="bg-transparent outline-none text-sm w-full" />
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm uppercase tracking-wider">
                <tr>
                  <th className="p-6 font-semibold">วันที่ / เวลา</th>
                  <th className="p-6 font-semibold">ลูกค้า</th>
                  <th className="p-6 font-semibold">บริการ</th>
                  <th className="p-6 font-semibold text-right">ยอดสุทธิ</th>
                  <th className="p-6 font-semibold text-center">ดูไฟล์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {receipts.map((item) => {
                  const price = item.services?.price || 0;
                  const discount = item.discount || 0;
                  const final = price - discount;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-6">
                        <div className="font-bold text-slate-700">
                            {new Date(item.booking_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </div>
                        <div className="text-xs text-slate-400">{item.start_time.slice(0,5)} น.</div>
                      </td>
                      <td className="p-6 font-medium text-slate-700">{item.customer_name}</td>
                      <td className="p-6 text-sm">
                        {item.services?.name}
                        {discount > 0 && <span className="text-red-400 ml-1">(-฿{discount})</span>}
                      </td>
                      <td className="p-6 text-right font-bold text-slate-800">฿{final.toLocaleString()}</td>
                      <td className="p-6 text-center">
                        {/* ปุ่มกดดู PDF */}
                        <button 
                          onClick={() => setSelectedReceipt(item)}
                          className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition" 
                          title="ดูใบเสร็จ"
                        >
                          <Eye size={20} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* --- MODAL แสดง PDF --- */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">📄 ตัวอย่างใบเสร็จ</h3>
              <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-red-500 transition">
                <X size={24} />
              </button>
            </div>

            {/* PDF Viewer Area */}
            <div className="flex-1 bg-slate-200">
              <PDFViewer width="100%" height="100%" className="border-none">
                 <ReceiptDoc item={selectedReceipt} />
              </PDFViewer>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}