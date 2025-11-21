'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import Sidebar from '@/components/Sidebar';
import { Menu, Search, Bell, Plus, Package, AlertTriangle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

export default function StockPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูลสต็อก
  const fetchStock = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .order('quantity', { ascending: true }); // เรียงจากของน้อยไปมาก (จะได้เห็นของหมดก่อน)
    
    if (data) setItems(data);
    setLoading(false);
  };

  useEffect(() => { fetchStock(); }, []);

  // ฟังก์ชันปรับสต็อก (+ เพิ่ม / - ลด)
  const updateStock = async (id: number, currentQty: number, change: number) => {
    const newQty = currentQty + change;
    if (newQty < 0) return; // กันติดลบ

    // 1. อัปเดตใน Database
    const { error } = await supabase
      .from('inventory')
      .update({ quantity: newQty })
      .eq('id', id);

    // 2. อัปเดตหน้าจอทันที (ไม่ต้องรอโหลดใหม่)
    if (!error) {
      setItems(items.map(item => item.id === id ? { ...item, quantity: newQty } : item));
    }
  };

  // ฟังก์ชันเพิ่มของใหม่ (แบบง่าย)
  const addNewItem = async () => {
    const name = prompt("ชื่อสินค้า:");
    if (!name) return;
    const qty = prompt("จำนวนเริ่มต้น:", "10");
    const unit = prompt("หน่วยนับ (เช่น ขวด, อัน):", "ขวด");

    const { error } = await supabase.from('inventory').insert([{
      name, 
      quantity: Number(qty), 
      unit,
      min_level: 5 // ค่า default เตือนเมื่อต่ำกว่า 5
    }]);

    if (!error) {
      alert('✅ เพิ่มสินค้าเรียบร้อย');
      fetchStock();
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] font-sans text-slate-600">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu /></button>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Package className="text-indigo-600" /> คลังสินค้า (Inventory)
            </h1>
          </div>
          <button onClick={addNewItem} className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-700 flex items-center gap-2">
            <Plus size={18} /> เพิ่มสินค้า
          </button>
        </header>

        {/* Content */}
        <div className="p-8 max-w-6xl mx-auto w-full">
          
          {/* Dashboard สรุปสต็อก */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><Package size={32} /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase">สินค้าทั้งหมด</p>
                <h2 className="text-3xl font-bold text-slate-800">{items.length} <span className="text-sm font-normal text-slate-400">รายการ</span></h2>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-4 bg-red-50 text-red-600 rounded-xl"><AlertTriangle size={32} /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase">ของใกล้หมด</p>
                <h2 className="text-3xl font-bold text-red-600">
                  {items.filter(i => i.quantity <= i.min_level).length} <span className="text-sm font-normal text-slate-400">รายการ</span>
                </h2>
              </div>
            </div>
          </div>

          {/* Table Inventory */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm uppercase tracking-wider">
                  <tr>
                    <th className="p-6 font-semibold">ชื่อสินค้า</th>
                    <th className="p-6 font-semibold">หมวดหมู่</th>
                    <th className="p-6 font-semibold text-center">สถานะ</th>
                    <th className="p-6 font-semibold text-center">คงเหลือ</th>
                    <th className="p-6 font-semibold text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-6 font-medium text-slate-700">{item.name}</td>
                      <td className="p-6">
                        <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded-md">{item.category}</span>
                      </td>
                      <td className="p-6 text-center">
                        {item.quantity <= item.min_level ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full animate-pulse">
                            <AlertTriangle size={12} /> ใกล้หมด
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-600 text-xs font-bold rounded-full">
                            ปกติ
                          </span>
                        )}
                      </td>
                      <td className="p-6 text-center">
                        <span className={`text-lg font-bold ${item.quantity <= item.min_level ? 'text-red-600' : 'text-slate-800'}`}>
                          {item.quantity}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">{item.unit}</span>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2">
                          {/* ปุ่มลดของ (เบิกใช้) */}
                          <button 
                            onClick={() => updateStock(item.id, item.quantity, -1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
                            title="เบิกใช้ (-1)"
                          >
                            <ArrowDownCircle size={18} />
                          </button>
                          {/* ปุ่มเพิ่มของ (เติมสต็อก) */}
                          <button 
                            onClick={() => updateStock(item.id, item.quantity, 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition"
                            title="เติมของ (+1)"
                          >
                            <ArrowUpCircle size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}