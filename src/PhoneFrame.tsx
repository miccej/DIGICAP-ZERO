
import React from 'react';
import { X, Smartphone } from 'lucide-react';

interface PhoneFrameProps {
  children: React.ReactNode;
  onClose?: () => void;
  showClose?: boolean;
}

const PhoneFrame: React.FC<PhoneFrameProps> = ({ children, onClose, showClose = false }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-0 md:p-8 relative overflow-hidden">
      
      {/* Background decoration - very subtle */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-[0.03] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-slate-800 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-900 rounded-full blur-[120px]"></div>
      </div>

      {/* THE PHONE */}
      <div className="relative z-10 scale-[0.9] md:scale-100 transition-transform duration-700 ease-out">
        
        {/* Buttons - Left Side (Volume) */}
        <div className="absolute left-[-3px] top-[140px] w-[4px] h-[40px] bg-gradient-to-r from-slate-400 via-slate-100 to-slate-400 border border-slate-300 rounded-l-md z-0 shadow-md"></div>
        <div className="absolute left-[-3px] top-[190px] w-[4px] h-[60px] bg-gradient-to-r from-slate-400 via-slate-100 to-slate-400 border border-slate-300 rounded-l-md z-0 shadow-md"></div>
        <div className="absolute left-[-3px] top-[260px] w-[4px] h-[60px] bg-gradient-to-r from-slate-400 via-slate-100 to-slate-400 border border-slate-300 rounded-l-md z-0 shadow-md"></div>

        {/* Buttons - Right Side (Power) */}
        <div className="absolute right-[-3px] top-[230px] w-[4px] h-[90px] bg-gradient-to-l from-slate-400 via-slate-100 to-slate-400 border border-slate-300 rounded-r-md z-0 shadow-md"></div>

        {/* Outer Frame (Bezel) - Slimmer and more lustrous with depth */}
        <div className="relative border-[8px] border-[#5c5c64] rounded-[42px] md:rounded-[56px] w-[100vw] h-[100vh] md:w-[380px] md:h-[820px] bg-black overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.85),inset_0_0_4px_rgba(255,255,255,0.7)]">
            
            {/* Inner Border highlighting the screen edge - slightly refined */}
            <div className="absolute inset-0 border-[2px] border-slate-800 rounded-[34px] md:rounded-[48px] pointer-events-none z-40 shadow-[inset_0_0_12px_rgba(0,0,0,0.6)]"></div>

            {/* Screen Content Wrapper */}
            <div className="w-full h-full bg-black overflow-hidden flex flex-col relative md:rounded-[48px]">
                
                {/* Camera Cutout / Dynamic Island */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-[100px] h-[28px] bg-black rounded-full z-[60] flex items-center justify-center border border-slate-900/50">
                    <div className="w-2 h-2 rounded-full bg-blue-900/20 mr-12 border border-blue-400/10"></div>
                </div>

                {/* The App Container */}
                <div className="flex-1 w-full h-full overflow-hidden bg-black">
                    <div className="w-full h-full relative">
                        {children}
                    </div>
                </div>

                {/* Home Indicator */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-[120px] h-[4px] bg-slate-800/80 rounded-full z-50"></div>
            </div>
        </div>
      </div>

      {/* Controls */}
      {showClose && onClose && (
        <div className="mt-10 flex gap-4 z-50">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-10 py-3.5 bg-slate-950 text-white hover:bg-slate-900 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl"
          >
              <X className="w-4 h-4" /> Stäng
          </button>
        </div>
      )}
    </div>
  );
};

export default PhoneFrame;
