
import React, { useState, useEffect, useRef } from 'react';
import { Settings2, Target, ArrowDownToLine, ArrowUpToLine, PlusCircle, Trash2 } from 'lucide-react';
import { ProcessLimits, AppTheme } from './types';
import { Language, translations } from './locales';

interface LimitsInputProps {
  limits: ProcessLimits;
  setLimits: (newLimits: ProcessLimits) => void;
  measureName: string;
  setMeasureName: (name: string) => void;
  onAddMeasure: () => void;
  onDeleteMeasure: () => void;
  measureCount: number;
  language: Language;
  theme?: AppTheme;
  measureId: string;
  calculationMethod: 'serial' | 'within';
  setCalculationMethod: (method: 'serial' | 'within') => void;
  subgroupSize: number;
  setSubgroupSize: (size: number) => void;
  themeColor?: {
    border: string;
    text: string;
    hex: string;
  };
  themeMode?: 'light' | 'dark';
}

const LimitsInput: React.FC<LimitsInputProps> = ({ 
    limits, setLimits, measureName, setMeasureName, onAddMeasure, onDeleteMeasure, measureCount, language, theme = 'soft', measureId, calculationMethod, setCalculationMethod, subgroupSize, setSubgroupSize, themeColor, themeMode = 'light'
}) => {
  const t = translations[language];

  // Default fallback
  const activeColor = themeColor || {
    border: 'border-amber-500',
    text: 'text-amber-500',
    hex: '#f59e0b'
  };

  const [localLsl, setLocalLsl] = useState<string>(limits.lsl?.toString() ?? '');
  const [localUsl, setLocalUsl] = useState<string>(limits.usl?.toString() ?? '');
  const [localTarget, setLocalTarget] = useState<string>(limits.target?.toString() ?? '');

  const targetRef = useRef<HTMLInputElement>(null);
  const lslRef = useRef<HTMLInputElement>(null);
  const uslRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalLsl(limits.lsl?.toString() ?? '');
    setLocalUsl(limits.usl?.toString() ?? '');
    setLocalTarget(limits.target?.toString() ?? '');
  }, [measureId]);

  const handleLocalChange = (
    field: 'lsl' | 'usl' | 'target', 
    value: string, 
    setLocal: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setLocal(value);
    const normalizedValue = value.replace(',', '.');
    
    if (normalizedValue === '') {
      setLimits({ ...limits, [field]: undefined });
      return;
    }

    const num = parseFloat(normalizedValue);
    if (!isNaN(num)) {
       setLimits({ ...limits, [field]: num });
    }
  };

  const handleToleranceTypeChange = (type: 'double' | 'upper' | 'lower') => {
      const newLimits = { ...limits, toleranceType: type };
      
      if (type === 'double') {
          if (newLimits.lsl === undefined) newLimits.lsl = 9.8;
          if (newLimits.usl === undefined) newLimits.usl = 10.2;
      } else if (type === 'upper') {
          delete newLimits.lsl;
          if (newLimits.usl === undefined) newLimits.usl = 0.2;
          newLimits.target = 0;
          setLocalTarget('0');
      } else if (type === 'lower') {
          delete newLimits.usl;
          if (newLimits.lsl === undefined) newLimits.lsl = 9.8;
      }
      
      setLimits(newLimits);
      setLocalLsl(newLimits.lsl?.toString() ?? '');
      setLocalUsl(newLimits.usl?.toString() ?? '');
  };

  const containerClass = `${themeMode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white ' + activeColor.border} rounded-none shadow-none border-[3px] flex flex-col`;
  const headerClass = `${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white ' + activeColor.border + ' text-slate-900'} border-b-[3px]`;
  const iconColor = activeColor.text;
  const labelColor = `font-mono ${themeMode === 'dark' ? 'text-slate-100' : 'text-black'}`;
  const inputClass = `${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500' : 'bg-white ' + activeColor.border + ' text-slate-900 placeholder:text-slate-600'} border-2 focus:ring-2 focus:ring-opacity-50 rounded-sm outline-none`;
  
  const arrowColor = activeColor.hex.replace('#', '');
  const selectStyle = `block w-full px-3 md:px-4 h-[36px] md:h-[40px] text-sm font-bold ${themeMode === 'dark' ? 'bg-slate-800 text-slate-100 border-slate-700' : 'bg-white text-slate-900 ' + activeColor.border} border-2 rounded-sm appearance-none focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%23${arrowColor}%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%20%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-no-repeat bg-[right_0.5rem_center] shadow-sm`;

  return (
    <div className={`${containerClass} h-full overflow-hidden`}>
      <div className={`${headerClass} px-4 h-12 md:h-14 flex items-center justify-between shrink-0`}>
         <div className="flex items-center gap-2">
            <Settings2 className={`w-4 h-4 md:w-6 md:h-6 ${themeMode === 'dark' ? 'text-slate-100' : 'text-black'}`} />
            <h2 className="text-sm md:text-base font-bold uppercase tracking-wider">{t.params}</h2>
         </div>
         {measureCount > 1 && (
             <button 
                onClick={onDeleteMeasure}
                className={`${themeMode === 'dark' ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'} transition-colors p-1`}
                title={t.tooltipDeleteMeasure}
             >
                 <Trash2 className="w-5 h-5" />
             </button>
         )}
      </div>

      <div className="p-3 md:p-4 space-y-3 md:space-y-6 flex-1">
        <div className="relative group">
            <div className="flex items-center mb-1 h-5 md:h-6">
                <label className={`flex items-center gap-2 text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${labelColor} select-none`}>
                    {t.measureName}
                </label>
            </div>
            <input 
                type="text" 
                value={measureName}
                onChange={(e) => setMeasureName(e.target.value)}
                className={`w-full px-3 md:px-4 py-1.5 md:py-2 h-[36px] md:h-[40px] text-sm font-medium transition-all border-2 ${inputClass}`}
            />
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="relative group">
                <div className="flex items-center mb-1 h-5 md:h-6">
                    <label className={`flex items-center gap-2 text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${labelColor} select-none`}>
                        {t.calcMethod}
                    </label>
                </div>
                <select 
                    value={calculationMethod}
                    onChange={(e) => setCalculationMethod(e.target.value as any)}
                    className={selectStyle}
                >
                    <option value="serial">{t.methodSerial}</option>
                    <option value="within">{t.methodWithin}</option>
                </select>
            </div>

            <div className={`transition-all duration-300 relative group ${calculationMethod === 'within' ? 'opacity-100' : 'opacity-30 pointer-events-none grayscale'}`}>
                <div className="flex items-center mb-1 h-5 md:h-6">
                    <label className={`flex items-center gap-2 text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${labelColor} select-none`}>
                        {t.subgroupSize}
                    </label>
                </div>
                <select 
                    value={subgroupSize}
                    onChange={(e) => setSubgroupSize(parseInt(e.target.value, 10))}
                    className={selectStyle}
                    disabled={calculationMethod !== 'within'}
                >
                    {[2, 3, 4, 5, 6, 7, 8].map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
            </div>
        </div>

        <div className="relative group">
            <div className="flex items-center mb-1 h-5 md:h-6">
                <label className={`flex items-center gap-2 text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${labelColor} select-none`}>
                    {t.toleranceType}
                </label>
            </div>
            <select 
                value={limits.toleranceType}
                onChange={(e) => handleToleranceTypeChange(e.target.value as any)}
                className={selectStyle}
            >
                <option value="double">{t.doubleSided}</option>
                <option value="upper">{t.singleSidedUpper}</option>
                <option value="lower">{t.singleSidedLower}</option>
            </select>
        </div>
        
        <div className="relative group">
            <div className="flex items-center mb-1 h-5 md:h-6">
                <label className={`flex items-center gap-2 text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${labelColor} select-none`}>
                    <Target className="w-4 h-4 md:w-4.5 md:h-4.5 shrink-0" /> {t.target}
                </label>
            </div>
            <div className="relative group">
                <input
                ref={targetRef}
                type="text"
                inputMode="decimal"
                placeholder={t.notSpecified}
                value={localTarget}
                onChange={(e) => handleLocalChange('target', e.target.value, setLocalTarget)}
                className={`w-full pl-3 md:pl-4 pr-10 md:pr-12 py-1.5 md:py-2 h-[36px] md:h-[40px] text-sm font-mono font-bold transition-all border-2 ${inputClass}`}
                />
                <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Target className="w-4 h-4 md:w-5 md:h-5 text-slate-400 opacity-50 group-focus-within:opacity-100 transition-opacity" />
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className={`transition-all duration-300 relative group ${limits.toleranceType !== 'upper' ? 'opacity-100' : 'opacity-30 pointer-events-none grayscale'}`}>
                <div className="flex items-center mb-1 h-5 md:h-6">
                    <label className={`flex items-center gap-2 text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${labelColor} select-none`}>
                        <ArrowDownToLine className="w-4 h-4 md:w-4.5 md:h-4.5 shrink-0" /> {t.lsl}
                    </label>
                </div>
                <input
                    ref={lslRef}
                    type="text"
                    inputMode="decimal"
                    disabled={limits.toleranceType === 'upper'}
                    value={localLsl}
                    placeholder="-"
                    onChange={(e) => handleLocalChange('lsl', e.target.value, setLocalLsl)}
                    className={`w-full px-3 md:px-4 py-1.5 md:py-2 h-[36px] md:h-[40px] text-sm font-mono font-bold transition-all border-2 ${inputClass}`}
                />
            </div>

            <div className={`transition-all duration-300 relative group ${limits.toleranceType !== 'lower' ? 'opacity-100' : 'opacity-30 pointer-events-none grayscale'}`}>
                <div className="flex items-center mb-1 h-5 md:h-6">
                    <label className={`flex items-center gap-2 text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${labelColor} select-none`}>
                        <ArrowUpToLine className="w-4 h-4 md:w-4.5 md:h-4.5 shrink-0" /> {t.usl}
                    </label>
                </div>
                <input
                    ref={uslRef}
                    type="text"
                    inputMode="decimal"
                    disabled={limits.toleranceType === 'lower'}
                    value={localUsl}
                    placeholder="-"
                    onChange={(e) => handleLocalChange('usl', e.target.value, setLocalUsl)}
                    className={`w-full px-3 md:px-4 py-1.5 md:py-2 h-[36px] md:h-[40px] text-sm font-mono font-bold transition-all border-2 ${inputClass}`}
                />
            </div>
        </div>
      </div>

      <div className={`p-3 md:p-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-t-2 ' + activeColor.border} shrink-0`}>
             <button
                onClick={onAddMeasure}
                className={`w-full flex items-center justify-center gap-3 py-2.5 md:py-3 ${themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800' : 'bg-white border-2 ' + activeColor.border + ' text-slate-900 hover:bg-slate-50'} rounded-sm transition-colors font-black text-[11px] md:text-[12px] uppercase tracking-[0.2em] shadow-sm`}
             >
                 <PlusCircle className="w-4 h-4 md:w-5 md:h-5" />
                 {t.addMeasure}
             </button>
      </div>
    </div>
  );
};

export default LimitsInput;
