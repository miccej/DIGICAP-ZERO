import React from 'react';
import { Download } from 'lucide-react';

interface IconProps {
  size?: number;
  primaryColor?: string;
  secondaryColor?: string;
  variant: number;
}

export const DigicapIcon = ({ size = 120, primaryColor = '#2563eb', secondaryColor = '#ffffff', variant }: IconProps) => {
  const renderIcon = () => {
    switch (variant) {
      case 1: // Technical Bridge - Sharp Bars
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="12" fill={primaryColor} />
            <rect x="8" y="8" width="84" height="84" rx="8" fill={secondaryColor} />
            <path d="M20 55 C 35 15, 65 15, 80 55" stroke={primaryColor} strokeWidth="6" strokeLinecap="square" />
            <rect x="28" y="52" width="4" height="15" fill={primaryColor} />
            <rect x="38" y="40" width="4" height="27" fill={primaryColor} />
            <rect x="48" y="35" width="4" height="32" fill={primaryColor} />
            <rect x="58" y="40" width="4" height="27" fill={primaryColor} />
            <rect x="68" y="52" width="4" height="15" fill={primaryColor} />
            <text x="50" y="84" textAnchor="middle" fill={primaryColor} fontSize="10" fontWeight="900" fontFamily="monospace" letterSpacing="0.1em">DIGICAP</text>
          </svg>
        );
      case 2: // Blueprint Style - Dark
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="12" fill={primaryColor} />
            <path d="M10 10 H 90 V 90 H 10 Z" stroke={secondaryColor} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
            <path d="M20 60 L 35 30 L 50 20 L 65 30 L 80 60" stroke={secondaryColor} strokeWidth="4" strokeLinejoin="bevel" />
            <rect x="48" y="20" width="4" height="50" fill={secondaryColor} opacity="0.5" />
            <text x="50" y="88" textAnchor="middle" fill={secondaryColor} fontSize="12" fontWeight="900" fontFamily="monospace">DIGICAP</text>
          </svg>
        );
      case 3: // Vector Precision
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="12" fill={primaryColor} />
            <path d="M20 65 L 50 15 L 80 65 Z" stroke={secondaryColor} strokeWidth="2" opacity="0.4" />
            <path d="M20 65 Q 50 15, 80 65" stroke={secondaryColor} strokeWidth="8" />
            <rect x="49" y="15" width="2" height="60" fill={secondaryColor} />
            <text x="50" y="88" textAnchor="middle" fill={secondaryColor} fontSize="11" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.2em">DIGICAP</text>
          </svg>
        );
      case 4: // Digital Grid
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="12" fill={primaryColor} />
            <path d="M20 20 H 80 V 80 H 20 Z" fill={secondaryColor} opacity="0.1" />
            <path d="M25 60 C 35 20, 65 20, 75 60" stroke={secondaryColor} strokeWidth="4" />
            <circle cx="50" cy="30" r="3" fill={secondaryColor} />
            <rect x="25" y="65" width="50" height="2" fill={secondaryColor} />
            <text x="50" y="85" textAnchor="middle" fill={secondaryColor} fontSize="10" fontWeight="900" fontFamily="monospace">DIGICAP</text>
          </svg>
        );
      case 5: // Industrial Arch
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="12" fill={primaryColor} />
            <path d="M20 70 L 20 50 Q 50 10, 80 50 L 80 70" stroke={secondaryColor} strokeWidth="10" strokeLinejoin="miter" />
            <rect x="45" y="15" width="10" height="10" fill={primaryColor} />
            <text x="50" y="88" textAnchor="middle" fill={secondaryColor} fontSize="12" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.1em">DIGICAP</text>
          </svg>
        );
      case 6: // Circuit Curve
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="12" fill={primaryColor} />
            <path d="M20 60 C 35 20, 65 20, 80 60" stroke={secondaryColor} strokeWidth="6" />
            <circle cx="20" cy="60" r="4" fill={secondaryColor} />
            <circle cx="80" cy="60" r="4" fill={secondaryColor} />
            <circle cx="50" cy="28" r="4" fill={secondaryColor} />
            <text x="50" y="85" textAnchor="middle" fill={secondaryColor} fontSize="10" fontWeight="900" fontFamily="monospace">DIGICAP</text>
          </svg>
        );
      case 7: // Modern Monolith
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="12" fill={primaryColor} />
            <path d="M30 70 V 30 L 50 15 L 70 30 V 70 Z" fill={secondaryColor} opacity="0.2" />
            <path d="M20 65 Q 50 10, 80 65" stroke={secondaryColor} strokeWidth="8" />
            <text x="50" y="88" textAnchor="middle" fill={secondaryColor} fontSize="11" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.1em">DIGICAP</text>
          </svg>
        );
      case 8: // Data Pillar
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="12" fill={primaryColor} />
            <rect x="20" y="20" width="60" height="60" stroke={secondaryColor} strokeWidth="1" opacity="0.3" />
            <path d="M25 55 C 35 25, 65 25, 75 55" stroke={secondaryColor} strokeWidth="6" />
            <rect x="48" y="30" width="4" height="40" fill={secondaryColor} />
            <text x="50" y="85" textAnchor="middle" fill={secondaryColor} fontSize="12" fontWeight="900" fontFamily="monospace">DIGICAP</text>
          </svg>
        );
      case 9: // Sharp Sigma
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="12" fill={primaryColor} />
            <path d="M35 30 H 65 L 45 50 L 65 70 H 35" stroke={secondaryColor} strokeWidth="8" strokeLinecap="square" />
            <path d="M20 50 Q 50 10, 80 50" stroke={secondaryColor} strokeWidth="2" opacity="0.5" />
            <text x="50" y="90" textAnchor="middle" fill={secondaryColor} fontSize="9" fontWeight="900" fontFamily="monospace">DIGICAP</text>
          </svg>
        );
      case 10: // Tech Badge
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="12" fill={primaryColor} />
            <circle cx="50" cy="50" r="40" stroke={secondaryColor} strokeWidth="1" opacity="0.3" />
            <path d="M25 60 C 35 25, 65 25, 75 60" stroke={secondaryColor} strokeWidth="7" />
            <rect x="40" y="70" width="20" height="4" fill={secondaryColor} />
            <text x="50" y="88" textAnchor="middle" fill={secondaryColor} fontSize="11" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.1em">DIGICAP</text>
          </svg>
        );
      default:
        return null;
    }
  };

  return renderIcon();
};

export const IconGallery = ({ themeMode, currentTheme }: { themeMode: 'light' | 'dark', currentTheme: any }) => {
  const downloadIcon = (variant: number) => {
    const svg = document.getElementById(`svg-icon-${variant}`);
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 1024;
      canvas.height = 1024;
      ctx?.drawImage(img, 0, 0, 1024, 1024);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `digicap-icon-v${variant}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
        <div key={v} className={`group relative aspect-square ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border-2 rounded-lg overflow-hidden hover:border-blue-500 transition-all flex items-center justify-center p-1`}>
          <div id={`svg-icon-${v}`} className="w-full h-full flex items-center justify-center">
            <DigicapIcon variant={v} size={80} primaryColor={currentTheme.hex} secondaryColor={themeMode === 'dark' ? '#f8fafc' : '#ffffff'} />
          </div>
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <button 
              onClick={() => downloadIcon(v)}
              className="p-2 bg-blue-600 rounded-full text-white hover:bg-blue-500 shadow-xl transform scale-90 group-hover:scale-100 transition-transform"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
