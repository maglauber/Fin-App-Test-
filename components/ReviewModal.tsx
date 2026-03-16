import React, { useState } from 'react';
import { 
  Transaction, 
  BudgetSettings, 
  TransactionType 
} from '../types.js';
import { 
  TrashIcon, 
  PlusIcon, 
  CheckIcon, 
  XMarkIcon,
  CalendarIcon,
  TagIcon,
  BanknotesIcon,
  ArrowRightCircleIcon,
  ClockIcon,
  WalletIcon,
  ArrowsRightLeftIcon,
  SquaresPlusIcon
} from '@heroicons/react/24/outline';

interface Props {
  extracted: Partial<Transaction>[];
  onClose: () => void;
  onConfirm: (txs: Transaction[]) => void;
  settings: BudgetSettings;
}

const ReviewModal: React.FC<Props> = ({ extracted, onClose, onConfirm, settings }) => {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [txs, setTxs] = useState<Partial<Transaction>[]>(() => {
    const initial = extracted.length > 0 ? extracted : [{
      date: new Date().toISOString().split('T')[0],
      name: '',
      amount: 0,
      type: 'expense',
      category: settings.expenseCategories[0]?.name || '',
      account: settings.accounts[0]
    }];

    return initial.map(t => ({
      ...t,
      account: t.account || settings.accounts[0],
      budgetMonth: t.budgetMonth || (t.date ? t.date.slice(0, 7) : new Date().toISOString().slice(0, 7))
    }));
  });

  const handleUpdate = (index: number, field: keyof Transaction, value: any) => {
    const updated = [...txs];
    const current = { ...updated[index], [field]: value };
    
    if (field === 'date') {
      current.budgetMonth = value.slice(0, 7);
    }

    if (field === 'type') {
      const cats = value === 'income' ? settings.incomeCategories : settings.expenseCategories;
      if (!cats.some(c => c.name === current.category)) {
        current.category = cats[0]?.name || '';
      }
      current.subCategory = '';
    }
    
    if (field === 'category') {
      current.subCategory = '';
    }
    
    updated[index] = current;
    setTxs(updated);
  };

  const handleBulkUpdate = (field: keyof Transaction, value: any) => {
    const updated = txs.map((tx, idx) => {
      if (selected.has(idx)) {
        const newTx = { ...tx, [field]: value };
        if (field === 'date') newTx.budgetMonth = (value as string).slice(0, 7);
        if (field === 'type') {
          const cats = value === 'income' ? settings.incomeCategories : settings.expenseCategories;
          if (!cats.some(c => c.name === newTx.category)) newTx.category = cats[0]?.name || '';
          newTx.subCategory = '';
        }
        if (field === 'category') {
          newTx.subCategory = '';
        }
        return newTx;
      }
      return tx;
    });
    setTxs(updated);
  };

  const handleBulkDelete = () => {
    setTxs(prev => prev.filter((_, idx) => !selected.has(idx)));
    setSelected(new Set());
  };

  const toggleSelect = (index: number) => {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selected.size === txs.length) setSelected(new Set());
    else setSelected(new Set(txs.map((_, i) => i)));
  };

  const shiftAllToNextMonth = () => {
    setTxs(prev => prev.map(t => {
      if (!t.budgetMonth) return t;
      const [year, month] = t.budgetMonth.split('-').map(Number);
      const nextDate = new Date(year, month, 1); 
      return {
        ...t,
        budgetMonth: nextDate.toISOString().slice(0, 7)
      };
    }));
  };

  const selectedTxs = txs.filter((_, i) => selected.has(i));
  const commonCategory = selectedTxs.length > 0 && selectedTxs.every(t => t.category === selectedTxs[0].category) ? selectedTxs[0].category : null;
  const commonType = selectedTxs.length > 0 && selectedTxs.every(t => t.type === selectedTxs[0].type) ? selectedTxs[0].type : null;
  
  const bulkSubCategories = commonCategory ? 
    (commonType === 'income' ? settings.incomeCategories : settings.expenseCategories).find(c => c.name === commonCategory)?.subCategories || [] 
    : [];

  const removeRow = (index: number) => {
    setTxs(txs.filter((_, i) => i !== index));
    const next = new Set(selected);
    next.delete(index);
    setSelected(next);
  };

  const addRow = () => {
    const today = new Date().toISOString().split('T')[0];
    setTxs([...txs, {
      date: today,
      budgetMonth: today.slice(0, 7),
      name: '',
      amount: 0,
      type: 'expense',
      category: settings.expenseCategories[0]?.name || '',
      account: settings.accounts[0]
    }]);
  };

  const handleSave = () => {
    const validTxs = txs.filter(t => t.name && (t.amount !== undefined && t.amount !== null));
    const complete = validTxs.map(t => ({
      ...t,
      id: crypto.randomUUID(),
      name: t.name || 'Untitled',
      amount: t.amount || 0,
      category: t.category || (t.type === 'income' ? settings.incomeCategories[0]?.name : settings.expenseCategories[0]?.name) || '',
      account: t.account || settings.accounts[0],
      type: t.type || 'expense',
      date: t.date || new Date().toISOString().split('T')[0],
      budgetMonth: t.budgetMonth || (t.date ? t.date.slice(0, 7) : new Date().toISOString().slice(0, 7)),
      isRecurring: false
    })) as Transaction[];

    if (complete.length > 0) {
      onConfirm(complete);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 sm:p-6">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-300 overflow-hidden border border-white/20">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white relative">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Refine Scanned Items</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2">
              <SquaresPlusIcon className="h-4 w-4 text-emerald-500" />
              Adjust entries individually or use bulk tools.
            </p>
          </div>
          <div className="flex items-center gap-3">
             <button 
              onClick={shiftAllToNextMonth}
              className="hidden sm:flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-4 py-2 rounded-xl hover:bg-amber-100 transition-all border border-amber-100"
            >
              <ArrowRightCircleIcon className="h-4 w-4" /> Defer Batch to Next Month
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {selected.size > 0 && (
            <div className="absolute inset-x-0 bottom-0 top-0 bg-indigo-600 z-20 flex items-center justify-between px-8 animate-in slide-in-from-top-full duration-300">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-2xl backdrop-blur-md">
                  <span className="text-white font-black text-lg">{selected.size}</span>
                  <span className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Selected</span>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <label className="text-[9px] font-black text-indigo-200 uppercase mb-1">Set Category</label>
                    <select 
                      onChange={(e) => handleBulkUpdate('category', e.target.value)}
                      className="bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/20 focus:outline-none focus:bg-white/20 cursor-pointer"
                      defaultValue=""
                    >
                      <option value="" disabled className="text-slate-800">Select...</option>
                      {settings.expenseCategories.map(c => <option key={c.name} value={c.name} className="text-slate-800">{c.name}</option>)}
                      {settings.incomeCategories.map(c => <option key={c.name} value={c.name} className="text-slate-800">{c.name}</option>)}
                    </select>
                  </div>
                  {bulkSubCategories.length > 0 && (
                    <div className="flex flex-col">
                      <label className="text-[9px] font-black text-indigo-200 uppercase mb-1">Set Sub-Category</label>
                      <select 
                        onChange={(e) => handleBulkUpdate('subCategory', e.target.value)}
                        className="bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/20 focus:outline-none focus:bg-white/20 cursor-pointer"
                        defaultValue=""
                      >
                        <option value="" disabled className="text-slate-800">Select...</option>
                        {bulkSubCategories.map(s => <option key={s} value={s} className="text-slate-800">{s}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <label className="text-[9px] font-black text-indigo-200 uppercase mb-1">Set Account</label>
                    <select 
                      onChange={(e) => handleBulkUpdate('account', e.target.value)}
                      className="bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/20 focus:outline-none focus:bg-white/20 cursor-pointer"
                      defaultValue=""
                    >
                      <option value="" disabled className="text-slate-800">Select...</option>
                      {settings.accounts.map(acc => <option key={acc} value={acc} className="text-slate-800">{acc}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9px] font-black text-indigo-200 uppercase mb-1">Set Type</label>
                    <select 
                      onChange={(e) => handleBulkUpdate('type', e.target.value)}
                      className="bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/20 focus:outline-none focus:bg-white/20 cursor-pointer"
                      defaultValue=""
                    >
                      <option value="" disabled className="text-slate-800">Select...</option>
                      <option value="expense" className="text-slate-800">Expense</option>
                      <option value="income" className="text-slate-800">Income</option>
                      <option value="return" className="text-slate-800">Return</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={handleBulkDelete}
                  className="p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                  title="Delete Selected"
                >
                  <TrashIcon className="h-6 w-6" />
                </button>
                <div className="h-8 w-px bg-white/20 mx-2" />
                <button 
                  onClick={() => setSelected(new Set())}
                  className="text-indigo-100 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors"
                >
                  Cancel Selection
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {txs.length === 0 ? (
            <div className="py-24 text-center">
              <div className="bg-slate-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-bold">All items removed.</p>
              <button onClick={addRow} className="mt-4 text-indigo-600 font-bold text-sm hover:underline">Add an item manually</button>
            </div>
          ) : (
            <div className="min-w-[1200px]">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 bg-white/95 backdrop-blur-md z-10">
                  <tr>
                    <th className="px-8 py-5 border-b border-slate-100 w-16 text-center">
                      <input 
                        type="checkbox"
                        checked={selected.size === txs.length && txs.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Trans. Date</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Budget Period</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Description</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Amount</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Category</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Sub-Category</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Account</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {txs.map((tx, i) => {
                    const isInvalid = !tx.name || tx.amount === 0;
                    const catOptions = tx.type === 'income' ? settings.incomeCategories : settings.expenseCategories;
                    const isDeferred = tx.date && tx.budgetMonth && tx.date.slice(0, 7) !== tx.budgetMonth;
                    const isSelected = selected.has(i);
                    
                    return (
                      <tr key={i} className={`group hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''} ${isInvalid ? 'bg-rose-50/20' : ''}`}>
                        <td className="px-8 py-4 text-center">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(i)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="relative flex items-center gap-2 group/input">
                            <CalendarIcon className="h-4 w-4 text-slate-300 group-hover/input:text-indigo-400 transition-colors" />
                            <input 
                              type="date" 
                              value={tx.date || ''} 
                              onChange={(e) => handleUpdate(i, 'date', e.target.value)}
                              className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-600 outline-none w-full"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${isDeferred ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                            <ClockIcon className={`h-3.5 w-3.5 ${isDeferred ? 'text-amber-500' : 'text-slate-300'}`} />
                            <input 
                              type="month" 
                              value={tx.budgetMonth || ''} 
                              onChange={(e) => handleUpdate(i, 'budgetMonth', e.target.value)}
                              className="bg-transparent border-none focus:ring-0 text-xs font-black text-slate-600 outline-none uppercase"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <input 
                            type="text" 
                            placeholder="Required..."
                            value={tx.name || ''} 
                            onChange={(e) => handleUpdate(i, 'name', e.target.value)}
                            className={`w-full bg-white/50 border ${!tx.name ? 'border-rose-200' : 'border-transparent group-hover:border-slate-200'} rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all`}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="relative flex items-center group/input">
                            <span className="absolute left-3 text-slate-400 font-bold text-sm">$</span>
                            <input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00"
                              value={tx.amount || ''} 
                              onChange={(e) => handleUpdate(i, 'amount', parseFloat(e.target.value))}
                              className={`w-28 pl-7 pr-3 py-2 bg-white/50 border ${!tx.amount ? 'border-rose-200' : 'border-transparent group-hover:border-slate-200'} rounded-xl text-sm font-black text-indigo-600 focus:bg-white focus:border-indigo-500 outline-none transition-all`}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="relative flex items-center group/input">
                            <TagIcon className="absolute left-3 h-3 w-3 text-slate-300 group-hover/input:text-indigo-400 transition-colors" />
                            <select 
                              value={tx.category || ''}
                              onChange={(e) => handleUpdate(i, 'category', e.target.value)}
                              className="w-full pl-8 pr-3 py-2 bg-white/50 border border-transparent group-hover:border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                            >
                              {catOptions.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {(() => {
                            const selectedCat = catOptions.find(c => c.name === tx.category);
                            const subCats = selectedCat?.subCategories || [];
                            if (subCats.length === 0) return <span className="text-xs text-slate-400 italic px-3">None</span>;
                            return (
                              <div className="relative flex items-center group/input">
                                <select 
                                  value={tx.subCategory || ''}
                                  onChange={(e) => handleUpdate(i, 'subCategory', e.target.value)}
                                  className="w-full px-3 py-2 bg-white/50 border border-transparent group-hover:border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                  <option value="">Select...</option>
                                  {subCats.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4">
                          <div className="relative flex items-center group/input">
                            <WalletIcon className="absolute left-3 h-3.5 w-3.5 text-slate-300 group-hover/input:text-indigo-400 transition-colors" />
                            <select 
                              value={tx.account || ''}
                              onChange={(e) => handleUpdate(i, 'account', e.target.value)}
                              className="w-full pl-8 pr-3 py-2 bg-white/50 border border-transparent group-hover:border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                            >
                              {settings.accounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                            </select>
                          </div>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <button 
                            onClick={() => removeRow(i)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            title="Remove"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <button 
              onClick={addRow}
              className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-5 py-2.5 rounded-2xl hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm"
            >
              <PlusIcon className="h-4 w-4" /> Add Item
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {txs.filter(t => t.name && t.amount).length} Items Valid
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={onClose} 
              className="flex-1 sm:flex-none text-slate-500 font-bold px-8 py-3.5 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-200"
            >
              Discard
            </button>
            <button 
              onClick={handleSave}
              disabled={txs.filter(t => t.name && t.amount).length === 0}
              className="flex-1 sm:flex-none bg-indigo-600 text-white font-black px-10 py-3.5 rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:grayscale transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"
            >
              <BanknotesIcon className="h-5 w-5" />
              Confirm & Save Batch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;