'use client';

import { LayoutDashboard, Calendar, Users, Receipt, Settings, LogOut, X, Package, Wallet, Tag } from 'lucide-react';
import { usePathname } from 'next/navigation'; // เพิ่มตัวช่วยเช็คหน้าปัจจุบัน

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (v: boolean) => void }) {
  const pathname = usePathname(); // เช็คว่าตอนนี้อยู่หน้าไหน

  return (
    <>
      {/* ฉากหลังดำ (Mobile) */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      )}

      {/* ตัวเมนู */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 
        transform transition-transform duration-300 ease-in-out flex flex-col h-full
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        <div className="h-20 flex items-center justify-between px-8 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <span className="text-xl font-bold text-slate-800">Fairymate Nail</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400"><X size={24} /></button>
        </div>

        <div className="p-6 space-y-1 overflow-y-auto flex-1">
          <p className="text-xs font-bold text-slate-400 mb-4 px-4 tracking-wider uppercase">Menu</p>
          
          {/* 1. Dashboard */}
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            href="/" 
            active={pathname === '/'} 
          />

          <NavItem 
            icon={<Users size={20} />} 
            label="ลูกค้า" 
            href="/customers" 
            active={pathname === '/customers'} 
          />
          
          <NavItem icon={<Calendar size={20} />} label="ตารางคิว" href="/calendar" active={pathname === '/calendar'} />
          <NavItem icon={<Wallet size={20} />} label="รายจ่าย" href="/expenses" active={pathname === '/expenses'} />
          {/* 2. เพิ่มเมนูสต็อกสินค้า ตรงนี้! */}
          <NavItem 
            icon={<Package size={20} />} 
            label="สต็อกสินค้า" 
            href="/stock" 
            active={pathname === '/stock'} 
          />
          
          <NavItem 
            icon={<Receipt size={20} />} 
            label="ใบเสร็จ" 
            href="/receipts"  // <-- แก้จาก # เป็น /receipts
            active={pathname === '/receipts'} // <-- เพิ่ม active check
          />

          <p className="text-xs font-bold text-slate-400 mt-8 mb-4 px-4 tracking-wider uppercase">Others</p>
          <NavItem 
            icon={<Settings size={20} />} 
            label="ตั้งค่าบริการ" 
            href="/settings" // <-- ใส่ลิงก์
            active={pathname === '/settings'} 
          />
          <NavItem icon={<Tag size={20} />} label="โปรโมชั่น" href="/promotions" active={pathname === '/promotions'} />
          <NavItem icon={<LogOut size={20} />} label="ออกจากระบบ" href="#" />
        </div>
      </aside>
    </>
  );
}

// Helper Component (อัปเกรดให้รับ href ได้)
function NavItem({ icon, label, href = "#", active }: any) {
  return (
    <a 
      href={href} 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
        active 
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
      }`}
    >
      {icon} <span>{label}</span>
    </a>
  );
}