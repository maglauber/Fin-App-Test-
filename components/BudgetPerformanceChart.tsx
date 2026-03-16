
import React from 'react';
import { ChartBarSquareIcon, ArrowTrendingDownIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

interface Props {
  totalBudget: number;
  totalSpent: number;
}

const BudgetPerformanceChart: React.FC<Props> = ({ totalBudget, totalSpent }) => {
  const percent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const remaining = Math.max(0, totalBudget - totalSpent);
  const isOver = totalSpent > totalBudget;
  
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-50 p-2 rounded-xl">
            <ChartBarSquareIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Monthly Budget Health</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${isOver ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {isOver ? 'Over Budget' : 'Within Limits'}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Budget</p>
            <p className="text-xl font-bold text-slate-800">{formatCurrency(totalBudget)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Spent So Far</p>
            <p className={`text-xl font-bold ${isOver ? 'text-rose-600' : 'text-indigo-600'}`}>
              {formatCurrency(totalSpent)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-out rounded-full relative ${isOver ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.3)]'}`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
            </div>
            {percent > 100 && (
              <div 
                className="absolute top-0 right-0 bottom-0 bg-rose-400/20 animate-pulse" 
                style={{ width: `${percent - 100}%` }}
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
            <span className="text-slate-400">{percent.toFixed(0)}% Utilized</span>
            {isOver ? (
              <span className="text-rose-600">-${formatCurrency(Math.abs(totalBudget - totalSpent)).slice(1)} Over</span>
            ) : (
              <span className="text-emerald-600">${formatCurrency(remaining).slice(1)} Left</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-500">
          {isOver ? (
             <ArrowTrendingUpIcon className="h-4 w-4 text-rose-500" />
          ) : (
             <ArrowTrendingDownIcon className="h-4 w-4 text-emerald-500" />
          )}
          <span>{isOver ? 'Spending is higher than usual' : 'Spending is within parameters'}</span>
        </div>
      </div>
    </div>
  );
};

export default BudgetPerformanceChart;
