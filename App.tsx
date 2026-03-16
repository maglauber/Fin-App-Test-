
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
  ArrowsRightLeftIcon
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