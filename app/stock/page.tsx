'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import Sidebar from '@/components/Sidebar';
import { Menu, Search, Plus, Package, AlertTriangle, ArrowUpCircle, ArrowDownCircle, Trash2 } from 'lucide-react';

export default function StockPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStock = async () => {
    const { data } = await supabase.from('inventory').select('*').order('quantity', { ascending: true });
    if (data) setItems(data);
  };
  useEffect(() => { fetchStock(); }, []);

  const updateStock = async (id: number, currentQty: number, change: number) => {
    const newQty = currentQty + change;
    if (newQty < 0) return;
    await supabase.from('inventory').update({ quantity: newQty }).eq('id', id);
    setItems(items.map(item => item.id === id ? { ...item, quantity: newQty } : item));
  };

  const deleteItem = async (id: number, name: string) => {
    if (!confirm(`⚠️ ยืนยันลบ "${name}"?`)) return;
    await supabase.from('inventory').delete().eq('id', id);
    fetchStock();
  };

  const addNewItem = async () => {
    const name = prompt("ชื่อสินค้า:");
    if (!name) return;
    const qty = prompt("จำนวนเริ่มต้น:", "0");
    const unit = prompt("หน่วยนับ:", "ชิ้น");
    await supabase.from('inventory').insert([{ name, quantity: Number(qty), unit, min_level: 5 }]);
    fetchStock();
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] font-sans text-slate-600">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 flex flex-col w-full"> {/* เพิ่ม w-full */}
        <header className="h-20 bg-white border-b border-slate-200 px-4 lg:px-8 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu /></button>
            <h1 className="text-lg lg:text-xl font-bold text-slate-800 flex items-center gap-2">
              <Package className="text-indigo-600" /> <span className="hidden xs:inline">คลังสินค้า</span>
            </h1>
          </div>
          <div className="flex gap-2">
             <div className="bg-slate-100 px-3 py-2 rounded-lg flex items-center gap-2 w-32 lg:w-64">
                <Search size={18} className="text-slate-400" />
                <input type="text" placeholder="ค้นหา..." className="bg-transparent outline-none text-sm w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             </div>
             <button onClick={addNewItem} className="bg-indigo-600 text-white px-3 py-2 rounded-lg shadow-md hover:bg-indigo-700 flex items-center gap-2 font-bold text-sm">
                <Plus size={18} /> <span className="hidden sm:inline">เพิ่ม</span>
             </button>
          </div>
        </header>

        {/* ✅ ปรับ Padding ให้เล็กลงในมือถือ (p-4) */}
        <div className="p-4 lg:p-8 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6">
            <div className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 lg:p-4 bg-blue-50 text-blue-600 rounded-xl"><Package size={24} /></div>
              <div><p className="text-slate-400 text-xs font-bold uppercase">ทั้งหมด</p><h2 className="text-2xl lg:text-3xl font-bold text-slate-800">{items.length}</h2></div>
            </div>
            <div className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 lg:p-4 bg-red-50 text-red-600 rounded-xl"><AlertTriangle size={24} /></div>
              <div><p className="text-slate-400 text-xs font-bold uppercase">ของใกล้หมด</p><h2 className="text-2xl lg:text-3xl font-bold text-red-600">{items.filter(i => i.quantity <= i.min_level).length}</h2></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* ✅ เพิ่ม overflow-x-auto ให้ตารางเลื่อนได้ */}
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]"> {/* กำหนด min-w เพื่อให้ตารางไม่บีบจนเละ */}
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm uppercase">
                  <tr><th className="p-4 lg:p-6">สินค้า</th><th className="p-4 lg:p-6 text-center">สถานะ</th><th className="p-4 lg:p-6 text-center">คงเหลือ</th><th className="p-4 lg:p-6 text-right">จัดการ</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-4 lg:p-6 font-medium text-slate-700">{item.name}</td>
                      <td className="p-4 lg:p-6 text-center">
                        {item.quantity <= item.min_level ? <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-bold">ใกล้หมด</span> : <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full font-bold">ปกติ</span>}
                      </td>
                      <td className="p-4 lg:p-6 text-center font-bold text-slate-800">{item.quantity} <span className="text-xs font-normal text-slate-400">{item.unit}</span></td>
                      <td className="p-4 lg:p-6 text-right flex justify-end gap-2">
                        <button onClick={() => updateStock(item.id, item.quantity, -1)} className="p-1 lg:p-2 border rounded hover:bg-orange-50 text-slate-500"><ArrowDownCircle size={18}/></button>
                        <button onClick={() => updateStock(item.id, item.quantity, 1)} className="p-1 lg:p-2 border rounded hover:bg-green-50 text-slate-500"><ArrowUpCircle size={18}/></button>
                        <button onClick={() => deleteItem(item.id, item.name)} className="p-1 lg:p-2 border rounded hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>
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