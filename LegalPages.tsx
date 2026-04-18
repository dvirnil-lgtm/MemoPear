
import React, { useEffect, useRef, useState } from 'react';

// Declaration for global html5-qr-code library loaded via CDN
declare const Html5QrcodeScanner: any;

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [scanSuccess, setScanSuccess] = useState(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    // Countdown logic
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Initializing scanner
    const scannerTimer = setTimeout(() => {
      try {
        const config = { 
          fps: 15, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };
        const scanner = new Html5QrcodeScanner("reader", config, false);
        
        scanner.render(
          (decodedText: string) => {
            setScanSuccess(true);
            scanner.clear();
            // Delay calling onScan slightly to allow the success UI to be seen
            setTimeout(() => {
              onScan(decodedText);
            }, 800);
          },
          (errorMessage: string) => {
            // Silently handle scan errors (typical when no QR found in frame)
          }
        );
        scannerRef.current = scanner;
      } catch (err) {
        setError("Could not initialize camera. Please ensure permissions are granted.");
        console.error(err);
      }
    }, 100);

    return () => {
      clearInterval(timer);
      clearTimeout(scannerTimer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl relative border border-white/20">
        
        {/* Header with Countdown */}
        <div className="p-5 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Scanning Badge...</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span className={`text-xs font-bold uppercase tracking-widest ${countdown < 10 ? 'text-red-500' : 'text-slate-400'}`}>
                Session Ends in {countdown}s
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Scanner Area */}
        <div className="p-6 relative">
          <div id="reader" className="w-full rounded-2xl overflow-hidden relative">
            {/* Custom Scan Frame Overlay */}
            {!scanSuccess && (
              <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                <div className="w-[250px] h-[250px] border-2 border-white/30 rounded-2xl relative animate-pulse">
                  {/* Corners */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                  
                  {/* Scanning Line Animation */}
                  <div className="absolute left-0 right-0 h-0.5 bg-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-[scan_2s_ease-in-out_infinite]"></div>
                </div>
              </div>
            )}
          </div>

          {/* Success Overlay */}
          {scanSuccess && (
            <div className="absolute inset-0 z-20 bg-emerald-500/90 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl animate-bounce">
                <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white font-black text-2xl mt-6 tracking-tight">Lead Detected!</p>
              <p className="text-emerald-100 font-medium text-sm">Processing with Gemini AI...</p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium flex items-center gap-3">
              <span className="text-xl">🛑</span>
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col items-center gap-1">
            <p className="text-center text-sm font-semibold text-slate-700">
              Point your camera at the badge QR
            </p>
            <p className="text-center text-xs text-slate-400 font-medium max-w-[200px]">
              The scanner will automatically detect and parse contact details.
            </p>
          </div>
        </div>

        {/* Progress Bar for Countdown */}
        <div className="h-1.5 w-full bg-slate-100 overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${countdown < 10 ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${(countdown / 30) * 100}%` }}
          ></div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0.2; }
          50% { top: 100%; opacity: 1; }
        }
        #reader__status_span { display: none !important; }
        #reader__dashboard_section_csr button {
          background-color: #2563eb !important;
          color: white !important;
          border-radius: 12px !important;
          padding: 10px 20px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          font-size: 12px !important;
          border: none !important;
          cursor: pointer !important;
          margin-top: 10px !important;
        }
        #reader video {
          border-radius: 16px !important;
        }
      `}</style>
    </div>
  );
};
