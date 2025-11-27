import React, { useState } from 'react';
import { ExtractionResult } from '../types';
import { Download, ExternalLink, Image as ImageIcon, Check } from 'lucide-react';

interface ResultDisplayProps {
  data: ExtractionResult;
  onReset: () => void;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ data, onReset }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const vibrate = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleDownload = async () => {
    vibrate();
    try {
      setDownloading(true);
      
      let blob: Blob | null = null;
      let usedExtension = 'jpg';

      // Strategy 1: CORSProxy.io (Fast, direct pipe)
      if (!blob) {
        try {
          const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(data.url)}`);
          if (res.ok) {
            blob = await res.blob();
            // Try to guess extension from content-type
            const type = res.headers.get('content-type');
            if (type && type.includes('png')) usedExtension = 'png';
            else if (type && type.includes('webp')) usedExtension = 'webp';
          }
        } catch (e) {
          console.warn('Strategy 1 (CORSProxy) failed:', e);
        }
      }

      // Strategy 2: wsrv.nl (Specialized Image Proxy - very reliable)
      if (!blob) {
        try {
          // We ask for output=jpg to ensure compatibility if webp isn't desired, 
          // or we can remove output param to get original. Let's keep original format if possible.
          const res = await fetch(`https://wsrv.nl/?url=${encodeURIComponent(data.url)}`);
          if (res.ok) {
             blob = await res.blob();
          }
        } catch (e) {
           console.warn('Strategy 2 (wsrv) failed:', e);
        }
      }

      // Strategy 3: AllOrigins (Fallback)
      if (!blob) {
        try {
          const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(data.url)}`);
          if (res.ok) blob = await res.blob();
        } catch (e) {
          console.warn('Strategy 3 (AllOrigins) failed:', e);
        }
      }

      if (!blob) {
        throw new Error('All download strategies failed');
      }

      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `cover-snap-${Date.now()}.${usedExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (error) {
      console.error('Download failed, trying direct link fallback', error);
      // Ultimate Fallback: Open in new tab if all fetch attempts fail
      window.open(data.url, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Image Preview */}
      <div className="relative group overflow-hidden rounded-2xl shadow-md border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center">
        <img 
          src={data.url} 
          alt={data.title || "Cover Preview"} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <p className="text-white text-sm font-medium line-clamp-1">{data.title}</p>
          <p className="text-white/80 text-xs">{data.platform}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={`
            relative overflow-hidden w-full h-12 rounded-xl font-medium text-white shadow-lg transition-all duration-300 transform
            flex items-center justify-center gap-2
            hover:scale-[1.02] active:scale-[0.98]
            ${downloadSuccess 
              ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20' 
              : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'}
          `}
        >
          {downloadSuccess ? (
            <>
              <Check size={18} />
              <span>Saved to Device</span>
            </>
          ) : downloading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Download size={18} />
              <span>Download HD Cover</span>
            </>
          )}
        </button>

        <div className="grid grid-cols-2 gap-3">
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={vibrate}
            className="flex items-center justify-center gap-2 h-12 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium transition-all duration-300 shadow-sm hover:scale-[1.02] active:scale-[0.98] hover:shadow-md"
          >
            <ExternalLink size={16} />
            Original
          </a>
          <button
            onClick={() => {
              vibrate();
              onReset();
            }}
            className="flex items-center justify-center gap-2 h-12 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium transition-all duration-300 shadow-sm hover:scale-[1.02] active:scale-[0.98] hover:shadow-md"
          >
             <ImageIcon size={16} />
            New Image
          </button>
        </div>
      </div>
    </div>
  );
};