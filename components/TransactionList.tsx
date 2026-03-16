
import React, { useState, useMemo } from 'react';
import { 
  TrashIcon, 
  PencilIcon, 
  ArrowPathIcon, 
  FunnelIcon, 
  XMarkIcon,
  CalendarIcon,
  TagIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { Transaction, BudgetSettings, TransactionType } from '../types.js';
import { getCategoryColor } from '../constants.js';

interface Props {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  settings: BudgetSettings;
}

interface Filters {
  search: string;
  type: TransactionType | 'all';
  category: string | 'all';
  startDate: string;
  endDate: string;
  needsAttentionOnly: boolean;
}

const TransactionList: React.FC<Props> = ({ transactions, onDelete, onEdit, settings }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: 'all',
    category: 'all',
    startDate: '',
    endDate: '',
    needsAttentionOnly: false
  });

  const budgetedCategories = useMemo(() => Object.keys(settings.budgets), [settings.budgets]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchSearch = tx.name.toLowerCase().includes(filters.search.toLowerCase());
      const matchType = filters.type === 'all' || tx.type === filters.type;
      const matchCategory = filters.category === 'all' || tx.category === filters.category;
      
      const txDate = new Date(tx.date).getTime();
      const matchStart = !filters.startDate || txDate >= new Date(filters.startDate).getTime();
      const matchEnd = !filters.endDate || txDate <= new Date(filters.endDate).getTime();

      const hasBudget = budgetedCategories.includes(tx.category);
      const isOtherCategory = tx.category.toLowerCase() === 'other';
      const needsAttention = tx.type === 'expense' && (!hasBudget || isOtherCategory);
      const matchAttention = !filters.needsAttentionOnly || needsAttention;

      return matchSearch && matchType && matchCategory && matchStart && matchEnd && matchAttention;
    });
  }, [transactions, filters, budgetedCategories]);

  const resetFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      category: 'all',
      startDate: '',
      endDate: '',
      needsAttentionOnly: false
    });
  };

  const hasActiveFilters = filters.search !== '' || filters.type !== 'all' || filters.category !== 'all' || filters.startDate !== '' || filters.endDate !== '' || filters.needsAttentionOnly;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(val);
  };

  return (
    <div className="flex flex-col">
      <div className="bg-slate-50/50 border-b border-slate-100 p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search history..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center justify-between md:justify-end gap-3">
            <button 
              onClick={() => setFilters(f => ({ ...f, needsAttentionOnly: !f.needsAttentionOnly }))}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                filters.needsAttentionOnly
                ? 'bg-rose-100 text-rose-600 border border-rose-200' 
                : 'bg-white text-slate-600 border border-slate-200 hover:border-rose-100'
              }`}
            >
              <ExclamationCircleIcon className="h-3.5 w-3.5" />
              Needs Attention (**)
            </button>

            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                showFilters
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <FunnelIcon className="h-3.5 w-3.5" />
              More Filters
            </button>

            {hasActiveFilters && (
              <button 
                onClick={resetFilters}
                className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-rose-500 transition-colors"
              >
                Reset
              </button>
            )}
            <div className="h-4 w-px bg-slate-200 mx-1 hidden md:block" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {filteredTransactions.length} Items
            </p>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2 duration-300 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                <AdjustmentsHorizontalIcon className="h-3 w-3" /> Type
              </label>
              <select 
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value as any})}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none"
              >
                <option value="all">All Types</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="return">Return</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                <TagIcon className="h-3 w-3" /> Category
              </label>
              <select 
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none"
              >
                <option value="all">All Categories</option>
                <optgroup label="Expenses">
                  {settings.expenseCategories.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                </optgroup>
                <optgroup label="Income">
                  {settings.incomeCategories.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                </optgroup>
              </select>
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                <CalendarIcon className="h-3 w-3" /> From
              </label>
              <input 
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                <CalendarIcon className="h-3 w-3" /> To
              </label>
              <input 
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none"
              />
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="py-24 text-center flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="bg-slate-100 p-5 rounded-full mb-4">
              <MagnifyingGlassIcon className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-bold text-lg">No results found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters.</p>
            <button 
              onClick={resetFilters}
              className="mt-6 bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-slate-200"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {filteredTransactions.map(tx => {
              const isPositive = tx.type === 'income' || tx.type === 'return';
              const catColor = getCategoryColor(tx.category);
              const isDeferred = tx.date.slice(0, 7) !== tx.budgetMonth;
              const hasBudget = budgetedCategories.includes(tx.category);
              const isOtherCategory = tx.category.toLowerCase() === 'other';
              const needsAttention = tx.type === 'expense' && (!hasBudget || isOtherCategory);
              
              return (
                <li 
                  key={tx.id} 
                  className="group relative flex items-center justify-between px-6 py-5 transition-all duration-300 hover:bg-slate-50/80 active:bg-indigo-50/30"
                >
                  <div 
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-all duration-300 group-hover:w-1.5 opacity-80 group-hover:opacity-100"
                    style={{ 
                      backgroundColor: catColor,
                      boxShadow: `2px 0 10px ${catColor}40`
                    }}
                  />

                  <div className="flex items-center gap-5 min-w-0">
                    <div 
                      className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-sm transform transition-all duration-500 group-hover:scale-105"
                      style={{ 
                        backgroundColor: catColor,
                        boxShadow: `0 8px 16px -4px ${catColor}30`
                      }}
                    >
                      {tx.category.charAt(0)}
                    </div>

                    <div className="min-w-0 flex flex-col">
                      <p className="font-bold text-slate-800 text-base truncate leading-tight group-hover:text-indigo-950 transition-colors">
                        {tx.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200 group-hover:border-indigo-100 transition-colors flex items-center gap-1">
                          {tx.category}
                          {tx.subCategory && (
                            <>
                              <span className="text-slate-300">/</span>
                              <span className="text-slate-600">{tx.subCategory}</span>
                            </>
                          )}
                          {needsAttention && (
                            <span className="text-rose-500 font-black" title={isOtherCategory ? "Categorized as Other" : "No budget target assigned"}>**</span>
                          )}
                        </span>
                        {tx.isRecurring && (
                          <span className="flex items-center gap-1 text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md uppercase tracking-tight">
                            <ArrowPathIcon className="h-2.5 w-2.5 animate-[spin_8s_linear_infinite]" /> Auto
                          </span>
                        )}
                        {isDeferred && (
                          <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md uppercase tracking-tight border border-amber-100">
                            <ClockIcon className="h-2.5 w-2.5" /> Deferred
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 ml-4">
                    <div className="text-right whitespace-nowrap">
                      <p className={`font-bold text-lg tracking-tight transition-transform duration-300 group-hover:scale-105 ${isPositive ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {isPositive ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {tx.account}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                      <button 
                        onClick={() => onEdit(tx)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(tx.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TransactionList;
