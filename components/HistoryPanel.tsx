import React from 'react';
import { HistoryItem } from '../types';
import { Clock, X, Trash2, ArrowRight } from 'lucide-react';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onSelect,
  onClear
}) => {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div 
        className={`
          fixed inset-y-0 right-0 w-full sm:w-96 
          bg-white/80 backdrop-blur-2xl 
          border-l border-white/50 
          shadow-2xl z-50 
          transform transition-transform duration-300 ease-out
          flex flex-col
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200/50 bg-white/40">
          <div className="flex items-center gap-2 text-slate-800">
            <Clock className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold">History</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Clock size={48} className="opacity-20" />
              <p>No recent history</p>
            </div>
          ) : (
            history.map((item, index) => (
              <div 
                key={`${item.url}-${index}`}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                className="
                  group relative flex gap-4 p-3 rounded-xl 
                  bg-white/50 border border-slate-100 
                  hover:bg-white/80 hover:shadow-md hover:scale-[1.01] 
                  transition-all duration-200 cursor-pointer
                "
              >
                <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                  <img 
                    src={item.url} 
                    alt="thumbnail" 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="font-medium text-slate-800 text-sm line-clamp-2 leading-snug mb-1">
                    {item.title || 'Untitled'}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {item.platform}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                   <ArrowRight size={16} />
                </div>
              </div>
            ))
          )}
        </div>

        {history.length > 0 && (
          <div className="p-4 border-t border-slate-200/50 bg-white/40">
            <button 
              onClick={onClear}
              className="w-full py-3 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
            >
              <Trash2 size={16} />
              Clear History
            </button>
          </div>
        )}
      </div>
    </>
  );
};