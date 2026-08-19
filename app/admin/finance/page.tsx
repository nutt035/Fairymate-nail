"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { formatCurrency, cn } from '@/lib/utils';
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    Plus,
    Edit2,
    Trash2,
    Loader2,
    X,
    Check,
    PieChart,
    ChevronLeft,
    ChevronRight,
    BarChart3,
    Package,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, subDays, eachDayOfInterval } from 'date-fns';
import { th } from 'date-fns/locale';

// --- Types ---
interface Expense {
    id: number;
    amount: number;
    category: string;
    title: string;
    expense_date: string;
    created_at?: string;
}

interface CategoryConfig {
    name: string;
    icon: string;
    color: string;
    bgColor: string;
}

const EXPENSE_CATEGORIES: CategoryConfig[] = [
    { name: 'ค่าเช่า', icon: '🏠', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { name: 'ค่าน้ำ-ไฟ', icon: '💡', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    { name: 'ต้นทุนวัสดุ', icon: '💅', color: 'text-pink-600', bgColor: 'bg-pink-100' },
    { name: 'ซื้อของใช้', icon: '🛒', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
    { name: 'ค่าแรง', icon: '👩‍🔧', color: 'text-purple-600', bgColor: 'bg-purple-100' },
    { name: 'ค่าเดินทาง', icon: '🚗', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { name: 'ค่าโฆษณา', icon: '📣', color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
    { name: 'อื่นๆ', icon: '📝', color: 'text-slate-600', bgColor: 'bg-slate-100' },
];

export default function FinanceManagement() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [income, setIncome] = useState(0);
    const [loading, setLoading] = useState(true);
    const [viewMonth, setViewMonth] = useState(new Date());

    // Weekly Trend Data
    const [weeklyData, setWeeklyData] = useState<{ date: string; income: number; expense: number; profit: number }[]>([]);

    // Stock Cost (จาก inventory)
    const [stockCost, setStockCost] = useState(0);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        amount: 0,
        category: 'อื่นๆ',
        title: '',
        expense_date: format(new Date(), 'yyyy-MM-dd'),
    });

    // Fetch data from real database
    const fetchData = async () => {
        setLoading(true);
        const startDate = format(startOfMonth(viewMonth), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(viewMonth), 'yyyy-MM-dd');

        try {
            // Fetch income from bookings (งานที่จ่ายเงินแล้ว)
            const { data: bookings } = await supabase
                .from('bookings')
                .select('final_price')
                .eq('status', 'done')
                .gte('booking_date', startDate)
                .lte('booking_date', endDate);

            const totalIncome = bookings?.reduce((sum, r) => sum + (r.final_price || 0), 0) || 0;
            setIncome(totalIncome);

            // Fetch expenses from real database (ใช้ expense_date / title)
            const { data: expenseData, error } = await supabase
                .from('expenses')
                .select('*')
                .gte('expense_date', startDate)
                .lte('expense_date', endDate)
                .order('expense_date', { ascending: false });

            if (error) {
                console.error('Error fetching expenses:', error);
                setExpenses([]);
            } else {
                setExpenses(expenseData || []);
            }

            // Fetch stock costs (materials value in inventory)
            const { data: stockData } = await supabase
                .from('inventory')
                .select('cost_per_unit, quantity');

            const totalStockValue = stockData?.reduce((sum, s) => sum + ((s.cost_per_unit || 0) * (s.quantity || 0)), 0) || 0;
            setStockCost(totalStockValue);

            // Fetch weekly trend data (last 7 days)
            const today = new Date();
            const last7Days = eachDayOfInterval({ start: subDays(today, 6), end: today });
            const weeklyDataArray: { date: string; income: number; expense: number; profit: number }[] = [];

            for (const day of last7Days) {
                const dayStr = format(day, 'yyyy-MM-dd');

                // Get income for this day (จาก bookings ที่จ่ายแล้ว)
                const { data: dayBookings } = await supabase
                    .from('bookings')
                    .select('final_price')
                    .eq('status', 'done')
                    .eq('booking_date', dayStr);

                const dayIncome = dayBookings?.reduce((sum, r) => sum + (r.final_price || 0), 0) || 0;

                // Get expense for this day
                const { data: dayExpenses } = await supabase
                    .from('expenses')
                    .select('amount')
                    .eq('expense_date', dayStr);

                const dayExpense = dayExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

                weeklyDataArray.push({
                    date: format(day, 'EEE', { locale: th }),
                    income: dayIncome,
                    expense: dayExpense,
                    profit: dayIncome - dayExpense,
                });
            }

            setWeeklyData(weeklyDataArray);

        } catch (err) {
            console.error('Error fetching data:', err);
            setExpenses([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [viewMonth]);

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const profit = income - totalExpenses;
    const profitPercent = income > 0 ? Math.round((profit / income) * 100) : 0;

    // Group expenses by category
    const expensesByCategory = expenses.reduce((acc, e) => {
        if (!acc[e.category]) acc[e.category] = 0;
        acc[e.category] += e.amount || 0;
        return acc;
    }, {} as Record<string, number>);

    // Get category config
    const getCategoryConfig = (name: string): CategoryConfig => {
        return EXPENSE_CATEGORIES.find(c => c.name === name) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
    };

    // Handle submit
    const handleSubmit = async () => {
        if (formData.amount <= 0) {
            alert('กรุณาระบุจำนวนเงิน');
            return;
        }

        try {
            if (editingExpense) {
                const { error } = await supabase
                    .from('expenses')
                    .update({
                        amount: formData.amount,
                        category: formData.category,
                        title: formData.title,
                        expense_date: formData.expense_date,
                    })
                    .eq('id', editingExpense.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('expenses')
                    .insert([{
                        amount: formData.amount,
                        category: formData.category,
                        title: formData.title,
                        expense_date: formData.expense_date,
                    }]);

                if (error) throw error;
            }

            setIsModalOpen(false);
            setEditingExpense(null);
            resetForm();
            fetchData();
        } catch (err) {
            console.error('Error saving expense:', err);
            alert('เกิดข้อผิดพลาดในการบันทึก');
        }
    };

    // Handle delete
    const handleDelete = async (id: number) => {
        if (!confirm('ลบรายการนี้?')) return;

        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchData();
        } catch (err) {
            console.error('Error deleting expense:', err);
        }
    };

    // Open edit modal
    const openEditModal = (expense: Expense) => {
        setEditingExpense(expense);
        setFormData({
            amount: expense.amount,
            category: expense.category,
            title: expense.title || '',
            expense_date: expense.expense_date,
        });
        setIsModalOpen(true);
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            amount: 0,
            category: 'อื่นๆ',
            title: '',
            expense_date: format(new Date(), 'yyyy-MM-dd'),
        });
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-8">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
                    <Wallet className="text-primary" size={28} />
                    บัญชีรายรับ-รายจ่าย
                </h1>
                <p className="text-slate-500 mt-1">ติดตามเงินว่าไปไหน ดูกำไรสุทธิ</p>
            </div>

            {/* Month Navigation */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
                <div className="flex items-center justify-between gap-2">
                    <button
                        onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="flex-1 text-center">
                        <h2 className="text-lg font-bold text-slate-800">
                            {format(viewMonth, 'MMMM yyyy', { locale: th })}
                        </h2>
                    </div>

                    <button
                        onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>

                    <button
                        onClick={() => setViewMonth(new Date())}
                        className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors"
                    >
                        เดือนนี้
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Income Card */}
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={20} />
                        <span className="text-emerald-100 text-sm font-medium">รายได้</span>
                    </div>
                    <p className="text-3xl font-black">{formatCurrency(income)}</p>
                    <p className="text-xs text-emerald-100 mt-1">จากงานที่จ่ายเงินแล้ว</p>
                </div>

                {/* Expense Card */}
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white shadow-lg shadow-red-200">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown size={20} />
                        <span className="text-red-100 text-sm font-medium">รายจ่าย</span>
                    </div>
                    <p className="text-3xl font-black">{formatCurrency(totalExpenses)}</p>
                    <p className="text-xs text-red-100 mt-1">{expenses.length} รายการ</p>
                </div>

                {/* Profit Card */}
                <div className={cn(
                    "rounded-2xl p-5 text-white shadow-lg",
                    profit >= 0
                        ? "bg-gradient-to-br from-primary to-pink-600 shadow-primary/30"
                        : "bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-200"
                )}>
                    <div className="flex items-center gap-2 mb-2">
                        <PieChart size={20} />
                        <span className="text-white/80 text-sm font-medium">กำไรสุทธิ</span>
                    </div>
                    <p className="text-3xl font-black">
                        {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                    </p>
                    <p className="text-xs text-white/70 mt-1">
                        {profitPercent >= 0 ? `เก็บได้ ${profitPercent}% ของรายได้` : 'ขาดทุน'}
                    </p>
                </div>
            </div>

            {/* Weekly Profit Trend Chart */}
            {weeklyData.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <BarChart3 size={18} className="text-primary" />
                        กำไรรายวัน (7 วันล่าสุด)
                    </h3>

                    {/* Bar Chart */}
                    <div className="flex items-end justify-between gap-2 h-32 mb-4">
                        {weeklyData.map((day, idx) => {
                            const maxValue = Math.max(...weeklyData.map(d => Math.max(d.income, d.expense)), 1);
                            const incomeHeight = (day.income / maxValue) * 100;
                            const expenseHeight = (day.expense / maxValue) * 100;

                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                    <div className="flex gap-0.5 items-end h-24 w-full justify-center">
                                        {/* Income Bar */}
                                        <div
                                            className="w-3 bg-emerald-400 rounded-t-sm transition-all duration-300"
                                            style={{ height: `${Math.max(incomeHeight, 4)}%` }}
                                            title={`รายได้: ${formatCurrency(day.income)}`}
                                        />
                                        {/* Expense Bar */}
                                        <div
                                            className="w-3 bg-red-400 rounded-t-sm transition-all duration-300"
                                            style={{ height: `${Math.max(expenseHeight, 4)}%` }}
                                            title={`รายจ่าย: ${formatCurrency(day.expense)}`}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium">{day.date}</span>
                                    <span className={cn(
                                        "text-[10px] font-bold",
                                        day.profit >= 0 ? "text-emerald-500" : "text-red-500"
                                    )}>
                                        {day.profit >= 0 ? '+' : ''}{day.profit > 0 ? formatCurrency(day.profit).replace('฿', '') : '0'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex justify-center gap-6 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm bg-emerald-400"></span>
                            รายได้
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm bg-red-400"></span>
                            รายจ่าย
                        </span>
                    </div>

                    {/* Weekly Summary */}
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
                        <div>
                            <p className="text-xs text-slate-400">รายได้รวม 7 วัน</p>
                            <p className="font-bold text-emerald-600">{formatCurrency(weeklyData.reduce((s, d) => s + d.income, 0))}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">รายจ่ายรวม 7 วัน</p>
                            <p className="font-bold text-red-500">{formatCurrency(weeklyData.reduce((s, d) => s + d.expense, 0))}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">กำไรรวม 7 วัน</p>
                            <p className={cn(
                                "font-bold",
                                weeklyData.reduce((s, d) => s + d.profit, 0) >= 0 ? "text-primary" : "text-slate-600"
                            )}>
                                {formatCurrency(weeklyData.reduce((s, d) => s + d.profit, 0))}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stock Value Card */}
            {stockCost > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Package size={18} className="text-primary" />
                        มูลค่าสต็อกคงเหลือ
                    </h3>
                    <p className="text-2xl font-black text-primary">{formatCurrency(stockCost)}</p>
                    <p className="text-xs text-slate-400 mt-1">
                        ต้นทุนวัสดุทั้งหมดที่มีในสต็อก • ใช้ประกอบการคำนวณกำไรที่แท้จริง
                    </p>
                </div>
            )}

            {/* Expense Breakdown by Category */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <PieChart size={18} className="text-primary" />
                    รายจ่ายแยกตามหมวด
                </h3>

                {Object.keys(expensesByCategory).length > 0 ? (
                    <div className="space-y-3">
                        {Object.entries(expensesByCategory)
                            .sort((a, b) => b[1] - a[1])
                            .map(([category, amount]) => {
                                const config = getCategoryConfig(category);
                                const percent = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;

                                return (
                                    <div key={category} className="flex items-center gap-3">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg", config.bgColor)}>
                                            {config.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-medium text-slate-700">{category}</span>
                                                <span className="font-bold text-slate-800">{formatCurrency(amount)}</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full transition-all duration-500", config.bgColor.replace('100', '400'))}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className="text-xs text-slate-400 font-medium w-10 text-right">{percent}%</span>
                                    </div>
                                );
                            })}
                    </div>
                ) : (
                    <p className="text-center text-slate-400 py-4">ยังไม่มีรายจ่าย</p>
                )}
            </div>

            {/* Add Expense Button */}
            <button
                onClick={() => {
                    resetForm();
                    setEditingExpense(null);
                    setIsModalOpen(true);
                }}
                className="w-full mb-4 flex items-center justify-center gap-2 p-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
            >
                <Plus size={20} />
                เพิ่มรายจ่าย
            </button>

            {/* Expense List */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">รายการรายจ่าย</h3>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-primary" size={24} />
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {expenses.map(expense => {
                            const config = getCategoryConfig(expense.category);
                            return (
                                <div key={expense.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0", config.bgColor)}>
                                        {config.icon}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-700 truncate">{expense.title || expense.category}</p>
                                        <p className="text-xs text-slate-400">
                                            {format(new Date(expense.expense_date), 'd MMM yyyy', { locale: th })}
                                        </p>
                                    </div>

                                    <p className="font-bold text-red-500 shrink-0">-{formatCurrency(expense.amount)}</p>

                                    <div className="flex gap-1 shrink-0">
                                        <button
                                            onClick={() => openEditModal(expense)}
                                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(expense.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {expenses.length === 0 && !loading && (
                    <div className="text-center py-10 text-slate-400">
                        <Wallet size={40} className="mx-auto mb-2 opacity-50" />
                        <p>ยังไม่มีรายจ่ายในเดือนนี้</p>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editingExpense ? 'แก้ไขรายจ่าย' : 'เพิ่มรายจ่ายใหม่'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Amount */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">จำนวนเงิน (฿)</label>
                                <input
                                    type="number"
                                    value={formData.amount || ''}
                                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 mt-1 text-2xl font-bold text-center focus:ring-2 focus:ring-primary/30 outline-none"
                                    placeholder="0"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">หมวดหมู่</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {EXPENSE_CATEGORIES.map(cat => (
                                        <button
                                            key={cat.name}
                                            onClick={() => setFormData({ ...formData, category: cat.name })}
                                            className={cn(
                                                "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                                                formData.category === cat.name
                                                    ? "border-primary bg-primary/5"
                                                    : "border-slate-100 hover:border-slate-200"
                                            )}
                                        >
                                            <span className="text-xl">{cat.icon}</span>
                                            <span className="text-[10px] font-medium text-slate-600 truncate w-full text-center">{cat.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">รายละเอียด</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 focus:ring-2 focus:ring-primary/30 outline-none"
                                    placeholder="เช่น ค่าไฟ, ซื้อสีเจล"
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">วันที่</label>
                                <input
                                    type="date"
                                    value={formData.expense_date}
                                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 focus:ring-2 focus:ring-primary/30 outline-none"
                                />
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                            >
                                <Check size={18} />
                                บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
