
import React, { useState, useRef, useEffect } from 'react';
import { SparklesIcon, PhotoIcon, XMarkIcon, CameraIcon, ClockIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { BudgetSettings, Transaction, TransactionType } from '../types.js';
import { parseTransactionFromText, extractTransactionsFromImage, suggestCategory } from '../services/geminiService.js';
import CameraModal from './CameraModal.js';

interface Props {
  settings: BudgetSettings;
  onAdd: (tx: Omit<Transaction, 'id'> | Transaction) => void;
  onReviewRequest: (txs: Partial<Transaction>[]) => void;
  currentMonth: string;
  editingTransaction?: Transaction | null;
  onCancelEdit?: () => void;
}

const TransactionForm: React.FC<Props> = ({ settings, onAdd, onReviewRequest, currentMonth, editingTransaction, onCancelEdit }) => {
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: settings.expenseCategories[0]?.name || '',
    subCategory: '',
    account: settings.accounts[0],
    type: 'expense' as TransactionType,
    date: new Date().toISOString().split('T')[0],
    budgetMonth: currentMonth,
    isRecurring: false
  });

  const [isMonthOverridden, setIsMonthOverridden] = useState(false);
  const [magicText, setMagicText] = useState("");
  const [showMagic, setShowMagic] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTransaction) {
      setFormData({
        name: editingTransaction.name,
        amount: editingTransaction.amount.toString(),
        category: editingTransaction.category,
        subCategory: editingTransaction.subCategory || '',
        account: editingTransaction.account,
        type: editingTransaction.type,
        date: editingTransaction.date,
        budgetMonth: editingTransaction.budgetMonth,
        isRecurring: editingTransaction.isRecurring
      });
      setIsMonthOverridden(true);
      setShowMagic(false);
    } else {
      resetForm();
    }
  }, [editingTransaction, settings, currentMonth]);

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      category: settings.expenseCategories[0]?.name || '',
      subCategory: '',
      account: settings.accounts[0],
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      budgetMonth: currentMonth,
      isRecurring: false
    });
    setIsMonthOverridden(false);
  };

  const handleDateChange = (date: string) => {
    setFormData(prev => ({
      ...prev,
      date,
      budgetMonth: isMonthOverridden ? prev.budgetMonth : date.slice(0, 7)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return;

    const txData = {
      ...formData,
      amount: parseFloat(formData.amount),
      budgetMonth: formData.budgetMonth
    };

    if (editingTransaction) {
      onAdd({ ...txData, id: editingTransaction.id });
    } else {
      onAdd(txData);
    }

    resetForm();
  };

  const handleMagicFill = async () => {
    if (!magicText) return;
    setLoading(true);
    // Note: parseTransactionFromText might need updates to support sub-categories
    const expenseCategoryNames = settings.expenseCategories.map(c => c.name);
    const incomeCategoryNames = settings.incomeCategories.map(c => c.name);
    
    const result = await parseTransactionFromText(magicText, expenseCategoryNames, incomeCategoryNames);
    if (result) {
      setFormData(prev => ({
        ...prev,
        name: result.name || prev.name,
        amount: result.amount?.toString() || prev.amount,
        type: (result.type as TransactionType) || prev.type,
        category: result.category || prev.category,
        date: result.date || prev.date,
        budgetMonth: result.date ? result.date.slice(0, 7) : prev.budgetMonth
      }));
      setShowMagic(false);
      setMagicText("");
    }
    setLoading(false);
  };

  const handleNameBlur = async () => {
    if (!formData.name || formData.category !== settings.expenseCategories[0]?.name || editingTransaction) return;
    const expenseCategoryNames = settings.expenseCategories.map(c => c.name);
    const incomeCategoryNames = settings.incomeCategories.map(c => c.name);
    
    const suggestion = await suggestCategory(formData.name, expenseCategoryNames, incomeCategoryNames);
    if (suggestion) {
      setFormData(prev => ({
        ...prev,
        type: suggestion.type,
        category: suggestion.category
      }));
    }
  };

  const handleCapturedImage = async (base64: string, mimeType: string) => {
    setLoading(true);
    try {
      const expenseCategoryNames = settings.expenseCategories.map(c => c.name);
      const incomeCategoryNames = settings.incomeCategories.map(c => c.name);
      
      const txs = await extractTransactionsFromImage(base64, mimeType, expenseCategoryNames, incomeCategoryNames);
      if (txs) onReviewRequest(txs);
    } catch (err) {
      console.error("Failed to process captured image", err);
    }
    setLoading(false);
  };

  const currentCategories = formData.type === 'income' ? settings.incomeCategories : settings.expenseCategories;
  const selectedCategoryItem = currentCategories.find(c => c.name === formData.category);
  const subCategories = selectedCategoryItem?.subCategories || [];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      await handleCapturedImage(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const isDeferred = formData.date.slice(0, 7) !== formData.budgetMonth;

  return (
    <>
      <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 p-6 transition-all ${editingTransaction ? 'ring-2 ring-indigo-500 bg-indigo-50/10' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-800">
            {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
          </h3>
          <div className="flex gap-2">
            {!editingTransaction && (
              <>
                <button 
                  type="button" 
                  onClick={() => setShowCamera(true)}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Scan with Camera"
                >
                  <CameraIcon className="h-5 w-5" />
                </button>
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Upload Receipt Photo"
                >
                  <PhotoIcon className="h-5 w-5" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                <button 
                  type="button" 
                  onClick={() => setShowMagic(!showMagic)}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="AI Magic Fill"
                >
                  <SparklesIcon className="h-5 w-5" />
                </button>
              </>
            )}
            {editingTransaction && (
              <button 
                type="button" 
                onClick={onCancelEdit}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Cancel Edit"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {showMagic && !editingTransaction && (
          <div className="mb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <textarea 
              value={magicText}
              onChange={(e) => setMagicText(e.target.value)}
              placeholder="e.g. 'Spent $42.50 on pizza last night'"
              className="w-full text-sm p-3 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
            />
            <button 
              onClick={handleMagicFill}
              disabled={loading}
              className="w-full bg-indigo-600 text-white text-sm font-bold py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Thinking...' : 'Fill with AI'}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            {(['expense', 'income', 'return'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setFormData({ ...formData, type: t })}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${formData.type === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onBlur={handleNameBlur}
              placeholder="What was it for?"
              className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount</label>
              <input 
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all text-sm font-bold"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trans. Date</label>
              <input 
                type="date"
                value={formData.date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Budget Period</label>
              {isDeferred && (
                <span className="text-[9px] font-black text-amber-600 uppercase flex items-center gap-1">
                  <ClockIcon className="h-2.5 w-2.5" /> Deferred
                </span>
              )}
            </div>
            <div className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${isDeferred ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
               <input 
                type="month"
                value={formData.budgetMonth}
                onChange={(e) => {
                  setFormData({ ...formData, budgetMonth: e.target.value });
                  setIsMonthOverridden(true);
                }}
                className="w-full bg-transparent outline-none text-sm font-black text-slate-700 uppercase"
              />
              {isMonthOverridden && (
                <button 
                  type="button" 
                  onClick={() => {
                    setIsMonthOverridden(false);
                    setFormData(prev => ({ ...prev, budgetMonth: prev.date.slice(0, 7) }));
                  }}
                  className="p-1 text-slate-300 hover:text-indigo-600 transition-colors"
                  title="Reset to Date"
                >
                  <ArrowRightIcon className="h-3 w-3 rotate-180" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value, subCategory: '' })}
                className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none text-sm"
              >
                {(formData.type === 'income' ? settings.incomeCategories : settings.expenseCategories).map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            
            {subCategories.length > 0 ? (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sub-Category</label>
                <select 
                  value={formData.subCategory}
                  onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none text-sm"
                >
                  <option value="">Select...</option>
                  {subCategories.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Account</label>
                <select 
                  value={formData.account}
                  onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none text-sm"
                >
                  {settings.accounts.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {subCategories.length > 0 && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Account</label>
              <select 
                value={formData.account}
                onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none text-sm"
              >
                {settings.accounts.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox" 
              id="recurring"
              checked={formData.isRecurring}
              onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="recurring" className="text-sm text-slate-600">Mark as recurring expense</label>
          </div>

          <div className="flex gap-2 mt-2">
            <button 
              type="submit" 
              disabled={loading}
              className={`flex-1 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-slate-200 ${editingTransaction ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'}`}
            >
              {loading ? 'Processing...' : editingTransaction ? 'Update Transaction' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>

      <CameraModal 
        isOpen={showCamera} 
        onClose={() => setShowCamera(false)} 
        onCapture={handleCapturedImage} 
      />
    </>
  );
};

export default TransactionForm;