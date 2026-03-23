
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PlusIcon, 
  ChartBarIcon, 
  WalletIcon, 
  Cog6ToothIcon, 
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  BeakerIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import { Transaction, BudgetSettings, MonthSummary, RecurringTransaction } from './types.js';
import { INITIAL_SETTINGS } from './constants.js';
import TransactionForm from './components/TransactionForm.js';
import TransactionList from './components/TransactionList.js';
import SummaryCards from './components/SummaryCards.js';
import AnalyticsView from './components/AnalyticsView.js';
import ComparisonView from './components/ComparisonView.js';
import SettingsModal from './components/SettingsModal.js';
import AICoach from './components/AICoach.js';
import AnalysisModal from './components/AnalysisModal.js';
import ReviewModal from './components/ReviewModal.js';
import RecurringManager from './components/RecurringManager.js';
import BudgetPerformanceChart from './components/BudgetPerformanceChart.js';
import BudgetBreakdown from './components/BudgetBreakdown.js';
import { getBudgetAnalysis } from './services/geminiService.js';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'comparison'>('dashboard');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTransaction[]>([]);
  const [settings, setSettings] = useState<BudgetSettings>(INITIAL_SETTINGS);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedReview, setExtractedReview] = useState<Partial<Transaction>[] | null>(null);

  useEffect(() => {
    try {
      const savedTxs = localStorage.getItem('zen_transactions');
      const savedSettings = localStorage.getItem('zen_settings');
      const savedRecurring = localStorage.getItem('zen_recurring');
      if (savedTxs) setTransactions(JSON.parse(savedTxs));
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        
        // Migration: Convert string[] categories to CategoryItem[]
        if (parsedSettings.expenseCategories && parsedSettings.expenseCategories.length > 0 && typeof parsedSettings.expenseCategories[0] === 'string') {
          parsedSettings.expenseCategories = parsedSettings.expenseCategories.map((c: string) => ({ name: c, subCategories: [] }));
        }
        if (parsedSettings.incomeCategories && parsedSettings.incomeCategories.length > 0 && typeof parsedSettings.incomeCategories[0] === 'string') {
          parsedSettings.incomeCategories = parsedSettings.incomeCategories.map((c: string) => ({ name: c, subCategories: [] }));
        }
        
        setSettings(parsedSettings);
      }
      if (savedRecurring) setRecurringTemplates(JSON.parse(savedRecurring));
    } catch (e) {
      console.error("Failed to load persistence", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('zen_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('zen_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('zen_recurring', JSON.stringify(recurringTemplates));
  }, [recurringTemplates]);

  const currentMonthStr = useMemo(() => 
    currentDate.toISOString().slice(0, 7), 
  [currentDate]);

  const filteredTransactions = useMemo(() => 
    transactions.filter(t => t.budgetMonth === currentMonthStr)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [transactions, currentMonthStr]);

  const totalBudget = useMemo(() => {
    const hierarchy: Record<string, { main: number | null, subs: number }> = {};
    
    Object.entries(settings.budgets).forEach(([key, val]) => {
      const amount = Number(val) || 0;
      if (key.includes(':')) {
        const [main, sub] = key.split(':');
        if (!hierarchy[main]) hierarchy[main] = { main: null, subs: 0 };
        hierarchy[main].subs += amount;
      } else {
        if (!hierarchy[key]) hierarchy[key] = { main: null, subs: 0 };
        hierarchy[key].main = amount;
      }
    });
    
    return Object.values(hierarchy).reduce((sum, item) => {
      if (item.main !== null) return sum + item.main;
      return sum + item.subs;
    }, 0);
  }, [settings.budgets]);

  const monthSummary = useMemo((): MonthSummary => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === 'income') acc.income += t.amount;
      else if (t.type === 'expense') acc.expenses += t.amount;
      else if (t.type === 'return') acc.expenses -= t.amount;
      acc.balance = acc.income - acc.expenses;
      return acc;
    }, { income: 0, expenses: 0, balance: 0 });
  }, [filteredTransactions]);

  const pendingRecurringCount = useMemo(() => {
    return recurringTemplates.filter(template => {
      const exists = filteredTransactions.some(t => 
        t.isRecurring && t.name === template.name && Math.abs(t.amount - template.amount) < 0.01
      );
      return !exists;
    }).length;
  }, [recurringTemplates, filteredTransactions]);

  const handleSaveTransaction = (tx: Omit<Transaction, 'id'> | Transaction) => {
    if ('id' in tx && tx.id) {
      setTransactions(prev => prev.map(t => t.id === (tx as Transaction).id ? (tx as Transaction) : t));
      setEditingTransaction(null);
    } else {
      const newTx = { ...tx, id: generateId() };
      setTransactions(prev => [...prev, newTx as Transaction]);
    }
  };

  const handleApplyRecurring = () => {
    const newTransactions: Transaction[] = [];
    recurringTemplates.forEach(template => {
      const exists = filteredTransactions.some(t => 
        t.isRecurring && t.name === template.name && Math.abs(t.amount - template.amount) < 0.01
      );
      
      if (!exists) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const dateObj = new Date(year, month, template.dayOfMonth);
        
        newTransactions.push({
          id: generateId(),
          name: template.name,
          amount: template.amount,
          category: template.category,
          account: template.account,
          type: template.type,
          date: dateObj.toISOString().split('T')[0],
          budgetMonth: currentMonthStr,
          isRecurring: true
        });
      }
    });
    setTransactions(prev => [...prev, ...newTransactions]);
  };

  const handleBulkAdd = (txs: Transaction[]) => {
    setTransactions(prev => [...prev, ...txs]);
    setExtractedReview(null);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    if (editingTransaction?.id === id) {
      setEditingTransaction(null);
    }
  };

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
    setEditingTransaction(null);
  };

  const handleResetData = () => {
    if (window.confirm("Are you sure you want to delete all your transactions, recurring templates, and settings? This cannot be undone.")) {
      setTransactions([]);
      setRecurringTemplates([]);
      setSettings(INITIAL_SETTINGS);
      localStorage.removeItem('zen_transactions');
      localStorage.removeItem('zen_settings');
      localStorage.removeItem('zen_recurring');
    }
  };

  const handleLoadTestData = () => {
    if (window.confirm("This will overwrite your current data with test data. Proceed?")) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const monthStr = currentDate.toISOString().slice(0, 7);
      
      const testData: Transaction[] = [
        { id: generateId(), name: 'TechCorp Salary', amount: 5200, category: 'Salary', account: 'Checking', type: 'income', date: new Date(year, month, 1).toISOString().split('T')[0], budgetMonth: monthStr, isRecurring: true },
        { id: generateId(), name: 'Apartment Rent', amount: 1500, category: 'Rent', account: 'Checking', type: 'expense', date: new Date(year, month, 2).toISOString().split('T')[0], budgetMonth: monthStr, isRecurring: true },
        { id: generateId(), name: 'Whole Foods', amount: 185.50, category: 'Food', subCategory: 'Groceries', account: 'Credit Card', type: 'expense', date: new Date(year, month, 3).toISOString().split('T')[0], budgetMonth: monthStr },
        { id: generateId(), name: 'Electric Bill', amount: 120, category: 'Utilities', subCategory: 'Electricity', account: 'Checking', type: 'expense', date: new Date(year, month, 5).toISOString().split('T')[0], budgetMonth: monthStr, isRecurring: true },
        { id: generateId(), name: 'Internet', amount: 80, category: 'Utilities', subCategory: 'Internet', account: 'Credit Card', type: 'expense', date: new Date(year, month, 7).toISOString().split('T')[0], budgetMonth: monthStr, isRecurring: true },
        { id: generateId(), name: 'Gas Station', amount: 45, category: 'Transport', subCategory: 'Gas', account: 'Credit Card', type: 'expense', date: new Date(year, month, 8).toISOString().split('T')[0], budgetMonth: monthStr },
        { id: generateId(), name: 'Netflix', amount: 15.99, category: 'Entertainment', subCategory: 'Subscriptions', account: 'Credit Card', type: 'expense', date: new Date(year, month, 10).toISOString().split('T')[0], budgetMonth: monthStr, isRecurring: true },
        { id: generateId(), name: 'Freelance Client', amount: 850, category: 'Freelance', account: 'Checking', type: 'income', date: new Date(year, month, 12).toISOString().split('T')[0], budgetMonth: monthStr },
        { id: generateId(), name: 'Trader Joe\'s', amount: 120.25, category: 'Food', subCategory: 'Groceries', account: 'Credit Card', type: 'expense', date: new Date(year, month, 14).toISOString().split('T')[0], budgetMonth: monthStr },
        { id: generateId(), name: 'Sushi Restaurant', amount: 75, category: 'Food', subCategory: 'Dining Out', account: 'Credit Card', type: 'expense', date: new Date(year, month, 15).toISOString().split('T')[0], budgetMonth: monthStr },
        { id: generateId(), name: 'Gym Membership', amount: 50, category: 'Health', subCategory: 'Fitness', account: 'Credit Card', type: 'expense', date: new Date(year, month, 16).toISOString().split('T')[0], budgetMonth: monthStr, isRecurring: true },
        { id: generateId(), name: 'Amazon Shopping', amount: 65.40, category: 'Shopping', subCategory: 'Home', account: 'Credit Card', type: 'expense', date: new Date(year, month, 18).toISOString().split('T')[0], budgetMonth: monthStr },
        { id: generateId(), name: 'Coffee Shop', amount: 5.50, category: 'Food', subCategory: 'Snacks', account: 'Cash', type: 'expense', date: new Date(year, month, 19).toISOString().split('T')[0], budgetMonth: monthStr },
        { id: generateId(), name: 'Pharmacy', amount: 25, category: 'Health', subCategory: 'Pharmacy', account: 'Credit Card', type: 'expense', date: new Date(year, month, 22).toISOString().split('T')[0], budgetMonth: monthStr },
        { id: generateId(), name: 'Uber', amount: 18.50, category: 'Transport', subCategory: 'Public Transport', account: 'Credit Card', type: 'expense', date: new Date(year, month, 24).toISOString().split('T')[0], budgetMonth: monthStr },
        { id: generateId(), name: 'Movie Theater', amount: 35, category: 'Entertainment', subCategory: 'Movies', account: 'Credit Card', type: 'expense', date: new Date(year, month, 26).toISOString().split('T')[0], budgetMonth: monthStr },
        { id: generateId(), name: 'Refund Amazon', amount: 65.40, category: 'Shopping', subCategory: 'Home', account: 'Credit Card', type: 'return', date: new Date(year, month, 27).toISOString().split('T')[0], budgetMonth: monthStr }
      ];

      const testRecurring: RecurringTransaction[] = [
        { id: generateId(), name: 'TechCorp Salary', amount: 5200, category: 'Salary', account: 'Checking', type: 'income', dayOfMonth: 1, frequency: 'monthly' },
        { id: generateId(), name: 'Apartment Rent', amount: 1500, category: 'Rent', account: 'Checking', type: 'expense', dayOfMonth: 2, frequency: 'monthly' },
        { id: generateId(), name: 'Electric Bill', amount: 120, category: 'Utilities', account: 'Checking', type: 'expense', dayOfMonth: 5, frequency: 'monthly' },
        { id: generateId(), name: 'Internet', amount: 80, category: 'Utilities', account: 'Credit Card', type: 'expense', dayOfMonth: 7, frequency: 'monthly' },
        { id: generateId(), name: 'Netflix', amount: 15.99, category: 'Entertainment', account: 'Credit Card', type: 'expense', dayOfMonth: 10, frequency: 'monthly' },
        { id: generateId(), name: 'Gym Membership', amount: 50, category: 'Health', account: 'Credit Card', type: 'expense', dayOfMonth: 16, frequency: 'monthly' }
      ];

      setTransactions(testData);
      setRecurringTemplates(testRecurring);
      setSettings(INITIAL_SETTINGS);
    }
  };

  const handleExportData = () => {
    const data = {
      transactions,
      settings,
      recurringTemplates
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenbudget-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.transactions && data.settings) {
          setTransactions(data.transactions);
          setSettings(data.settings);
          if (data.recurringTemplates) {
            setRecurringTemplates(data.recurringTemplates);
          }
          alert("Data imported successfully!");
        } else {
          alert("Invalid backup file format.");
        }
      } catch (error) {
        alert("Error reading backup file.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setShowAnalysis(true);
    try {
      const result = await getBudgetAnalysis(
        currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
        monthSummary.income,
        monthSummary.expenses,
        filteredTransactions
      );
      setAnalysisResult(result);
    } catch (error) {
      setAnalysisResult("Failed to analyze data. Check your API connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <WalletIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              ZenBudget AI
            </h1>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <PlusIcon className="h-4 w-4" /> Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'analytics' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ChartBarIcon className="h-4 w-4" /> Analytics
            </button>
            <button 
              onClick={() => setActiveTab('comparison')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'comparison' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ArrowsRightLeftIcon className="h-4 w-4" /> Comparisons
            </button>
          </div>

          <div className="flex items-center gap-1">
             <button 
              onClick={() => setShowRecurring(true)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative"
              title="Recurring Templates"
            >
              <CalendarIcon className="h-6 w-6" />
              {pendingRecurringCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            <button 
              onClick={handleLoadTestData}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
              title="Load Test Data"
            >
              <BeakerIcon className="h-6 w-6" />
            </button>
            <button 
              onClick={handleExportData}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
              title="Export Data"
            >
              <ArrowDownTrayIcon className="h-6 w-6" />
            </button>
            <label 
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="Import Data"
            >
              <ArrowUpTrayIcon className="h-6 w-6" />
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                onChange={handleImportData} 
              />
            </label>
            <button 
              onClick={handleResetData}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
              title="Reset All Data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
              title="Settings"
            >
              <Cog6ToothIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-24">
        {activeTab !== 'comparison' && (
          <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center">
              <h2 className="text-lg font-semibold text-slate-800 leading-tight">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              {pendingRecurringCount > 0 && (
                <button 
                  onClick={handleApplyRecurring}
                  className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-wider hover:underline"
                >
                  <ArrowPathIcon className="h-3 w-3" /> Sync {pendingRecurringCount} recurring items
                </button>
              )}
            </div>
            <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        )}

        {activeTab === 'dashboard' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               <div className="lg:col-span-8">
                 <AICoach 
                  income={monthSummary.income} 
                  expenses={monthSummary.expenses} 
                  balance={monthSummary.balance}
                  transactions={filteredTransactions}
                />
               </div>
               <div className="lg:col-span-4">
                 <BudgetPerformanceChart 
                  totalBudget={totalBudget}
                  totalSpent={monthSummary.expenses}
                 />
               </div>
            </div>
            
            <SummaryCards 
              summary={monthSummary} 
              settings={settings}
              transactions={transactions}
            />

            <BudgetBreakdown 
              transactions={filteredTransactions} 
              settings={settings} 
              title="Budget Watchlist"
              gridCols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4">
                <TransactionForm 
                  settings={settings} 
                  onAdd={handleSaveTransaction}
                  onReviewRequest={setExtractedReview}
                  currentMonth={currentMonthStr}
                  editingTransaction={editingTransaction}
                  onCancelEdit={() => setEditingTransaction(null)}
                />
              </div>
              <div className="lg:col-span-8">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">Transaction History</h3>
                    <button 
                      onClick={runAnalysis}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
                    >
                      <SparklesIcon className="h-3.5 w-3.5" /> AI Analysis
                    </button>
                  </div>
                  <TransactionList 
                    transactions={filteredTransactions} 
                    onDelete={handleDeleteTransaction}
                    onEdit={setEditingTransaction}
                    settings={settings}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'analytics' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AnalyticsView 
              transactions={filteredTransactions} 
              settings={settings}
              summary={monthSummary}
              currentDate={currentDate}
            />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ComparisonView 
              transactions={transactions}
              settings={settings}
            />
          </div>
        )}
      </main>

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        settings={settings} 
        onSave={setSettings} 
      />
      
      <AnalysisModal 
        isOpen={showAnalysis} 
        onClose={() => setShowAnalysis(false)} 
        result={analysisResult} 
        isLoading={isAnalyzing} 
      />

      {showRecurring && (
        <RecurringManager
          isOpen={showRecurring}
          onClose={() => setShowRecurring(false)}
          templates={recurringTemplates}
          setTemplates={setRecurringTemplates}
          settings={settings}
        />
      )}

      {extractedReview && (
        <ReviewModal 
          extracted={extractedReview} 
          onClose={() => setExtractedReview(null)} 
          onConfirm={handleBulkAdd}
          settings={settings}
        />
      )}
    </div>
  );
};

export default App;