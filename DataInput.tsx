
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, Settings, Wand2, FileSpreadsheet, RotateCcw, Loader2, AlertTriangle, X, Check, PlayCircle, RefreshCw, BarChart2, CheckCircle, ArrowRight, Activity, ClipboardPaste, Upload } from 'lucide-react';
import { MeasurementData, ProcessLimits, AppTheme, StudyInfo, DistributionType } from './types';
import * as XLSX from 'xlsx';
import { Language, translations } from './locales';

interface DataInputProps {
  data: MeasurementData[];
  limits: ProcessLimits;
  onAddData: (val: number) => void;
  onClearData: () => void;
  onRemoveData: (id: string) => void;
  onSimulateData: (count: number, mean: number, stdDev: number, distribution?: DistributionType) => void;
  onImportData: (values: number[]) => void;
  onStartTestSuite: (studyType: StudyInfo['studyType'], distribution: DistributionType, sigma: number) => void;
  language: Language;
  theme?: AppTheme;
  onAnalyze: () => void;
  isDataDirty: boolean;
  hasStats: boolean;
  sigmaLevel: number;
  setSigmaLevel: (lvl: number) => void;
  calculationMethod?: 'serial' | 'within';
  subgroupSize?: number;
  onAddSubgroup?: (vals: number[]) => void;
  colorScheme?: 'blue' | 'red' | 'art';
  themeColor?: {
    border: string;
    text: string;
    hex: string;
    newStudy: string; // using newStudy as primary button color
  };
  themeMode?: 'light' | 'dark';
}

const DataInput: React.FC<DataInputProps> = ({ 
  data, 
  limits, 
  onAddData, 
  onClearData, 
  onRemoveData, 
  onSimulateData,
  onImportData,
  onStartTestSuite,
  language,
  theme = 'soft',
  onAnalyze,
  isDataDirty,
  hasStats,
  sigmaLevel,
  setSigmaLevel,
  calculationMethod = 'serial',
  subgroupSize = 2,
  onAddSubgroup,
  colorScheme = 'blue',
  themeColor,
  themeMode = 'light'
}) => {
  const t = translations[language];

  // Default fallback
  const activeColor = themeColor || {
    border: 'border-amber-500',
    text: 'text-amber-500',
    hex: '#f59e0b',
    newStudy: 'bg-amber-600 hover:bg-amber-700'
  };

  const [inputValue, setInputValue] = useState('');
  const [subgroupValues, setSubgroupValues] = useState<string[]>(Array(subgroupSize).fill(''));
  const [error, setError] = useState<string | null>(null);

  // Sync subgroupValues when subgroupSize changes
  useEffect(() => {
    setSubgroupValues(prev => {
      const next = Array(subgroupSize).fill('');
      for (let i = 0; i < Math.min(prev.length, subgroupSize); i++) {
        next[i] = prev[i];
      }
      return next;
    });
  }, [subgroupSize]);

  const [simCount, setSimCount] = useState(30);
  const [showSim, setShowSim] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  
  const [pendingValue, setPendingValue] = useState<number | null>(null);
  const [pendingSubgroup, setPendingSubgroup] = useState<number[] | null>(null);

  // States for System Test Parameters
  const [testStudyType, setTestStudyType] = useState<StudyInfo['studyType']>('Performance');
  const [testDistribution, setTestDistribution] = useState<DistributionType>('Normal');
  const [testSigma, setTestSigma] = useState<number>(3);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const checkOutlier = useCallback((val: number): boolean => {
    if (limits.lsl !== undefined && limits.usl !== undefined) {
      const range = limits.usl - limits.lsl;
      if (range <= 0) return false;
      const buffer = range * 0.25;
      const minSafe = limits.lsl - buffer;
      const maxSafe = limits.usl + buffer;
      if (val < minSafe || val > maxSafe) {
        return true;
      }
    }
    return false;
  }, [limits.lsl, limits.usl]);

  const confirmPendingValue = useCallback(() => {
    if (pendingValue !== null) {
      onAddData(pendingValue);
      setPendingValue(null);
    }
  }, [pendingValue, onAddData]);

  const confirmPendingSubgroup = useCallback(() => {
    if (pendingSubgroup !== null && onAddSubgroup) {
      onAddSubgroup(pendingSubgroup);
      setPendingSubgroup(null);
    }
  }, [pendingSubgroup, onAddSubgroup]);

  const cancelPendingValue = useCallback(() => {
    setPendingValue(null);
    setPendingSubgroup(null);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (calculationMethod === 'within') {
      const values = subgroupValues.map(v => parseFloat(v.replace(',', '.')));
      if (values.some(v => isNaN(v))) {
        setError(t.noValidNumbers);
        return;
      }
      
      const hasOutlier = values.some(v => checkOutlier(v));
      if (hasOutlier) {
        setPendingSubgroup(values);
      } else if (onAddSubgroup) {
        onAddSubgroup(values);
        setSubgroupValues(Array(subgroupSize).fill(''));
      }
    } else {
      const val = parseFloat(inputValue.replace(',', '.'));
      if (!isNaN(val)) {
        if (checkOutlier(val)) {
          setPendingValue(val);
        } else {
          onAddData(val);
          setInputValue('');
        }
      }
    }
  };

  const handleManualConfirm = () => {
      if (pendingValue !== null) {
        confirmPendingValue();
        setInputValue('');
      } else if (pendingSubgroup !== null) {
        confirmPendingSubgroup();
        setSubgroupValues(Array(subgroupSize).fill(''));
      }
  };

  const handleSubgroupChange = (index: number, value: string) => {
    setSubgroupValues(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSimulate = () => {
    let center = 10;
    if (limits.target !== undefined) center = limits.target;
    else if (limits.lsl !== undefined && limits.usl !== undefined) center = (limits.lsl + limits.usl) / 2;
    
    let spread = 0.1;
    if (limits.lsl !== undefined && limits.usl !== undefined) {
      // Default simulation spread should target a 'capable' process at current sigmaLevel
      // CP = (USL-LSL) / (2 * sigmaLevel * sigma)
      // If we want CP = 1.33, then sigma = (USL-LSL) / (2 * 1.33 * sigmaLevel)
      spread = (limits.usl - limits.lsl) / (2.66 * sigmaLevel);
    }

    onSimulateData(simCount, center, spread, testDistribution);
    setShowSim(false);
  };

  const handlePasteImport = () => {
      if (!pasteContent) return;
      
      // Improved parsing: handle quotes, spaces, and multiple delimiters
      // First, try to handle CSV-like structure with quotes
      const cleanedText = pasteContent.replace(/"([^"]*)"/g, (match, p1) => p1.replace(/[\n\t,;]/g, ' '));
      
      const values = cleanedText
        .split(/[\n\t,;\s]+/)
        .map(v => v.trim())
        .filter(v => v !== '')
        .map(v => {
          // Handle European decimal comma
          const normalized = v.replace(',', '.');
          // Strict check: must be a valid number and NOT look like a date (e.g. 2024-05-10)
          if (/^-?\d+(\.\d+)?$/.test(normalized)) {
            return parseFloat(normalized);
          }
          return NaN;
        })
        .filter(v => !isNaN(v));

      if (values.length > 0) {
          onImportData(values);
          setPasteContent('');
          setShowPasteModal(false);
      } else {
          setError(t.noValidNumbers);
      }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        const validNumbers: number[] = [];
        data.forEach(row => {
          if (Array.isArray(row)) {
            row.forEach(cell => {
              if (typeof cell === 'number') {
                validNumbers.push(cell);
              } else if (typeof cell === 'string') {
                const normalized = cell.replace(',', '.').replace(/[\s\u00A0]/g, '').trim();
                // Strict check: must be a valid number and NOT look like a date
                if (/^-?\d+(\.\d+)?$/.test(normalized)) {
                  const num = parseFloat(normalized);
                  if (!isNaN(num)) validNumbers.push(num);
                }
              }
            });
          }
        });

        if (validNumbers.length > 0) {
          onImportData(validNumbers);
          setShowPasteModal(false);
        } else {
          setError(t.noValidNumbers);
        }
      } catch (err) {
        console.error("File import error", err);
        setError(t.fileReadError);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleTestScenario = (type: 'ideal' | 'shifted' | 'spread') => {
      if (limits.lsl === undefined || limits.usl === undefined) {
          setError(t.setLimitsFirst);
          return;
      }
      const mean = (limits.lsl + limits.usl) / 2;
      const tolerance = limits.usl - limits.lsl;
      let center = mean;
      let spread = 0;

      // Calculate spread to achieve specific Cpk goals based on user's sigmaLevel
      // Target Cpk = (tolerance/2) / (sigmaLevel * spread)
      // spread = tolerance / (2 * Cpk * sigmaLevel)
      
      if (type === 'ideal') {
          // Target Cpk approx 1.7 - 2.0
          spread = tolerance / (4 * sigmaLevel); 
          center = mean;
      } else if (type === 'shifted') {
          // Shifted scenario: 1.5 sigma shift, targeting Cpk approx 1.1 - 1.2
          spread = tolerance / (3.2 * sigmaLevel);
          center = mean + (1.5 * spread); 
      } else if (type === 'spread') {
          // High variation: targeting Cpk < 1.0 (approx 0.8)
          spread = tolerance / (1.6 * sigmaLevel);
          center = mean;
      }
      onSimulateData(50, center, spread, testDistribution);
      setShowSim(false);
  };
  
  const handleClearClick = () => {
    if (confirmClear) { onClearData(); setConfirmClear(false); } 
    else { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); }
  };

  const getBtnColor = () => {
    if (isDataDirty && hasStats) return `${activeColor.newStudy} animate-pulse`;
    
    switch(colorScheme) {
      case 'red': return 'bg-red-600 hover:bg-red-700';
      case 'art': return 'bg-violet-600 hover:bg-violet-700';
      default: return `bg-black border-2 ${activeColor.border} hover:bg-slate-900`;
    }
  };

  const containerClass = `${themeMode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white ' + activeColor.border} rounded-none shadow-none border-[3px]`;
  const headerClass = `${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white ' + activeColor.border + ' text-slate-900'} border-b-[3px]`;
  const iconColor = activeColor.text;
  const labelColor = `font-mono ${themeMode === 'dark' ? 'text-slate-100' : 'text-black'}`;
  const inputClass = `${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500' : 'bg-white ' + activeColor.border + ' text-slate-900 placeholder:text-slate-600'} border-2 focus:ring-2 focus:ring-opacity-50 rounded-sm outline-none`;

  const arrowColor = activeColor.hex.replace('#', '');
  const selectStyle = `block w-full px-3 md:px-4 h-[36px] md:h-[40px] text-sm font-bold ${themeMode === 'dark' ? 'bg-slate-800 text-slate-100 border-slate-700' : 'bg-white text-slate-900 ' + activeColor.border} border-2 rounded-sm appearance-none focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%23${arrowColor}%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%20%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-no-repeat bg-[right_0.5rem_center] shadow-sm`;

  return (
    <div className={`${containerClass} h-full flex flex-col overflow-hidden relative`}>
      
      { (pendingValue !== null || pendingSubgroup !== null) && (
        <div className={`absolute inset-0 z-50 ${themeMode === 'dark' ? 'bg-slate-900/95' : 'bg-white/95'} flex flex-col items-center justify-center p-8 text-center animate-in fade-in`}>
            <h3 className={`text-xl font-bold ${themeMode === 'dark' ? 'text-slate-100' : 'text-black'} mb-2`}>{t.outlierTitle}</h3>
            <p className={`text-base ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'} mb-3`}>{t.outlierMsg}</p>
            <div className={`text-3xl font-mono font-bold ${themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'} mb-8`}>
              {pendingValue !== null ? pendingValue : pendingSubgroup?.join(', ')}
            </div>
            <div className="flex gap-4">
              <button onClick={cancelPendingValue} className={`py-3 px-6 rounded-sm font-bold ${themeMode === 'dark' ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-900 border-slate-300'} text-sm border`}>{t.cancel}</button>
              <button onClick={handleManualConfirm} className={`py-3 px-6 rounded-sm font-bold ${activeColor.newStudy} text-white text-sm`}>{t.addAnyway}</button>
            </div>
        </div>
      )}

      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white ' + activeColor.border} rounded-none shadow-xl max-w-sm w-full border-[3px] p-0 flex flex-col`}>
                 <div className={`px-4 py-2 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white ' + activeColor.border} border-b-[3px] flex justify-between items-center`}>
                    <h3 className={`text-sm font-bold uppercase tracking-wider ${themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{t.pasteTitle}</h3>
                    <button onClick={() => setShowPasteModal(false)}><X className="w-6 h-6 text-slate-400 hover:text-slate-900" /></button>
                 </div>
                 <div className="p-6">
                     <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-300 rounded-sm mb-8">
                        <FileSpreadsheet className={`w-12 h-12 ${themeMode === 'dark' ? 'text-slate-100' : 'text-black'} mb-3 opacity-20`} />
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t.excelCsvText}</p>
                     </div>
                     <div className="flex gap-3">
                         <button onClick={() => setShowPasteModal(false)} className={`flex-1 py-3 ${themeMode === 'dark' ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-slate-900 border-slate-300 hover:bg-slate-200'} font-bold text-sm rounded-sm border`}>{t.cancel}</button>
                         <button 
                            onClick={() => fileInputRef.current?.click()} 
                            className={`flex-1 py-3 ${activeColor.newStudy} font-bold text-white hover:opacity-90 text-sm rounded-sm`}
                         >
                            {t.pasteBtn}
                         </button>
                         <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileImport} 
                            accept=".xlsx,.xls,.csv,.txt" 
                            className="hidden" 
                         />
                     </div>
                 </div>
            </div>
        </div>
      )}

      <div className={`${headerClass} px-4 h-12 md:h-14 flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 md:w-6 md:h-6 ${themeMode === 'dark' ? 'text-slate-100' : 'text-black'}`} />
          <h2 className="text-sm md:text-base font-bold uppercase tracking-wider">
            {calculationMethod === 'within' ? `${t.dataHeader} (${t.methodWithin})` : t.dataHeader}
          </h2>
        </div>
        <div className="flex gap-2 items-center">
          {error && (
            <div className="absolute top-full left-0 right-0 z-[60] bg-rose-500 text-white text-[10px] py-1 px-4 flex justify-between items-center animate-in slide-in-from-top">
              <span>{error}</span>
              <button onClick={() => setError(null)}><X className="w-3 h-3" /></button>
            </div>
          )}
          <button type="button" onClick={() => setShowPasteModal(true)} className="p-1.5 md:p-2 rounded-sm text-slate-400 hover:text-slate-900" title={t.tooltipImport}>
             <ClipboardPaste className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button type="button" onClick={() => setShowSim(!showSim)} className={`p-1.5 md:p-2 rounded-sm ${showSim ? (themeMode === 'dark' ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-900') : 'text-slate-400 hover:text-slate-900'}`} title={t.simulateHeader}>
            <Wand2 className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>

      <div className="p-3 md:p-4 flex-1 flex flex-col overflow-hidden">
        {showSim && (
            <div className={`mb-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-2 ' + activeColor.border} p-4 md:p-6 animate-in fade-in slide-in-from-top-2 overflow-y-auto max-h-[400px]`}>
                <div className="mb-6">
                    <label className={`block text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-900'} mb-4`}>{t.simulateHeader}</label>
                    
                    <div className="mb-4">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t.distModel}</label>
                        <select 
                            value={testDistribution} 
                            onChange={(e) => setTestDistribution(e.target.value as any)}
                            className={selectStyle}
                        >
                            <option value="Normal">{t.distNormal}</option>
                            <option value="LogNormal">{t.distLogNormal}</option>
                            <option value="Folded">{t.distFolded}</option>
                            <option value="Rayleigh">{t.distRayleigh}</option>
                            <option value="Weibull">{t.distWeibull}</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                         <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t.count}</label>
                            <input type="range" min="2" max="70" value={simCount} onChange={(e) => setSimCount(parseInt(e.target.value))} className={`w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-${activeColor.hex}`} />
                         </div>
                        <span className={`text-sm md:text-base font-bold font-mono w-10 text-right mt-4 ${themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{simCount}</span>
                    </div>
                    <button onClick={handleSimulate} className={`w-full ${activeColor.newStudy} text-white text-[11px] md:text-sm font-bold py-2.5 md:py-3 rounded-sm flex items-center justify-center gap-2`}>
                      <Wand2 className="w-4 h-4" /> {t.genValues}
                    </button>
                </div>
                <div className={`pt-4 border-t-2 ${themeMode === 'dark' ? 'border-slate-700' : 'border-slate-100'}`}>
                    <label className="block text-[10px] md:text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-3">{t.testScenarios}</label>
                    <div className="space-y-3">
                        <button onClick={() => handleTestScenario('ideal')} className={`w-full flex justify-between px-3 md:px-4 py-2.5 md:py-3 ${themeMode === 'dark' ? 'bg-slate-900 border-slate-700 hover:border-slate-600' : 'bg-white border-2 border-slate-100 hover:' + activeColor.border} text-[11px] md:text-sm font-medium text-slate-900 ${themeMode === 'dark' ? 'text-slate-200' : ''}`}>
                            <span>{t.simIdeal}</span> <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </button>
                         <button onClick={() => handleTestScenario('shifted')} className={`w-full flex justify-between px-3 md:px-4 py-2.5 md:py-3 ${themeMode === 'dark' ? 'bg-slate-900 border-slate-700 hover:border-slate-600' : 'bg-white border-2 border-slate-100 hover:' + activeColor.border} text-[11px] md:text-sm font-medium text-slate-900 ${themeMode === 'dark' ? 'text-slate-200' : ''}`}>
                            <span>{t.simShifted}</span> <ArrowRight className={`w-4 h-4 ${activeColor.text}`} />
                        </button>
                        <button onClick={() => handleTestScenario('spread')} className={`w-full flex justify-between px-3 md:px-4 py-2.5 md:py-3 ${themeMode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-2 border-slate-100'} hover:border-slate-300 text-[11px] md:text-sm font-medium text-slate-900 ${themeMode === 'dark' ? 'text-slate-200' : ''} transition-all`}>
                            <span>{t.simSpread}</span> <BarChart2 className="w-4 h-4 text-rose-500" />
                        </button>
                        
                        <div className={`mt-6 pt-6 border-t-2 ${themeMode === 'dark' ? 'border-slate-700' : 'border-slate-100'} space-y-4`}>
                            <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500">{t.params}</label>
                            
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t.typeStudy}</label>
                                    <select 
                                        value={testStudyType} 
                                        onChange={(e) => setTestStudyType(e.target.value as any)}
                                        className={selectStyle}
                                    >
                                        <option value="Machine">{t.typeMachine}</option>
                                        <option value="Performance">{t.typePerformance}</option>
                                        <option value="Process">{t.typeProcess}</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t.sigmaLevel}</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[2, 3, 4, 6].map(lvl => (
                                            <button 
                                                key={lvl} 
                                                onClick={() => setTestSigma(lvl)}
                                                className={`py-2 text-[10px] font-black border-2 rounded-sm transition-all ${testSigma === lvl ? 'bg-black text-white border-black' : (themeMode === 'dark' ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}`}
                                            >
                                                ±{lvl}σ
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => {
                                    onStartTestSuite(testStudyType, testDistribution, testSigma);
                                    setShowSim(false);
                                }} 
                                className={`w-full flex justify-between px-3 md:px-4 py-3 md:py-4 ${themeMode === 'dark' ? 'bg-slate-900 border-slate-700 hover:border-slate-600' : 'bg-white border-2 border-slate-100 hover:' + activeColor.border} text-[11px] md:text-sm font-black text-slate-900 ${themeMode === 'dark' ? 'text-slate-100' : ''} transition-all mt-2 shadow-sm`}
                            >
                                <span>{t.startTestSuite}</span> <CheckCircle className={`w-4 h-4 md:w-5 md:h-5 ${activeColor.text}`} />
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3 mb-4 md:mb-6">
            {calculationMethod === 'within' ? (
              <div className="w-full space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {subgroupValues.map((val, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-400 text-center">{idx + 1}</span>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => handleSubgroupChange(idx, e.target.value)}
                        className={`w-full px-2 py-1.5 text-center text-xs font-mono font-bold transition-all border-2 ${inputClass}`}
                        placeholder="-"
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="submit"
                  className={`w-full py-2 ${activeColor.newStudy} text-white text-xs font-bold rounded-sm flex items-center justify-center gap-2`}
                >
                  <Plus className="w-4 h-4" /> {t.addAnyway}
                </button>
              </div>
            ) : (
              <div className="relative w-full max-w-[180px]">
                  <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className={`w-full px-3 md:px-4 py-1.5 md:py-2 h-[36px] md:h-[40px] text-center text-sm md:text-base font-mono font-bold transition-all border-2 ${inputClass}`}
                  placeholder="-"
                  />
                  <button
                  type="submit"
                  disabled={!inputValue}
                  className={`absolute right-1 top-1 bottom-1 px-2 md:px-3 ${themeMode === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-100' : 'bg-white hover:bg-slate-50 text-slate-900'} rounded-sm disabled:opacity-0 transition-all flex items-center justify-center`}
                  >
                  <Plus className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
              </div>
            )}
        </form>

        <div className={`flex-1 overflow-y-auto mb-4 md:mb-6 border-2 ${activeColor.border} ${themeMode === 'dark' ? 'bg-slate-900' : 'bg-white'} p-2 md:p-3 custom-scrollbar`}>
            {data.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                <Activity className="w-8 h-8 md:w-12 md:h-12 mb-3" />
                <p className="text-sm md:text-base italic">{t.noData}</p>
            </div>
            ) : (
            <div className="space-y-4">
                {calculationMethod === 'within' ? (
                  // Group data by subgroup size for display
                  Array.from({ length: Math.ceil(data.length / subgroupSize) }).map((_, gIdx) => {
                    const group = data.slice(gIdx * subgroupSize, (gIdx + 1) * subgroupSize);
                    const isComplete = group.length === subgroupSize;
                    return (
                      <div key={gIdx} className={`p-2 border-2 ${themeMode === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'} rounded-sm`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.sample} {gIdx + 1}</span>
                          <button 
                            onClick={() => {
                              group.forEach(item => onRemoveData(item.id));
                            }}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {group.map((item, i) => {
                            const isOutOfSpec = (limits.lsl !== undefined && item.value < limits.lsl) || 
                                                (limits.usl !== undefined && item.value > limits.usl);
                            return (
                              <div key={item.id} className={`p-1 text-center font-mono text-[10px] font-bold border ${isOutOfSpec ? 'border-red-500 text-red-500 bg-red-500/5' : 'border-slate-300 text-slate-600'}`}>
                                {item.value.toFixed(3)}
                              </div>
                            );
                          })}
                          {!isComplete && Array.from({ length: subgroupSize - group.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="p-1 text-center font-mono text-[10px] font-bold border border-dashed border-slate-300 text-slate-300">
                              -
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <ul className="grid grid-cols-2 gap-2 md:gap-3">
                      {data.slice().reverse().map((item, idx) => {
                        const isOutOfSpec = (limits.lsl !== undefined && item.value < limits.lsl) || 
                                            (limits.usl !== undefined && item.value > limits.usl);
                        return (
                          <li key={item.id} className={`flex justify-between items-center p-1.5 md:p-2 border-2 transition-colors ${
                            isOutOfSpec 
                              ? 'border-red-500 bg-red-500/10' 
                              : (themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white ' + activeColor.border)
                          } hover:border-opacity-80`}>
                            <span className="text-slate-400 font-mono text-[10px] md:text-[12px] font-semibold">#{data.length - idx}</span>
                            <div className="flex items-center gap-1.5 md:gap-2">
                                {isOutOfSpec && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                                <span className={`font-bold font-mono text-sm md:text-base ${
                                  isOutOfSpec ? 'text-red-500' : (themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900')
                                }`}>
                                  {item.value.toFixed(4)}
                                </span>
                                <button type="button" onClick={() => onRemoveData(item.id)} className="text-slate-400 hover:text-red-600 p-1">
                                    <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </button>
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                )}
            </div>
            )}
        </div>

        <div className={`pt-3 md:pt-4 border-t-2 ${themeMode === 'dark' ? 'border-slate-800' : 'border-slate-100'} flex justify-between items-center text-sm md:text-base text-slate-400 mb-3 md:mb-4`}>
            <span className={`font-bold ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white ' + activeColor.border + ' text-slate-900'} px-3 md:px-4 py-1.5 md:py-2 rounded-sm border-2 text-[11px] md:text-sm shadow-sm transition-colors duration-500`}>{t.count}: {data.length}</span>
            {data.length > 0 && (
            <button onClick={handleClearClick} className={`flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 text-[11px] md:text-sm font-bold transition-all ${confirmClear ? 'bg-red-600 text-white' : 'text-red-500 hover:text-red-700'}`}>
                <RotateCcw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${confirmClear ? 'animate-spin' : ''}`} />
                {confirmClear ? t.sure : t.clear}
            </button>
            )}
        </div>

        <div className="flex gap-3 items-center">
            <button 
                onClick={onAnalyze}
                className={`flex-1 h-10 md:h-12 rounded-full flex items-center justify-center gap-2 md:gap-3 font-bold text-white transition-all transform active:scale-95 text-[11px] md:text-sm uppercase tracking-wide shadow-md ${getBtnColor()}`}
            >
                {isDataDirty && hasStats ? (
                    <><RefreshCw className="w-4 h-4 md:w-5 md:h-5" /> {t.updateAnalysis}</>
                ) : (
                    <><PlayCircle className="w-4 h-4 md:w-5 md:h-5" /> {t.runAnalysis}</>
                )}
            </button>
        </div>

      </div>
    </div>
  );
};

export default DataInput;
