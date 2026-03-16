
import React, { useState } from 'react';
import { SparklesIcon, CheckCircleIcon, ArrowRightIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import { Transaction } from '../types.js';
import { getFinancialAdvice, AdviceOutput } from '../services/geminiService.js';

interface Props {
  income: number;
  expenses: number;
  balance: number;
  transactions: Transaction[];
}

const SUGGESTED_GOALS = [
  "Build emergency fund",
  "Reduce grocery spend",
  "Plan for vacation",
  "Pay off credit card",
  "Invest surplus"
];

const AICoach: React.FC<Props> = ({ income, expenses, balance, transactions }) => {
  const [goal, setGoal] = useState("");
  const [advice, setAdvice] = useState<AdviceOutput | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async (predefinedGoal?: string) => {
    const finalGoal = predefinedGoal || goal;
    if (!finalGoal) return;
    
    setLoading(true);
    setAdvice(null);
    try {
      const result = await getFinancialAdvice(finalGoal, income, expenses, balance, transactions);
      if (result) setAdvice(result);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-slate-100 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
            <SparklesIcon className="h-6 w-6 text-indigo-100" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Personal Financial Coach</h3>
            <p className="text-indigo-100 text-xs opacity-80">AI-powered strategies based on your spending</p>
          </div>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {!advice && !loading && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">What's your goal?</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Save $500 this month..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
                />
                <button 
                  onClick={() => handleAsk()}
                  disabled={!goal}
                  className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-2xl text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200"
                >
                  Analyze
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {SUGGESTED_GOALS.map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setGoal(g);
                    handleAsk(g);
                  }}
                  className="text-[11px] font-semibold text-slate-500 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-3 py-1.5 rounded-full transition-colors border border-transparent hover:border-indigo-100"
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <SparklesIcon className="h-6 w-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center">
              <p className="text-slate-800 font-bold">Crunching your numbers...</p>
              <p className="text-slate-400 text-xs mt-1">Building a personalized savings roadmap</p>
            </div>
          </div>
        )}

        {advice && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex gap-4">
              <div className="bg-white p-2 h-fit rounded-lg shadow-sm">
                <LightBulbIcon className="h-5 w-5 text-indigo-600" />
              </div>
              <p className="text-sm text-indigo-900 leading-relaxed italic">
                "{advice.summary}"
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Your Action Roadmap</h4>
              <div className="grid gap-4">
                {advice.steps.map((step, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs z-10">
                        {i + 1}
                      </div>
                      {i < advice.steps.length - 1 && (
                        <div className="w-0.5 h-full bg-slate-100 my-1" />
                      )}
                    </div>
                    <div className="pb-4 flex-1">
                      <h5 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-indigo-600 transition-colors">{step.title}</h5>
                      <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircleIcon className="h-4 w-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider">{advice.encouragement}</span>
              </div>
              <button 
                onClick={() => setAdvice(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
              >
                Set new goal <ArrowRightIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AICoach;