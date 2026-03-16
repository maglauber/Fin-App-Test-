import React, { useState, useEffect, useMemo } from 'react';
import { BudgetSettings, CategoryItem } from '../types.js';
import { 
  XMarkIcon, 
  TagIcon, 
  BanknotesIcon, 
  WalletIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: BudgetSettings;
  onSave: (settings: BudgetSettings) => void;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [showConfirm, setShowConfirm] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLocalSettings(settings);
    setShowConfirm(false);
  }, [settings, isOpen]);

  const totalBudgeted = useMemo(() => {
    return Object.values(localSettings.budgets).reduce<number>((acc, val) => acc + (Number(val) || 0), 0);
  }, [localSettings.budgets]);

  if (!isOpen) return null;

  const toggleExpand = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  const handleAddCategory = (type: 'expense' | 'income' | 'account') => {
    if (type === 'account') {
      const newName = `New Account`;
      let finalName = newName;
      let counter = 1;
      while (localSettings.accounts.includes(finalName)) {
        finalName = `${newName} ${counter++}`;
      }
      setLocalSettings({
        ...localSettings,
        accounts: [...localSettings.accounts, finalName]
      });
    } else {
      const key = type === 'income' ? 'incomeCategories' : 'expenseCategories';
      const newName = `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
      
      let finalName = newName;
      let counter = 1;
      while (localSettings[key].some(c => c.name === finalName)) {
        finalName = `${newName} ${counter++}`;
      }

      setLocalSettings({
        ...localSettings,
        [key]: [...localSettings[key], { name: finalName, subCategories: [] }]
      });
      // Auto expand the new category
      setExpandedCategories(prev => ({ ...prev, [finalName]: true }));
    }
  };

  const handleAddSubCategory = (type: 'expense' | 'income', categoryIndex: number) => {
    const key = type === 'income' ? 'incomeCategories' : 'expenseCategories';
    const categories = [...localSettings[key]];
    const category = { ...categories[categoryIndex] };
    
    const newName = "New Sub-category";
    let finalName = newName;
    let counter = 1;
    while (category.subCategories.includes(finalName)) {
      finalName = `${newName} ${counter++}`;
    }

    category.subCategories = [...category.subCategories, finalName];
    categories[categoryIndex] = category;

    setLocalSettings({
      ...localSettings,
      [key]: categories
    });
  };

  const handleDeleteCategory = (type: 'expense' | 'income' | 'account', index: number) => {
    if (type === 'account') {
      const categoryName = localSettings.accounts[index];
      const newList = [...localSettings.accounts];
      newList.splice(index, 1);
      const newBalances = { ...localSettings.initialBalances };
      delete newBalances[categoryName];

      setLocalSettings({
        ...localSettings,
        accounts: newList,
        initialBalances: newBalances
      });
    } else {
      const key = type === 'income' ? 'incomeCategories' : 'expenseCategories';
      const categoryName = localSettings[key][index].name;
      const newList = [...localSettings[key]];
      newList.splice(index, 1);

      const newBudgets = { ...localSettings.budgets };
      if (type === 'expense') delete newBudgets[categoryName];

      setLocalSettings({
        ...localSettings,
        [key]: newList,
        budgets: newBudgets
      });
    }
  };

  const handleDeleteSubCategory = (type: 'expense' | 'income', categoryIndex: number, subIndex: number) => {
    const key = type === 'income' ? 'incomeCategories' : 'expenseCategories';
    const categories = [...localSettings[key]];
    const category = { ...categories[categoryIndex] };
    
    const newSubCategories = [...category.subCategories];
    newSubCategories.splice(subIndex, 1);
    category.subCategories = newSubCategories;
    categories[categoryIndex] = category;

    setLocalSettings({
      ...localSettings,
      [key]: categories
    });
  };

  const handleRenameCategory = (type: 'expense' | 'income' | 'account', index: number, newName: string) => {
    if (type === 'account') {
      const oldName = localSettings.accounts[index];
      if (oldName === newName) return;
      const newList = [...localSettings.accounts];
      newList[index] = newName;
      const newBalances = { ...localSettings.initialBalances };
      if (newBalances[oldName] !== undefined) {
        newBalances[newName] = newBalances[oldName];
        delete newBalances[oldName];
      }
      setLocalSettings({
        ...localSettings,
        accounts: newList,
        initialBalances: newBalances
      });
    } else {
      const key = type === 'income' ? 'incomeCategories' : 'expenseCategories';
      const oldName = localSettings[key][index].name;
      if (oldName === newName) return;

      const newList = [...localSettings[key]];
      newList[index] = { ...newList[index], name: newName };

      const newBudgets = { ...localSettings.budgets };
      if (type === 'expense' && newBudgets[oldName] !== undefined) {
        newBudgets[newName] = newBudgets[oldName];
        delete newBudgets[oldName];
      }

      setLocalSettings({
        ...localSettings,
        [key]: newList,
        budgets: newBudgets
      });
      
      // Update expanded state key
      if (expandedCategories[oldName]) {
        const newExpanded = { ...expandedCategories };
        newExpanded[newName] = newExpanded[oldName];
        delete newExpanded[oldName];
        setExpandedCategories(newExpanded);
      }
    }
  };

  const handleRenameSubCategory = (type: 'expense' | 'income', categoryIndex: number, subIndex: number, newName: string) => {
    const key = type === 'income' ? 'incomeCategories' : 'expenseCategories';
    const categories = [...localSettings[key]];
    const category = { ...categories[categoryIndex] };
    
    const newSubCategories = [...category.subCategories];
    newSubCategories[subIndex] = newName;
    category.subCategories = newSubCategories;
    categories[categoryIndex] = category;

    setLocalSettings({
      ...localSettings,
      [key]: categories
    });
  };

  const handleUpdateBudget = (category: string, value: string) => {
    setLocalSettings({
      ...localSettings,
      budgets: {
        ...localSettings.budgets,
        [category]: parseFloat(value) || 0
      }
    });
  };

  const handleUpdateInitialBalance = (account: string, value: string) => {
    setLocalSettings({
      ...localSettings,
      initialBalances: {
        ...localSettings.initialBalances,
        [account]: parseFloat(value) || 0
      }
    });
  };

  const handleApply = () => {
    onSave(localSettings);
    onClose();
  };

  const CategoryList = ({ type, items }: { type: 'expense' | 'income', items: CategoryItem[] }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {`${type.charAt(0).toUpperCase() + type.slice(1)} Categories`}
        </label>
        <button 
          onClick={() => handleAddCategory(type)}
          className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase"
        >
          <PlusIcon className="h-3 w-3" /> Add
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={`${type}-${idx}`} className="flex flex-col gap-2 bg-slate-50/50 rounded-xl border border-slate-100 p-2">
            <div className="flex items-center gap-2 group">
              <button 
                onClick={() => toggleExpand(item.name)}
                className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {expandedCategories[item.name] ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4" />
                )}
              </button>
              <input 
                type="text"
                value={item.name}
                onChange={(e) => handleRenameCategory(type, idx, e.target.value)}
                className="flex-1 p-2 bg-white border border-slate-100 rounded-lg focus:border-indigo-500 outline-none transition-all text-xs font-bold text-slate-700"
              />
              <button 
                onClick={() => handleDeleteCategory(type, idx)}
                className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
            
            {expandedCategories[item.name] && (
              <div className="pl-8 pr-2 pb-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
                {item.subCategories.map((sub, subIdx) => (
                  <div key={`${type}-${idx}-${subIdx}`} className="flex items-center gap-2 group/sub">
                    <div className="w-2 h-px bg-slate-200"></div>
                    <input 
                      type="text"
                      value={sub}
                      onChange={(e) => handleRenameSubCategory(type, idx, subIdx, e.target.value)}
                      className="flex-1 p-1.5 bg-white border border-slate-100 rounded-md focus:border-indigo-500 outline-none transition-all text-[11px] text-slate-600"
                      placeholder="Sub-category name"
                    />
                    <button 
                      onClick={() => handleDeleteSubCategory(type, idx, subIdx)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover/sub:opacity-100 transition-all"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => handleAddSubCategory(type, idx)}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase pl-2 mt-1"
                >
                  <PlusIcon className="h-3 w-3" /> Add Sub-category
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const AccountList = ({ items }: { items: string[] }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Accounts
        </label>
        <button 
          onClick={() => handleAddCategory('account')}
          className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase"
        >
          <PlusIcon className="h-3 w-3" /> Add
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item, idx) => (
          <div key={`account-${idx}`} className="flex items-center gap-2 group">
            <input 
              type="text"
              value={item}
              onChange={(e) => {
                const newList = [...items];
                newList[idx] = e.target.value;
                setLocalSettings({ ...localSettings, accounts: newList });
              }}
              onBlur={(e) => handleRenameCategory('account', idx, e.target.value)}
              className="flex-1 p-2 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-indigo-500 outline-none transition-all text-xs font-medium"
            />
            <button 
              onClick={() => handleDeleteCategory('account', idx)}
              className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 relative">
        
        {showConfirm && (
          <div className="absolute inset-0 z-[60] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-amber-100 p-3 rounded-2xl">
                  <ExclamationTriangleIcon className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Confirm Changes?</h3>
                <p className="text-sm text-slate-500">
                  Modifying categories or starting balances may affect your dashboard analytics and liquidity calculations.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleApply}
                  className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  Yes, Apply Changes
                </button>
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="w-full bg-slate-100 text-slate-600 font-bold py-3.5 rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">System Configuration</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-indigo-600">
              <TagIcon className="h-5 w-5" />
              <h3 className="font-bold text-sm uppercase tracking-widest">Labels & Accounts</h3>
            </div>
            <div className="space-y-8">
              <CategoryList type="expense" items={localSettings.expenseCategories} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <CategoryList type="income" items={localSettings.incomeCategories} />
                <AccountList items={localSettings.accounts} />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600">
                <BanknotesIcon className="h-5 w-5" />
                <h3 className="font-bold text-sm uppercase tracking-widest">Monthly Spending Targets</h3>
              </div>
              <div className="bg-indigo-50 px-3 py-1 rounded-full text-[10px] font-bold text-indigo-600 uppercase">
                Total Budget: ${totalBudgeted.toLocaleString()}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {localSettings.expenseCategories.map(cat => (
                <div key={cat.name} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-bold text-slate-600 truncate">{cat.name}</span>
                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl shadow-sm border border-slate-100">
                      <span className="text-slate-300 text-[10px]">$</span>
                      <input 
                        type="number" 
                        value={localSettings.budgets[cat.name] || ''}
                        onChange={(e) => handleUpdateBudget(cat.name, e.target.value)}
                        className="w-20 bg-transparent text-right text-sm font-bold text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                  
                  {cat.subCategories.length > 0 && (
                    <div className="pl-2 space-y-2 border-l-2 border-slate-200 ml-1 mt-1">
                      {cat.subCategories.map(sub => (
                        <div key={sub} className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-medium text-slate-500 truncate">{sub}</span>
                          <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-lg shadow-sm border border-slate-100">
                            <span className="text-slate-300 text-[9px]">$</span>
                            <input 
                              type="number" 
                              value={localSettings.budgets[`${cat.name}:${sub}`] || ''}
                              onChange={(e) => handleUpdateBudget(`${cat.name}:${sub}`, e.target.value)}
                              className="w-14 bg-transparent text-right text-xs font-bold text-slate-600 outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-2 text-indigo-600">
              <WalletIcon className="h-5 w-5" />
              <h3 className="font-bold text-sm uppercase tracking-widest">Initial Balances</h3>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider -mt-4">Specify the baseline for accurate lifetime account tracking.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {localSettings.accounts.map(acc => (
                <div key={acc} className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all">
                  <span className="text-xs font-bold text-slate-600 truncate">{acc}</span>
                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl shadow-sm border border-slate-100">
                    <span className="text-slate-300 text-[10px]">$</span>
                    <input 
                      type="number" 
                      value={localSettings.initialBalances[acc] !== undefined ? localSettings.initialBalances[acc] : ''}
                      onChange={(e) => handleUpdateInitialBalance(acc, e.target.value)}
                      placeholder="0.00"
                      className="w-20 bg-transparent text-right text-sm font-bold text-slate-800 outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4">
          <button onClick={onClose} className="flex-1 text-slate-500 font-bold py-3.5 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-200 text-sm">
            Cancel
          </button>
          <button onClick={() => setShowConfirm(true)} className="flex-1 bg-indigo-600 text-white font-bold py-3.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 text-sm">
            <CheckCircleIcon className="h-5 w-5" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;