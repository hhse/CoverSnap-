
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Link, ClipboardPaste, ArrowRight, Loader2, Image as ImageIcon, AlertCircle, History } from 'lucide-react';
import { Background } from './components/Background';
import { GlassCard } from './components/GlassCard';
import { ResultDisplay } from './components/ResultDisplay';
import { HistoryPanel } from './components/HistoryPanel';
import { extractCoverImage } from './services/extractorService';
import { ExtractorState, HistoryItem } from './types';

const App: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [state, setState] = useState<ExtractorState>({
    isLoading: false,
    error: null,
    data: null,
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('coversnap_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  // Save history logic
  const saveToHistory = (item: HistoryItem) => {
    const newHistory = [item, ...history.filter(h => h.url !== item.url)].slice(0, 20); // Limit to 20
    setHistory(newHistory);
    localStorage.setItem('coversnap_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('coversnap_history');
  };
  
  // Clear error when input changes
  useEffect(() => {
    if (state.error) {
      setState(prev => ({ ...prev, error: null }));
    }
  }, [inputValue]);

  const vibrate = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handlePaste = async () => {
    vibrate();
    try {
      const text = await navigator.clipboard.readText();
      setInputValue(text);
    } catch (err) {
      console.warn('Clipboard paste failed', err);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    vibrate();
    setState({ isLoading: true, error: null, data: null });

    try {
      const result = await extractCoverImage(inputValue.trim());
      
      const historyItem: HistoryItem = {
        ...result,
        timestamp: Date.now()
      };
      saveToHistory(historyItem);
      
      setState({ isLoading: false, error: null, data: result });
    } catch (err: any) {
      setState({ 
        isLoading: false, 
        error: err.message || 'Something went wrong', 
        data: null 
      });
    }
  };

  const handleReset = () => {
    setInputValue('');
    setState({ isLoading: false, error: null, data: null });
  };

  const loadFromHistory = (item: HistoryItem) => {
     setInputValue(item.originalUrl);
     setState({
       isLoading: false,
       error: null,
       data: item
     });
  };

  return (
    <>
      <Background />
      <div className="min-h-screen flex flex-col p-6 max-w-lg mx-auto relative z-10 font-sans">
        
        {/* Header */}
        <header className="mt-16 mb-12 text-center space-y-4 relative">
          <button 
             onClick={() => { vibrate(); setIsHistoryOpen(true); }}
             className="absolute top-0 right-0 p-3 bg-white/50 backdrop-blur-md rounded-full text-slate-600 hover:bg-white/80 hover:text-blue-600 transition-all shadow-sm hover:scale-105 active:scale-95"
             title="History"
          >
             <History size={20} />
          </button>

          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-white/70 backdrop-blur-md shadow-sm ring-1 ring-white/80 animate-slide-up transition-transform duration-300 hover:scale-105 cursor-default">
            <ImageIcon className="text-blue-500 w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-slate-800 via-blue-600 to-slate-800 tracking-tight drop-shadow-sm animate-slide-up" style={{ animationDelay: '100ms' }}>
            CoverSnap
          </h1>
          <p className="text-slate-500 text-lg font-medium tracking-wide animate-slide-up" style={{ animationDelay: '200ms' }}>
            Instant HD Cover Extraction
          </p>
        </header>

        {/* Main Content Area */}
        <main className="flex-1">
          {!state.data ? (
            <GlassCard delay={300} className="space-y-6 shadow-xl">
              <div className="text-center space-y-1 mb-6">
                 <h2 className="text-xl font-bold text-slate-800">Get Started</h2>
                 <p className="text-sm text-slate-500">Paste link from WeChat, Zhihu, Bilibili...</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Link className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="url"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Paste article link here..."
                    className="
                      w-full pl-12 pr-12 py-4 
                      bg-white/70 
                      backdrop-blur-sm 
                      border border-slate-200/60
                      rounded-2xl 
                      text-slate-800
                      placeholder-slate-400
                      shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]
                      focus:outline-none 
                      focus:ring-2 
                      focus:ring-blue-400/30 
                      focus:bg-white/90
                      focus:border-blue-300
                      transition-all duration-300
                    "
                  />
                  {inputValue === '' && (
                    <button
                      type="button"
                      onClick={handlePaste}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors transform hover:scale-110 active:scale-95"
                      title="Paste from clipboard"
                    >
                      <ClipboardPaste className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={state.isLoading || !inputValue}
                  className={`
                    w-full py-4 rounded-2xl font-semibold text-white shadow-lg shadow-blue-500/20
                    flex items-center justify-center gap-2
                    transition-all duration-300 transform
                    ${state.isLoading || !inputValue 
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                      : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:shadow-blue-500/40 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98]'}
                  `}
                >
                  {state.isLoading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    <>
                      Extract Cover
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Error Message with Smooth Transition */}
              <div 
                className={`
                  transform transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) origin-top overflow-hidden
                  ${state.error ? 'opacity-100 scale-100 max-h-32 mt-4' : 'opacity-0 scale-95 max-h-0 mt-0'}
                `}
              >
                <div className="p-4 rounded-xl bg-red-50/80 border border-red-100 text-red-600 text-sm flex items-center gap-3 backdrop-blur-sm shadow-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{state.error}</span>
                </div>
              </div>

              {/* Supported Platforms Hints */}
              <div className="pt-6 border-t border-slate-200/50 grid grid-cols-4 gap-2 text-center">
                 <div className="flex flex-col items-center gap-2 opacity-70 hover:opacity-100 transition-opacity cursor-default group">
                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">WeChat</span>
                 </div>
                 <div className="flex flex-col items-center gap-2 opacity-70 hover:opacity-100 transition-opacity cursor-default group">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Zhihu</span>
                 </div>
                 <div className="flex flex-col items-center gap-2 opacity-70 hover:opacity-100 transition-opacity cursor-default group">
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">RedNote</span>
                 </div>
                 <div className="flex flex-col items-center gap-2 opacity-70 hover:opacity-100 transition-opacity cursor-default group">
                    <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Bilibili</span>
                 </div>
              </div>

            </GlassCard>
          ) : (
            <GlassCard delay={0} className="shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Cover Found</h2>
                <button 
                  onClick={() => { vibrate(); handleReset(); }} 
                  className="text-slate-400 hover:text-slate-700 text-sm font-medium px-3 py-1 hover:bg-slate-100 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  Close
                </button>
              </div>
              <ResultDisplay data={state.data} onReset={handleReset} />
            </GlassCard>
          )}
        </main>

        <footer className="mt-10 py-6 text-center text-slate-400 text-xs font-medium border-t border-slate-200/50">
          <p>© 2024 CoverSnap. Designed for Creators.</p>
        </footer>
        
        {/* History Panel */}
        <HistoryPanel 
           isOpen={isHistoryOpen} 
           onClose={() => setIsHistoryOpen(false)} 
           history={history}
           onSelect={loadFromHistory}
           onClear={clearHistory}
        />
      </div>
    </>
  );
};

export default App;
