
import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  result: string;
  isLoading: boolean;
}

const AnalysisModal: React.FC<Props> = ({ isOpen, onClose, result, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <SparklesIcon className="h-6 w-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-800">Budget Analysis</h2>
        </div>
        
        <div className="p-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-slate-400 font-medium animate-pulse">Analyzing your spending...</p>
            </div>
          ) : (
            <div className="prose prose-slate max-w-none">
              {result.split('\n').map((line, i) => (
                <p key={i} className="text-slate-600 text-sm leading-relaxed mb-4">{line.replace(/\*\*/g, '')}</p>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100">
          <button 
            onClick={onClose}
            className="w-full bg-slate-900 text-white font-bold py-3 rounded-2xl hover:bg-slate-800 transition-colors"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
