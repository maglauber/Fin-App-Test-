import React, { useState } from 'react';
import { RecurringTransaction, BudgetSettings, TransactionType } from '../types.js';
import { TrashIcon, PlusCircleIcon, CalendarDaysIcon, ArrowUpCircleIcon, ArrowDownCircleIcon } from '@heroicons/react/24/outline';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  templates: RecurringTransaction[];
  setTemplates: (templates: RecurringTransaction[]) => void;
  settings: BudgetSettings;
}

const RecurringManager: React.FC<Props> = ({ isOpen, onClose, templates, setTemplates, settings }) => {
  const [newTemplate, setNewTemplate] = useState<Partial<RecurringTransaction>>({
    name: '',
    amount: 0,
    category: settings.expenseCategories[0],
    account: settings.accounts[0],
    type: 'expense',
    dayOfMonth: 1,
    frequency: 'monthly'
  });

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newTemplate.name || !newTemplate.amount) return;
    
    const template: RecurringTransaction = {
      ...newTemplate as RecurringTransaction,
      id: crypto.randomUUID(),
      category: newTemplate.category || (newTemplate.type === 'income' ? settings.incomeCategories[0] : settings.expenseCategories[0])
    };
    
    setTemplates([...templates, template]);
    setNewTemplate({
      ...newTemplate,
      name: '',
      amount: 0
    });
  };

  const handleDelete = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
  };

  const incomeTemplates = templates.filter(t => t.type === 'income');
  const expenseTemplates = templates.filter(t => t.type === 'expense');

  const totalRecurringIncome = incomeTemplates.reduce((sum, t) => sum + t.amount, 0);
  const totalRecurringExpenses = expenseTemplates.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-6 w-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-800">Recurring Management</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <ArrowUpCircleIcon className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scheduled Income</p>
              <p className="text-lg font-bold text-emerald-600">${totalRecurringIncome.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <div className="bg-rose-100 p-2 rounded-lg">
              <ArrowDownCircleIcon className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scheduled Bills</p>
              <p className="text-lg font-bold text-rose-600">${totalRecurringExpenses.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="bg-white p-5 rounded-2xl border-2 border-indigo-50 space-y-4">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Create New Recurring Item</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description</label>
                <input 
                  type="text" 
                  placeholder="e.g. Monthly Salary or Rent"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  value={newTemplate.amount || ''}
                  onChange={(e) => setNewTemplate({ ...newTemplate, amount: parseFloat(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Frequency</label>
                <select 
                  value={newTemplate.frequency}
                  onChange={(e) => setNewTemplate({ ...newTemplate, frequency: e.target.value as 'monthly' | 'weekly' })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Type</label>
                <div className="flex p-1 bg-slate-100 rounded-xl">
                  {(['expense', 'income'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        const defaultCat = t === 'income' ? settings.incomeCategories[0] : settings.expenseCategories[0];
                        setNewTemplate({ ...newTemplate, type: t, category: defaultCat });
                      }}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg capitalize transition-all ${newTemplate.type === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
                <select 
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none appearance-none"
                >
                  {(newTemplate.type === 'income' ? settings.incomeCategories : settings.expenseCategories).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Day</label>
                <input 
                  type="number" 
                  min="1" max="31"
                  value={newTemplate.dayOfMonth}
                  onChange={(e) => setNewTemplate({ ...newTemplate, dayOfMonth: parseInt(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none"
                />
              </div>
              <div className="md:col-span-3 flex items-end">
                <button 
                  onClick={handleAdd}
                  className="w-full h-[42px] bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                >
                  <PlusCircleIcon className="h-5 w-5" /> Save Template
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                <ArrowUpCircleIcon className="h-4 w-4" /> Recurring Income
              </h3>
              {incomeTemplates.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 text-sm">No scheduled income found.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  {incomeTemplates.map(t => (
                    <RecurringItemRow key={t.id} template={t} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-rose-600 uppercase tracking-widest flex items-center gap-2">
                <ArrowDownCircleIcon className="h-4 w-4" /> Recurring Bills
              </h3>
              {expenseTemplates.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 text-sm">No scheduled bills found.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  {expenseTemplates.map(t => (
                    <RecurringItemRow key={t.id} template={t} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50">
          <button 
            onClick={onClose}
            className="w-full bg-slate-900 text-white font-bold py-3 rounded-2xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
          >
            Finished
          </button>
        </div>
      </div>
    </div>
  );
};

interface RowProps {
  template: RecurringTransaction;
  onDelete: (id: string) => void;
}

const RecurringItemRow: React.FC<RowProps> = ({ template, onDelete }) => (
  <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${template.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
        {template.dayOfMonth}
      </div>
      <div>
        <p className="font-bold text-slate-800 text-sm">{template.name}</p>
        <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-tighter">
          {template.category} • {template.frequency}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <p className={`font-bold text-sm ${template.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
        {template.type === 'income' ? '+' : '-'}${template.amount.toFixed(2)}
      </p>
      <button 
        onClick={() => onDelete(template.id)}
        className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
        title="Remove Template"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  </div>
);

export default RecurringManager;