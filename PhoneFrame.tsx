
import React from 'react';
import { X, Smartphone } from 'lucide-react';

interface PhoneFrameProps {
  children: React.ReactNode;
  onClose?: () => void;
  showClose?: boolean;
}

const PhoneFrame: React.FC<PhoneFrameProps> = ({ children, onClose, showClose = false }) => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-0 md:p-8 relative overflow-hidden">
      
      {/* Background decoration - very subtle */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-[0.03] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-slate-800 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-900 rounded-full blur-[120px]"></div>
      </div>

      {/* THE PHONE */}
      <div className="relative z-10">
        {/* Outer Frame (Bezel) - Ultra thin and clean */}
        <div className="relative border-[1px] border-slate-800 rounded-[40px] md:rounded-[54px] w-[100vw] h-[100vh] md:w-[380px] md:h-[820px] bg-black overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]">
            
            {/* Screen Content Wrapper */}
            <div className="w-full h-full bg-black overflow-hidden flex flex-col relative md:rounded-[50px]">
                
                {/* The App Container */}
                <div className="flex-1 w-full h-full overflow-hidden bg-black">
                    <div className="w-full h-full relative">
                        {children}
                    </div>
                </div>

                {/* Home Indicator */}
                <div className="absolute bottom-2.5 left-1/2 transform -translate-x-1/2 w-[130px] h-[5px] bg-slate-800 rounded-full z-50"></div>
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
