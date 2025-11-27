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

  const handleDownload = async () => {
    try {
      setDownloading(true);
      // Fetch the image as a blob to bypass CORS download attribute issues if possible
      // Note: This still relies on the image server allowing the request or using a proxy
      const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(data.url)}`);
      if (!response.ok) throw new Error('Network error');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `cover-snap-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (error) {
      console.error('Download failed, trying direct link', error);
      // Fallback
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
            relative overflow-hidden w-full h-12 rounded-xl font-medium text-white shadow-lg transition-all duration-300
            flex items-center justify-center gap-2
            ${downloadSuccess 
              ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20' 
              : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20 hover:scale-[1.02] active:scale-95'}
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
            className="flex items-center justify-center gap-2 h-12 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium transition-colors shadow-sm"
          >
            <ExternalLink size={16} />
            Original
          </a>
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 h-12 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium transition-colors shadow-sm"
          >
             <ImageIcon size={16} />
            New Image
          </button>
        </div>
      </div>
    </div>
  );
};