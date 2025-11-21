'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function RevenueChart({ bookings }: { bookings: any[] }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (!bookings) return;

    // 1. สร้างวันที่ย้อนหลัง 7 วัน
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i)); // ย้อนหลังไป 6 วัน จนถึงวันนี้
      return d.toISOString().split('T')[0]; // ได้ format "2023-10-25"
    });

    // 2. รวมยอดเงินของแต่ละวัน
    const chartData = last7Days.map((date) => {
      const dayIncome = bookings
        .filter((b) => b.booking_date === date && b.status === 'done') // เอาเฉพาะงานที่เสร็จแล้ว
        .reduce((sum, b) => sum + ((b.final_price || b.services?.price || 0)), 0);

      // แปลงวันที่เป็นชื่อวันสั้นๆ (เช่น "25 Oct")
      const dateLabel = new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

      return {
        name: dateLabel,
        income: dayIncome,
      };
    });

    setData(chartData);
  }, [bookings]);

  return (
    <div className="w-full h-full">
      <h3 className="font-bold text-slate-800 mb-4">📈 ยอดขายย้อนหลัง 7 วัน</h3>
      <div className="h-[200px] w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `฿${value}`} />
            <Tooltip 
              formatter={(value: number) => [`฿${value.toLocaleString()}`, 'ยอดขาย']}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="income" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}