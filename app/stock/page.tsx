'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import Sidebar from '@/components/Sidebar';
import { Menu, Search, Plus, Package, AlertTriangle, ArrowUpCircle, ArrowDownCircle, Trash2 } from 'lucide-react';

export default function StockPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ดึงข้อมูลสต็อก
  const fetchStock = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .order('quantity', { ascending: true });
    
    if (data) setItems(data);
    setLoading(false);
  };

  useEffect(() => { fetchStock(); }, []);

  // ฟังก์ชันปรับสต็อก (+ เพิ่ม / - ลด)
  const updateStock = async (id: number, currentQty: number, change: number) => {
    const newQty = currentQty + change;
    if (newQty < 0) return;

    const { error } = await supabase
      .from('inventory')
      .update({ quantity: newQty })
      .eq('id', id);

    if (!error) {
      setItems(items.map(item => item.id === id ? { ...item, quantity: newQty } : item));
    }
  };

  // ฟังก์ชันลบสินค้า (เพิ่มใหม่)
  const deleteItem = async (id: number, name: string) => {
    if (!confirm(`⚠️ ยืนยันลบ "${name}" ออกจากระบบ?\n(ถ้าลบแล้ว ประวัติการตัดของย้อนหลังอาจจะหาไม่เจอนะครับ)`)) return;

    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);

    if (!error) {
      alert('🗑️ ลบเรียบร้อย');
      fetchStock(); // รีโหลดใหม่
    } else {
      alert('❌ ลบไม่ได้ (สินค้านี้อาจถูกผูกไว้กับสูตร หรือประวัติการใช้งาน)');
    }
  };

  // ฟังก์ชันเพิ่มของใหม่
  const addNewItem = async () => {
    const name = prompt("ชื่อสินค้า:");
    if (!name) return;
    const qty = prompt("จำนวนเริ่มต้น:", "0");
    const unit = prompt("หน่วยนับ (เช่น ขวด, อัน):", "ชิ้น");

    const { error } = await supabase.from('inventory').insert([{
      name, 
      quantity: Number(qty), 
      unit,
      min_level: 5
    }]);

    if (!error) {
      alert('✅ เพิ่มสินค้าเรียบร้อย');
      fetchStock();
    }
  };

  // กรองสินค้าตามคำค้นหา
  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] font-sans text-slate-600">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu /></button>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Package className="text-indigo-600" /> คลังสินค้า
            </h1>
          </div>
          
          <div className="flex gap-3">
             {/* ช่องค้นหา */}
             <div className="bg-slate-100 px-4 py-2 rounded-lg flex items-center gap-2 w-48 md:w-64">
                <Search size={18} className="text-slate-400" />
                <input 
                  type="text" 
                  placeholder="ค้นหาสินค้า..." 
                  className="bg-transparent outline-none text-sm w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <button onClick={addNewItem} className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-700 flex items-center gap-2 font-bold text-sm">
                <Plus size={18} /> เพิ่ม
             </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-8 max-w-6xl mx-auto w-full">
          
          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><Package size={32} /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase">สินค้าทั้งหมด</p>
                <h2 className="text-3xl font-bold text-slate-800">{items.length}</h2>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-4 bg-red-50 text-red-600 rounded-xl"><AlertTriangle size={32} /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase">ของใกล้หมด</p>
                <h2 className="text-3xl font-bold text-red-600">
                  {items.filter(i => i.quantity <= i.min_level).length}
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
                    <th className="p-6 font-semibold text-center">สถานะ</th>
                    <th className="p-6 font-semibold text-center">คงเหลือ</th>
                    <th className="p-6 font-semibold text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredItems.length === 0 ? (
                     <tr><td colSpan={4} className="p-8 text-center text-slate-400">ไม่พบสินค้า</td></tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition group">
                        <td className="p-6 font-medium text-slate-700">{item.name}</td>
                        <td className="p-6 text-center">
                          {item.quantity <= item.min_level ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full animate-pulse">
                              ใกล้หมด
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
                            <button 
                              onClick={() => updateStock(item.id, item.quantity, -1)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition"
                            >
                              <ArrowDownCircle size={18} />
                            </button>
                            <button 
                              onClick={() => updateStock(item.id, item.quantity, 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition"
                            >
                              <ArrowUpCircle size={18} />
                            </button>
                            
                            {/* ✅ ปุ่มลบสินค้า (สีแดง) */}
                            <button 
                              onClick={() => deleteItem(item.id, item.name)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition ml-2"
                              title="ลบสินค้านี้"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
