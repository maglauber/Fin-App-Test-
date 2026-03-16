import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, ComposedChart, Line, Area, AreaChart
} from 'recharts';
import { Transaction, BudgetSettings } from '../types.js';
import { 
  ArrowsRightLeftIcon, 
  ArrowUpIcon, 
  ArrowDownIcon, 
  CalendarIcon,
  PresentationChartLineIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';

interface Props {
  transactions: Transaction[];
  settings: BudgetSettings;
}

const ComparisonView: React.FC<Props> = ({ transactions, settings }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0 
    }).format(val);
  };

  const monthlyData = useMemo(() => {
    const months: Record<string, { income: number; expenses: number; net: number; savingsRate: number }> = {};
    
    transactions.forEach(t => {
      const m = t.budgetMonth;
      if (!months[m]) months[m] = { income: 0, expenses: 0, net: 0, savingsRate: 0 };
      
      if (t.type === 'income') months[m].income += t.amount;
      else if (t.type === 'expense') months[m].expenses += t.amount;
      else if (t.type === 'return') months[m].expenses -= t.amount;
    });

    const sortedEntries = Object.entries(months).sort((a, b) => a[0].localeCompare(b[0]));
    let runningNetWorth = Object.values(settings.initialBalances).reduce<number>((a, b) => a + (Number(b) || 0), 0);

    return sortedEntries.map(([month, data]) => {
      const net = data.income - data.expenses;
      const savingsRate = data.income > 0 ? (net / data.income) * 100 : 0;
      runningNetWorth += net;
      
      return {
        month,
        monthName: new Date(month + '-02').toLocaleString('default', { month: 'short', year: '2-digit' }),
        ...data,
        net,
        netWorth: runningNetWorth,
        savingsRate: Math.max(-100, Math.min(100, savingsRate))
      };
    }).slice(-12);
  }, [transactions, settings.initialBalances]);

  const lastTwoMonths = monthlyData.slice(-2);
  const currentMonth = lastTwoMonths[1];
  const previousMonth = lastTwoMonths[0];

  const deltas = useMemo(() => {
    if (!currentMonth || !previousMonth) return null;
    return {
      incomeChange: previousMonth.income > 0 ? ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100 : 0,
      expenseChange: previousMonth.expenses > 0 ? ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100 : 0,
      savingsChange: currentMonth.savingsRate - previousMonth.savingsRate
    };
  }, [currentMonth, previousMonth]);

  if (monthlyData.length < 2) {
    return (
      <div className="py-24 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CalendarIcon className="h-10 w-10 text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Historical data required</h3>
        <p className="text-slate-500 mt-2 max-w-sm mx-auto">Compare multiple months of transactions to see your wealth trajectory.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Income Shift</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-slate-800">{formatCurrency(currentMonth.income)}</p>
            {deltas && (
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${deltas.incomeChange >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {deltas.incomeChange >= 0 ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
                {Math.abs(deltas.incomeChange).toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Spending Delta</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-slate-800">{formatCurrency(currentMonth.expenses)}</p>
            {deltas && (
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${deltas.expenseChange <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {deltas.expenseChange <= 0 ? <ArrowDownIcon className="h-3 w-3" /> : <ArrowUpIcon className="h-3 w-3" />}
                {Math.abs(deltas.expenseChange).toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl shadow-lg shadow-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Savings Velocity</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-white">{currentMonth.savingsRate.toFixed(1)}%</p>
            {deltas && (
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${deltas.savingsChange >= 0 ? 'bg-emerald-400/20 text-emerald-400' : 'bg-rose-400/20 text-rose-400'}`}>
                {deltas.savingsChange >= 0 ? '+' : ''}{deltas.savingsChange.toFixed(1)} pts
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ScaleIcon className="h-6 w-6 text-indigo-600" />
              Net Worth Appreciation
            </h3>
            <p className="text-sm text-slate-400 mt-1">Total combined account liquidity over time</p>
          </div>
          <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Total Growth Tracking</span>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="worthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 'bold' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(val) => `$${val}`} />
              <Tooltip 
                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
                formatter={(val: number) => [formatCurrency(val), 'Net Worth']}
              />
              <Area type="monotone" dataKey="netWorth" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#worthGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <PresentationChartLineIcon className="h-6 w-6 text-indigo-600" />
              Flow Dynamics (MoM)
            </h3>
            <p className="text-sm text-slate-400 mt-1">Comparison of gross volume vs net results</p>
          </div>
        </div>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 'bold' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(val) => `$${val}`} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}
                formatter={(val: number) => [formatCurrency(val), '']}
              />
              <Area type="monotone" dataKey="income" fill="#6366f1" fillOpacity={0.1} stroke="#6366f1" strokeWidth={3} />
              <Bar dataKey="expenses" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={24} />
              <Line type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2">
          <ArrowsRightLeftIcon className="h-5 w-5 text-indigo-500" />
          Category Shifts (MoM)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Last Month</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">This Month</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {settings.expenseCategories.map(cat => {
                const cur = transactions
                  .filter(t => t.budgetMonth === currentMonth.month && t.category === cat)
                  .reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : t.type === 'return' ? -t.amount : 0), 0);
                const prev = transactions
                  .filter(t => t.budgetMonth === previousMonth.month && t.category === cat)
                  .reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : t.type === 'return' ? -t.amount : 0), 0);
                
                if (cur === 0 && prev === 0) return null;
                const diff = cur - prev;
                const pct = prev > 0 ? (diff / prev) * 100 : cur > 0 ? 100 : 0;

                return (
                  <tr key={cat} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-4 text-sm font-bold text-slate-700">{cat}</td>
                    <td className="py-4 text-sm text-slate-500 text-right">{formatCurrency(prev)}</td>
                    <td className="py-4 text-sm font-bold text-slate-800 text-right">{formatCurrency(cur)}</td>
                    <td className={`py-4 text-xs font-black text-right ${diff > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                      <span className="ml-1 opacity-60">({pct.toFixed(0)}%)</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ComparisonView;