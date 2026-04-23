
import React from 'react';
import { CommMethod } from '../types';

interface CommMethodToggleProps {
  method: CommMethod;
  selected: boolean;
  onToggle: (method: CommMethod) => void;
}

export const CommMethodToggle: React.FC<CommMethodToggleProps> = ({ method, selected, onToggle }) => {
  return (
    <button
      type="button"
      onClick={() => onToggle(method)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 font-bold ${
        selected 
          ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
          : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:border-slate-400 dark:hover:border-white/30 hover:text-slate-700 dark:hover:text-white'
      }`}
    >
      <span className="text-[10px] uppercase tracking-widest">{method}</span>
    </button>
  );
};
