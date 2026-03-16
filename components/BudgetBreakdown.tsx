
import React, { useMemo } from 'react';
import { Transaction, BudgetSettings } from '../types.js';
import { getCategoryColor } from '../constants.js';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ArrowTrendingUpIcon, 
  BanknotesIcon 
} from '@heroicons/react/24/outline';

interface Props {
  transactions: Transaction[];
  settings: BudgetSettings;
  title?: string;
  gridCols?: string;
}

const BudgetBreakdown: React.FC<Props> = ({ 
  transactions, 
  settings, 
  title = "Budget Breakdown",
  gridCols = "grid-cols-1 md:grid-cols-2" 
}) => {
  const budgetPerformance = useMemo(() => {
    // 1. Organize budgets into a hierarchy
    const hierarchy: Record<string, { limit: number, subs: Record<string, number> }> = {};
    
    Object.entries(settings.budgets).forEach(([key, limit]) => {
      if (key.includes(':')) {
        const [main, sub] = key.split(':');
        if (!hierarchy[main]) hierarchy[main] = { limit: 0, subs: {} };
        hierarchy[main].subs[sub] = limit as number;
      } else {
        if (!hierarchy[key]) hierarchy[key] = { limit: 0, subs: {} };
        hierarchy[key].limit = limit as number;
      }
    });

    // 2. Calculate actuals
    const actuals: Record<string, { total: number, subs: Record<string, number> }> = {};
    transactions.forEach(t => {
       if (t.type === 'expense' || t.type === 'return') {
         const amount = t.type === 'expense' ? t.amount : -t.amount;
         if (!actuals[t.category]) actuals[t.category] = { total: 0, subs: {} };
         actuals[t.category].total += amount;
         
         if (t.subCategory) {
           actuals[t.category].subs[t.subCategory] = (actuals[t.category].subs[t.subCategory] || 0) + amount;
         }
       }
    });

    return Object.keys(hierarchy).map(cat => {
       const limit = hierarchy[cat].limit;
       const actual = actuals[cat]?.total || 0;
       
       const subs = Object.keys(hierarchy[cat].subs).map(subName => {
          const subLimit = hierarchy[cat].subs[subName];
          const subActual = actuals[cat]?.subs[subName] || 0;
          return {
            name: subName,
            limit: subLimit,
            actual: Math.max(0, subActual),
            percent: subLimit > 0 ? (subActual / subLimit) * 100 : 0,
            diff: subLimit - subActual
          };
       }).sort((a, b) => b.percent - a.percent);

       return {
         name: cat,
         limit,
         actual: Math.max(0, actual),
         percent: limit > 0 ? (actual / limit) * 100 : 0,
         diff: limit - actual,
         subs
       };
    }).sort((a, b) => b.percent - a.percent);
  }, [transactions, settings.budgets]);

  if (budgetPerformance.length === 0) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center flex flex-col items-center">
        <div className="bg-slate-50 p-4 rounded-2xl mb-4">
          <BanknotesIcon className="h-8 w-8 text-slate-300" />
        </div>
        <p className="text-slate-500 font-medium">No budgets configured</p>
        <p className="text-slate-400 text-xs mt-1">Visit settings to set category limits.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
          {title}
        </h3>
        <div className="hidden sm:flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Safe</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Caution</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Warning</span>
        </div>
      </div>
      
      <div className={`grid ${gridCols} gap-x-12 gap-y-8`}>
        {budgetPerformance.map(item => {
          const isOver = item.percent > 100;
          const isWarning = item.percent > 85 && !isOver;
          const statusColor = isOver ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-emerald-600';
          const barColor = isOver ? '#f43f5e' : isWarning ? '#f59e0b' : getCategoryColor(item.name);

          return (
            <div key={item.name} className="group flex flex-col space-y-2.5">
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{item.name}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${statusColor} flex items-center gap-1 mt-0.5`}>
                    {isOver ? (
                      <><ExclamationTriangleIcon className="h-3 w-3" /> Over by ${Math.abs(item.diff).toFixed(0)}</>
                    ) : isWarning ? (
                      <><ArrowTrendingUpIcon className="h-3 w-3" /> Near Limit</>
                    ) : (
                      <><CheckCircleIcon className="h-3 w-3" /> ${item.diff.toFixed(0)} left</>
                    )}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-800 block">
                    ${item.actual.toFixed(0)} <span className="text-slate-400 font-normal">/ ${item.limit.toFixed(0)}</span>
                  </span>
                  <span className={`text-[10px] font-black ${statusColor}`}>
                    {item.percent.toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="relative w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                <div className="absolute inset-0 bg-slate-100/30" />
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-out relative"
                  style={{ 
                    width: `${Math.min(item.percent, 100)}%`,
                    backgroundColor: barColor,
                    boxShadow: isOver ? '0 0 10px rgba(244, 63, 94, 0.3)' : 'none'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                </div>
              </div>

              {/* Subcategories */}
              {item.subs.length > 0 && (
                <div className="pl-3 mt-2 space-y-2 border-l border-slate-100">
                  {item.subs.map(sub => {
                    const isSubOver = sub.percent > 100;
                    const isSubWarning = sub.percent > 85 && !isSubOver;
                    const subStatusColor = isSubOver ? 'text-rose-500' : isSubWarning ? 'text-amber-500' : 'text-emerald-500';
                    const subBarColor = isSubOver ? '#f43f5e' : isSubWarning ? '#f59e0b' : getCategoryColor(item.name);

                    return (
                      <div key={sub.name} className="flex flex-col space-y-1">
                        <div className="flex justify-between items-end text-[9px]">
                           <span className="font-bold text-slate-500">{sub.name}</span>
                           <div className="flex gap-2">
                             <span className="text-slate-400">${sub.actual.toFixed(0)} / ${sub.limit.toFixed(0)}</span>
                             <span className={`font-black ${subStatusColor}`}>{sub.percent.toFixed(0)}%</span>
                           </div>
                        </div>
                        <div className="relative w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ 
                              width: `${Math.min(sub.percent, 100)}%`,
                              backgroundColor: subBarColor,
                              opacity: 0.7
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BudgetBreakdown;