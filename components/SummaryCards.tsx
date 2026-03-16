
import React, { useMemo } from 'react';
import { MonthSummary, BudgetSettings, Transaction } from '../types.js';
import { WalletIcon, ArrowUpIcon, ArrowDownIcon, ScaleIcon, BanknotesIcon, CreditCardIcon } from '@heroicons/react/24/outline';

interface Props {
  summary: MonthSummary;
  settings: BudgetSettings;
  transactions: Transaction[];
}

const SummaryCards: React.FC<Props> = ({ summary, settings, transactions }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0 
    }).format(val);
  };

  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = { ...settings.initialBalances };
    
    transactions.forEach(t => {
      if (t.type === 'income') {
        balances[t.account] = (balances[t.account] || 0) + t.amount;
      } else if (t.type === 'expense') {
        balances[t.account] = (balances[t.account] || 0) - t.amount;
      } else if (t.type === 'return') {
        balances[t.account] = (balances[t.account] || 0) + t.amount;
      }
    });
    
    return balances;
  }, [settings.initialBalances, transactions]);

  const { totalAssets, totalLiabilities, netWorth } = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    (Object.values(accountBalances) as number[]).forEach(val => {
      if (val >= 0) assets += val;
      else liabilities += Math.abs(val);
    });
    return {
      totalAssets: assets,
      totalLiabilities: liabilities,
      netWorth: assets - liabilities
    };
  }, [accountBalances]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-md transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Income</p>
              <div className="bg-emerald-50 p-2 rounded-xl group-hover:scale-110 transition-transform">
                <ArrowUpIcon className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-3xl font-black text-emerald-600">{formatCurrency(summary.income)}</p>
          </div>
          <div className="mt-4 w-full h-1 bg-emerald-50 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-full opacity-30" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-md transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Spending</p>
              <div className="bg-rose-50 p-2 rounded-xl group-hover:scale-110 transition-transform">
                <ArrowDownIcon className="h-4 w-4 text-rose-600" />
              </div>
            </div>
            <p className="text-3xl font-black text-rose-600">{formatCurrency(summary.expenses)}</p>
          </div>
          <div className="mt-4 w-full h-1 bg-rose-50 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 w-full opacity-30" />
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl shadow-lg shadow-slate-200 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Liquidity</p>
              <div className="bg-white/10 p-2 rounded-xl">
                <ScaleIcon className="h-4 w-4 text-white/60" />
              </div>
            </div>
            <p className={`text-3xl font-black ${netWorth >= 0 ? 'text-white' : 'text-rose-400'}`}>
              {formatCurrency(netWorth)}
            </p>
          </div>
          <div className="relative mt-4 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <p className="text-[8px] text-slate-500 font-bold uppercase">Assets</p>
              <p className="text-[11px] text-emerald-400 font-bold">{formatCurrency(totalAssets)}</p>
            </div>
            <div className="flex flex-col text-right">
              <p className="text-[8px] text-slate-500 font-bold uppercase">Liabilities</p>
              <p className="text-[11px] text-rose-400 font-bold">{formatCurrency(totalLiabilities)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <WalletIcon className="h-4 w-4 text-indigo-500" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Real-time Balances</h3>
          </div>
          <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Cash/Savings</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Debt/Credit</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {settings.accounts.map(acc => {
            const bal = accountBalances[acc] || 0;
            const isDebt = bal < 0;
            return (
              <div key={acc} className={`p-4 rounded-2xl border transition-all group ${isDebt ? 'bg-rose-50/30 border-rose-100 hover:border-rose-200' : 'bg-slate-50 border-slate-100 hover:border-slate-200 hover:bg-white'}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{acc}</p>
                  {isDebt ? <CreditCardIcon className="h-3 w-3 text-rose-300" /> : <BanknotesIcon className="h-3 w-3 text-emerald-300" />}
                </div>
                <p className={`text-lg font-black tracking-tight transition-transform group-hover:scale-105 ${isDebt ? 'text-rose-500' : 'text-slate-800'}`}>
                  {formatCurrency(bal)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;