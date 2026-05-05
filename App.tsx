
import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from 'react'; // Build Version: 2026-03-13-v1
import { 
  Menu, X, Globe, Plus, FolderOpen, Save, FileSpreadsheet, Monitor, Play, CheckCircle2, RotateCcw as RotateCcwIcon, FileText,
  AlertTriangle, CheckCircle, Clock, DownloadCloud, Download, WifiOff, Circle, PlayCircle, Info, Settings, Gauge, Book, BarChart, Calculator, ChevronDown, BookOpen, Target, HelpCircle, ShieldCheck, Scale, Mail, Sigma, FileDown, Palette, Layers, Maximize, ExternalLink, Loader2, Users, RefreshCw, LayoutDashboard, Sparkles, LogIn
} from 'lucide-react';
import DataInput from './DataInput';
import LimitsInput from './LimitsInput';
import CapabilityReport from './CapabilityReport';
import StudyDetails from './StudyDetails';
import { calculateStatistics, generateHistogramData } from './statsService';
import { Measure, MeasurementData, StudyInfo, AppTheme, ProcessLimits, StandardType, DistributionType } from './types';
import { Language, translations, languageNames } from './locales';
import * as XLSX from 'xlsx';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import PhoneFrame from './PhoneFrame';
import ReactMarkdown from 'react-markdown';
import * as DistMath from './distributionMath';
const HitTheMeanGame = lazy(() => import('./src/components/HitTheMeanGame'));
import { APP_IDENTITY, EXTERNAL_LINKS, APP_LIMITS } from './config';

const uuidv4 = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const LogoIcon = ({ colorClass }: { colorClass: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={colorClass}
    style={{ minWidth: '100%', minHeight: '100%' }}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
    <path d="M6 17v-3" strokeWidth="2" />
    <path d="M9 17v-6" strokeWidth="2" />
    <path d="M12 17v-8" strokeWidth="2" />
    <path d="M15 17v-6" strokeWidth="2" />
    <path d="M18 17v-3" strokeWidth="2" />
    <path d="M4 16 C 8 6, 16 6, 20 16" strokeWidth="1.5" />
  </svg>
);

const NormalCurve = ({ color }: { color: string }) => (
  <svg viewBox="0 0 400 200" className="w-full h-48 opacity-60">
    {/* Histogram Bars - 8 bars */}
    {[...Array(8)].map((_, i) => {
      const barWidth = 40;
      const gap = 10;
      const totalWidth = 400;
      const step = totalWidth / 8;
      const x = i * step + (step - barWidth) / 2;
      
      // Calculate height based on distance from center (3.5)
      const dist = Math.abs(i - 3.5);
      // Adjusted formula for 8 bars to look like a bell curve
      const height = Math.max(10, 160 * Math.exp(-(dist * dist) / 4));
      
      return (
        <rect
          key={i}
          x={x}
          y={180 - height}
          width={barWidth}
          height={height}
          fill="#3b82f6" // Blue-500
          opacity={0.2 + (1 - dist / 4) * 0.4}
          rx="4"
        />
      );
    })}
    {/* Symmetrical Bell Curve */}
    <path
      d="M 0 180 C 100 180 130 20 200 20 C 270 20 300 180 400 180"
      fill="none"
      stroke="#1d4ed8" // Blue-700
      strokeWidth="3"
      strokeLinecap="round"
      className="drop-shadow-sm"
    />
  </svg>
);

const LandingPage: React.FC<{ onStart: () => void; themeColor: any; language: Language; onLanguageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }> = ({ onStart, themeColor, language, onLanguageChange }) => {
  const t = translations[language];
  return (
    <div className="h-full w-full bg-black flex flex-col relative overflow-hidden">
      {/* Background subtle pattern */}
      <div className="absolute inset-0 opacity-[0.1] pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      </div>
      
      {/* Darker tone at the bottom */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>

      {/* HEADER: LOGO - LOCKED SECTION: DO NOT MODIFY LAYOUT, SPACING OR POSITIONING */}
      <div className="w-full p-6 z-10 flex flex-col items-center shrink-0 mt-4">
        <div className="inline-flex flex-col items-center">
          <h1 className="text-5xl font-black tracking-tighter text-amber-500 leading-none flex items-start">
            {APP_IDENTITY.name}
            <span className="text-[14px] font-bold text-slate-500 ml-1 mt-1 align-top select-none">{APP_IDENTITY.registrationSymbol}</span>
          </h1>
          <div className="w-full flex justify-between mt-[-7px] px-0.5">
            {t.appSubtitle.split("").map((char: string, i: number) => (
              <span key={i} className="text-[13px] font-medium text-slate-500 uppercase select-none">
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </div>
        </div>
      </div>
      {/* END LOCKED SECTION */}

      {/* MIDDLE: BUTTON */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 w-full gap-4">
        <button 
          onClick={onStart}
          className={`px-8 py-5 ${themeColor.newStudy} text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] transition-all active:scale-95 hover:translate-y-[-2px] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] rounded-sm whitespace-nowrap`}
        >
          {t.landingStart}
        </button>
      </div>

      {/* BOTTOM: CURVE + TEXT */}
      <div className="w-full max-w-[260px] flex flex-col items-center gap-6 z-10 mb-12 mx-auto shrink-0">
        <div className="w-full">
          <NormalCurve color={themeColor.hex} />
        </div>
        <div className="flex flex-col items-center gap-4">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] opacity-80">
            {t.landingStandards}
          </p>
          
          {/* Language Selector */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Globe className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors" />
            </div>
            <select 
              value={language} 
              onChange={onLanguageChange}
              className="appearance-none bg-slate-900/50 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 text-[10px] font-bold uppercase tracking-widest py-2 pl-8 pr-8 border border-slate-800 hover:border-slate-700 rounded-full transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-700"
            >
              {Object.entries(languageNames).map(([code, name]) => (
                <option key={code} value={code} className="bg-slate-900 text-white">{name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <ChevronDown className="w-3 h-3 text-slate-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('digicap_lang') : null;
      return (saved as Language) || 'en';
    } catch (e) {
      return 'en';
    }
  });

  const [theme] = useState<AppTheme>('sharp');
  const t = translations[language];

  type AppColor = 'orange' | 'red' | 'green' | 'blue';
  const [appColor, setAppColor] = useState<AppColor>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('digicap_color') : null;
      return (saved as AppColor) || 'blue';
    } catch (e) {
      return 'blue';
    }
  });

  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('digicap_theme_mode') : null;
      return (saved as 'light' | 'dark') || 'light';
    } catch (e) {
      return 'light';
    }
  });

  const [showLanding, setShowLanding] = useState(true);

  const [studyKey, setStudyKey] = useState<number>(Date.now());

  const handleColorChange = (color: AppColor) => {
    setAppColor(color);
    try { localStorage.setItem('digicap_color', color); } catch (e) {}
  };

  const handleThemeModeChange = (mode: 'light' | 'dark') => {
    setThemeMode(mode);
    try { localStorage.setItem('digicap_theme_mode', mode); } catch (e) {}
  };

  const themeColors = {
    orange: {
      name: t.colorOrange,
      primary: 'amber',
      logo: 'text-white',
      newStudy: 'bg-amber-600 hover:bg-amber-700',
      activeTab: 'bg-amber-600 border-amber-600',
      border: 'border-amber-500',
      text: 'text-amber-500',
      icon: 'text-amber-600',
      hex: '#f59e0b',
      stroke: '#d97706',
      lightBg: 'bg-amber-50',
      lightBorder: 'border-amber-100',
      darkText: 'text-amber-900'
    },
    red: {
      name: t.colorRed,
      primary: 'red',
      logo: 'text-white',
      newStudy: 'bg-red-700 hover:bg-red-800',
      activeTab: 'bg-red-700 border-red-700',
      border: 'border-red-600',
      text: 'text-red-600',
      icon: 'text-red-700',
      hex: '#dc2626',
      stroke: '#991b1b',
      lightBg: 'bg-red-50',
      lightBorder: 'border-red-100',
      darkText: 'text-red-900'
    },
    green: {
      name: t.colorGreen,
      primary: 'emerald',
      logo: 'text-white',
      newStudy: 'bg-emerald-700 hover:bg-emerald-800',
      activeTab: 'bg-emerald-700 border-emerald-700',
      border: 'border-emerald-600',
      text: 'text-emerald-600',
      icon: 'text-emerald-700',
      hex: '#059669',
      stroke: '#065f46',
      lightBg: 'bg-emerald-50',
      lightBorder: 'border-emerald-100',
      darkText: 'text-emerald-900'
    },
    blue: {
      name: t.colorBlue,
      primary: 'blue',
      logo: 'text-white',
      newStudy: 'bg-blue-900 hover:bg-blue-950',
      activeTab: 'bg-blue-900 border-blue-900',
      border: 'border-blue-900',
      text: 'text-blue-700',
      icon: 'text-blue-800',
      hex: '#1e3a8a',
      stroke: '#172554',
      lightBg: 'bg-blue-50',
      lightBorder: 'border-blue-100',
      darkText: 'text-blue-900'
    }
  };

  const currentTheme = themeColors[appColor] || themeColors.blue;

  const [showNewStudyConfirm, setShowNewStudyConfirm] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [recentStudies, setRecentStudies] = useState<any[]>(() => {
    try {
      if (typeof window === 'undefined') return [];
      const saved = localStorage.getItem('digicap_recent_studies');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [isTeaserMode, setIsTeaserMode] = useState(false);

  const [showAbout, setShowAbout] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const fetchWebhookLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const baseUrl = Capacitor.isNativePlatform() ? EXTERNAL_LINKS.API_BASE_URL : '';
      const response = await fetch(`${baseUrl}/api/webhook-logs`);
      const data = await response.json();
      setWebhookLogs(data.logs || []);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleAdminLogin = () => {
    if (adminPasswordInput === '1731') {
      setIsAdminAuthenticated(true);
      fetchWebhookLogs();
    } else {
      alert(t.trialInvalidCode || "Invalid password");
    }
  };

  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showOverlayModal, setShowOverlayModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  
  const [overlayMeasureIds, setOverlayMeasureIds] = useState<string[]>([]);
  const [showOverlayReport, setShowOverlayReport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [showStudyGuide, setShowStudyGuide] = useState(false);
  const [showFormulaGuide, setShowFormulaGuide] = useState(false);
  const [showDistGuide, setShowDistGuide] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [showTraining, setShowTraining] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const [trialData, setTrialData] = useState<{
    count: number;
    unlocked: number;
    isForever: boolean;
    lastStudyId: string | number | null;
    hasSeenWelcome: boolean;
    qualitasUseCount: number;
  }>(() => {
    try {
      const saved = localStorage.getItem('digicap_trial_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        const unlocked = typeof parsed.unlocked === 'number' ? parsed.unlocked : 0;
        const qualitasUseCount = typeof parsed.qualitasUseCount === 'number' ? parsed.qualitasUseCount : 0;
        
        return { 
          count: typeof parsed.count === 'number' ? parsed.count : 0, 
          // Clamp unlocked studies to 3 if not forever
          unlocked: !!parsed.isForever ? 999999 : (qualitasUseCount > 0 ? 3 : 0), 
          isForever: !!parsed.isForever, 
          lastStudyId: parsed.lastStudyId || null,
          hasSeenWelcome: !!parsed.hasSeenWelcome,
          qualitasUseCount: qualitasUseCount
        };
      }
    } catch (e) {}
    // Fallback to individual keys if trial_data doesn't exist yet
    try {
      const count = parseInt(localStorage.getItem('digicap_studies_count') || '0', 10);
      const isForever = localStorage.getItem('digicap_unlocked') === 'true' && localStorage.getItem('digicap_temp_unlocked') !== 'true';
      const isTemporary = localStorage.getItem('digicap_temp_unlocked') === 'true';
      const qualitasCount = parseInt(localStorage.getItem('digicap_qualitas_count') || '0', 10);
      
      return {
        count: count,
        unlocked: isForever ? 999999 : (isTemporary ? 3 : 0),
        isForever: isForever,
        lastStudyId: localStorage.getItem('digicap_last_counted_id') || null,
        hasSeenWelcome: count > 0,
        qualitasUseCount: Math.min(qualitasCount, 1)
      };
    } catch (e) {}
    return { count: 0, unlocked: 0, isForever: false, lastStudyId: null, hasSeenWelcome: false, qualitasUseCount: 0 };
  });

  const [trialCode, setTrialCode] = useState('');
  const [trialFeedback, setTrialFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showTrialWarning, setShowTrialWarning] = useState(false);
  const [showTrialEndedModal, setShowTrialEndedModal] = useState(false);

  const [isActivating, setIsActivating] = useState(false);
  const [isStorageBlocked, setIsStorageBlocked] = useState(false);

  const totalAllowedTrials = APP_LIMITS.TRIAL_STUDIES_LIMIT + (trialData.isForever ? 999999 : trialData.unlocked);
  const isLocked = !trialData.isForever && trialData.count >= totalAllowedTrials; 

  useEffect(() => {
    try {
      localStorage.setItem('digicap_trial_data', JSON.stringify(trialData));
      // Also sync back to individual keys for compatibility if needed
      localStorage.setItem('digicap_studies_count', trialData.count.toString());
      localStorage.setItem('digicap_qualitas_count', trialData.qualitasUseCount.toString());
      if (trialData.isForever) {
        localStorage.setItem('digicap_unlocked', 'true');
        localStorage.removeItem('digicap_temp_unlocked');
      } else if (trialData.unlocked > 0) {
        localStorage.setItem('digicap_temp_unlocked', 'true');
      }
    } catch (e) {}
  }, [trialData]);

  useEffect(() => {
    // Check if localStorage is blocked
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      setIsStorageBlocked(false);
    } catch (e) {
      setIsStorageBlocked(true);
    }

    // Strict enforcement of trial limits on mount
    const hasActiveStudy = !!localStorage.getItem('digicap_study_data') || (recentStudies.length > 0);
    if (isLocked && !hasActiveStudy) {
      setShowTrialEndedModal(true);
    }
  }, [isLocked, recentStudies.length]);

  const handleActivateCode = async () => {
    const code = trialCode.trim().toLowerCase();
    if (!code) return;
    
    setIsActivating(true);
    setTrialFeedback(null);

    try {
      // First check for "super codes" (for testing/admin)
      if (code === 'qualitas' || code === 'qualitas forever') {
        if (code === 'qualitas') {
          if (trialData.qualitasUseCount >= 1) {
            setTrialFeedback({ message: t.qualitasLimitReached, type: 'error' });
            return;
          }

          setTrialData(prev => ({
            ...prev,
            unlocked: 3, // Set exactly to 3 extra studies
            qualitasUseCount: prev.qualitasUseCount + 1
          }));
          setTrialFeedback({ message: t.bonusStudiesUnlocked, type: 'success' });
          setTimeout(() => {
            setShowTrialEndedModal(false);
            setTrialFeedback(null);
            setTrialCode('');
          }, 2000);
          return;
        }

        // Permanent unlock for developer
        setTrialData(prev => ({ ...prev, isForever: true }));
        setTrialFeedback({ message: t.qualitasWarning, type: 'success' });
        setTimeout(() => {
          setShowTrialEndedModal(false);
          setTrialFeedback(null);
          setTrialCode('');
        }, 6000);
        return;
      }

      // Real validation against our backend
      const baseUrl = Capacitor.isNativePlatform() ? EXTERNAL_LINKS.API_BASE_URL : '';
      const response = await fetch(`${baseUrl}/api/validate-license`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          licenseKey: code,
          instanceName: localStorage.getItem('digicap_device_id') || `Device-${uuidv4().substring(0, 8)}`
        })
      });

      // Ensure the device ID is saved if it was just generated
      if (!localStorage.getItem('digicap_device_id')) {
        localStorage.setItem('digicap_device_id', `Device-${uuidv4().substring(0, 8)}`);
      }

      const data = await response.json();

      if (data.valid) {
        setTrialData(prev => ({ ...prev, isForever: true }));
        setTrialFeedback({ message: t.trialUnlockedForever, type: 'success' });
        setTimeout(() => {
          setShowTrialEndedModal(false);
          setTrialFeedback(null);
          setTrialCode('');
        }, 2000);
      } else {
        setTrialFeedback({ message: data.message || t.invalidCode, type: 'error' });
      }
    } catch (error) {
      console.error("Activation failed:", error);
      if (!navigator.onLine) {
        setTrialFeedback({ message: t.networkError, type: 'error' });
      } else {
        setTrialFeedback({ message: t.invalidCode, type: 'error' });
      }
    } finally {
      setIsActivating(false);
    }
  };

  const colors = {
    header: 'bg-slate-950',
    logo: currentTheme.logo,
    newStudy: currentTheme.newStudy,
    activeTab: currentTheme.activeTab,
    bg: themeMode === 'light' ? 'bg-slate-200' : 'bg-slate-950' 
  };

  const createDefaultMeasure = useCallback((currentLanguage: Language, index: number): Measure => {
      const t = translations[currentLanguage];
      return {
          id: uuidv4(),
          name: '', 
          data: [],
          limits: { 
            lsl: undefined, 
            usl: undefined, 
            target: undefined, 
            standard: 'IATF', 
            toleranceType: 'double' 
          },
          distribution: 'Normal',
          stats: null,
          histogram: [],
          isAnalyzed: false,
          sigmaLevel: 3,
          calculationMethod: 'serial',
          subgroupSize: 2
      };
  }, []);

  const [measures, setMeasures] = useState<Measure[]>(() => [createDefaultMeasure(language, 1)]);
  const [activeMeasureId, setActiveMeasureId] = useState<string>(measures[0].id);

  const activeMeasure = useMemo(() => measures.find(m => m.id === activeMeasureId) || measures[0], [measures, activeMeasureId]);
  const measuresToOverlay = useMemo(() => showOverlayReport 
    ? measures.filter(m => overlayMeasureIds.includes(m.id)) 
    : undefined, [showOverlayReport, measures, overlayMeasureIds]);

  const [studyInfo, setStudyInfo] = useState<StudyInfo>({
    id: uuidv4(),
    partNumber: '',
    revision: '',
    machineNumber: '',
    date: new Date().toISOString().split('T')[0],
    studyType: 'Machine',
    studyPurpose: '',
    performedBy: ''
  });

  // Auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (measures.length > 0 && (measures[0].data.length > 0 || studyInfo.partNumber)) {
        const currentStudy = {
          id: studyInfo.id,
          studyInfo,
          measures,
          appColor,
          language,
          timestamp: Date.now()
        };

        setRecentStudies(prev => {
          const filtered = prev.filter(s => s.id !== studyInfo.id);
          const updated = [currentStudy, ...filtered].slice(0, 10); // Keep last 10
          localStorage.setItem('digicap_recent_studies', JSON.stringify(updated));
          return updated;
        });
      }
    }, 2000); // Debounce 2s

    return () => clearTimeout(timer);
  }, [measures, studyInfo, appColor, language]);

  const [isDataDirty, setIsDataDirty] = useState(false);

  const handleLanguageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as Language;
    setLanguage(newLang);
    try { localStorage.setItem('digicap_lang', newLang); } catch (e) {}
  }, []);

  const handleAddMeasure = useCallback(() => {
      if (measures.length >= APP_LIMITS.MAX_MEASURES) { alert(t.maxMeasures); return; }
      const newMeasure = createDefaultMeasure(language, measures.length + 1);
      setMeasures(prev => [...prev, newMeasure]);
      setActiveMeasureId(newMeasure.id);
      setShowOverlayReport(false);
  }, [createDefaultMeasure, language, t.maxMeasures, measures.length]);

  const handleDeleteMeasure = useCallback(() => {
      if (measures.length <= 1) return;
      if (!confirm(t.deleteMeasureConfirm)) return;
      
      const newMeasures = measures.filter(m => m.id !== activeMeasureId);
      setMeasures(newMeasures);
      setActiveMeasureId(newMeasures[0].id);
      setShowOverlayReport(false);
  }, [activeMeasureId, t.deleteMeasureConfirm, measures]);

  const updateActiveMeasure = useCallback((updates: Partial<Measure>) => {
      setMeasures(prev => prev.map(m => m.id === activeMeasureId ? { 
        ...m, 
        ...updates, 
        isAnalyzed: updates.isAnalyzed !== undefined ? updates.isAnalyzed : m.isAnalyzed 
      } : m));
      // Only set dirty if we are actually changing data or limits
      if (updates.data || updates.limits || updates.distribution || updates.subgroupSize || updates.calculationMethod) {
          setIsDataDirty(true);
      }
  }, [activeMeasureId]);

  const handleUpdateLimits = useCallback((newLimits: ProcessLimits) => {
    setMeasures(prev => prev.map(m => m.id === activeMeasureId ? { ...m, limits: newLimits, isAnalyzed: false, stats: null, histogram: [] } : m));
    setIsDataDirty(true);
  }, [activeMeasureId]);

  const handleUpdateName = useCallback((newName: string) => updateActiveMeasure({ name: newName }), [updateActiveMeasure]);
  
  const handleAddData = useCallback((val: number) => {
    setMeasures(prev => prev.map(m => {
        if (m.id === activeMeasureId) {
            return { ...m, data: [...m.data, { id: uuidv4(), value: val, timestamp: Date.now() }], isAnalyzed: false, stats: null, histogram: [] };
        }
        return m;
    }));
    setIsDataDirty(true);
  }, [activeMeasureId]);

  const handleAddSubgroup = useCallback((vals: number[]) => {
    setMeasures(prev => prev.map(m => {
        if (m.id === activeMeasureId) {
            const newData = [...m.data, ...vals.map(v => ({ id: uuidv4(), value: v, timestamp: Date.now() }))];
            return { ...m, data: newData, isAnalyzed: false, stats: null, histogram: [] };
        }
        return m;
    }));
    setIsDataDirty(true);
  }, [activeMeasureId]);

  const handleClearData = useCallback(() => { 
      updateActiveMeasure({ data: [], stats: null, histogram: [], isAnalyzed: false }); 
      setIsDataDirty(false); 
  }, [updateActiveMeasure]);

  const handleRemoveData = useCallback((id: string) => {
    setMeasures(prev => prev.map(m => {
        if (m.id === activeMeasureId) {
            return { ...m, data: m.data.filter(d => d.id !== id), isAnalyzed: false, stats: null, histogram: [] };
        }
        return m;
    }));
    setIsDataDirty(true);
  }, [activeMeasureId]);
  
  const handleSimulateData = useCallback((count: number, mean: number, stdDev: number, distribution: DistributionType = 'Normal') => {
    const newData = Array.from({ length: count }, () => {
      let val = 0;
      
      if (distribution === 'Normal') {
        val = DistMath.generateNormalValue(mean, stdDev);
      } else if (distribution === 'LogNormal') {
        const variance = Math.pow(stdDev, 2);
        const mu = Math.log(mean / Math.sqrt(1 + variance / Math.pow(mean, 2)));
        const sigma = Math.sqrt(Math.log(1 + variance / Math.pow(mean, 2)));
        val = DistMath.generateLogNormalValue(mu, sigma);
      } else if (distribution === 'Weibull') {
        // Use a fixed shape for a typical Weibull profile, scale Lambda to roughly match mean
        const k = 1.5; 
        const lambda = mean / 0.9027; // Gamma(1 + 1/1.5) approx 0.9027
        val = DistMath.generateWeibullValue(k, lambda);
        // Offset to roughly center it around 'mean' if it's a shifted study
        val += (mean - (lambda * 0.9027));
      } else if (distribution === 'Rayleigh') {
        const rayleighSigma = mean / Math.sqrt(Math.PI / 2);
        val = DistMath.generateRayleighValue(rayleighSigma);
        // Rayleigh is often zero-bounded, but if simulating "about a target", we may need an offset
        // For general SPC test simulation, we offset so the mode/mean is near user's mean
        const theoreticalMean = rayleighSigma * Math.sqrt(Math.PI / 2);
        val += (mean - theoreticalMean);
      } else if (distribution === 'Folded') {
        // Use user's mean and stdDev for the underlying Normal
        val = DistMath.generateFoldedNormalValue(mean, stdDev);
      } else {
        val = DistMath.generateNormalValue(mean, stdDev);
      }

      // Round to 4 decimals
      const roundedVal = Math.round(val * 10000) / 10000;
      return { id: uuidv4(), value: roundedVal, timestamp: Date.now() };
    });
    setMeasures(prev => prev.map(m => m.id === activeMeasureId ? { ...m, data: [...m.data, ...newData], isAnalyzed: false, stats: null, histogram: [] } : m));
    setIsDataDirty(true);
  }, [activeMeasureId]);

  const handleImportData = useCallback((values: number[]) => {
      setMeasures(prev => prev.map(m => m.id === activeMeasureId ? { ...m, data: [...m.data, ...values.map(val => ({ id: uuidv4(), value: val, timestamp: Date.now() }))], isAnalyzed: false, stats: null, histogram: [] } : m));
  }, [activeMeasureId]);

  const handleStartTestSuite = useCallback((studyType: StudyInfo['studyType'], distribution: DistributionType, sigma: number) => {
    setStudyInfo(prev => ({
      ...prev,
      studyType: studyType,
      partNumber: t.testStudyName,
      studyPurpose: t.testStudyPurpose,
      performedBy: 'SYSTEM',
      date: new Date().toISOString().split('T')[0]
    }));
    
    const testLimits: ProcessLimits = {
      lsl: 9.5,
      usl: 10.5,
      target: 10,
      standard: 'IATF',
      toleranceType: 'double'
    };
    
    const testData = Array.from({ length: 50 }, () => {
      let val = 0;
      const mean = 10;
      const stdDev = 0.5 / sigma; // Approximate to be within 9.5-10.5

      if (distribution === 'Normal') {
        val = DistMath.generateNormalValue(mean, stdDev);
      } else if (distribution === 'LogNormal') {
        const variance = Math.pow(stdDev, 2);
        const mu = Math.log(mean / Math.sqrt(1 + variance / Math.pow(mean, 2)));
        const s = Math.sqrt(Math.log(1 + variance / Math.pow(mean, 2)));
        val = DistMath.generateLogNormalValue(mu, s);
      } else if (distribution === 'Weibull') {
        val = DistMath.generateWeibullValue(1.5, mean / 0.9027) + (mean - mean);
      } else if (distribution === 'Rayleigh') {
        val = DistMath.generateRayleighValue(mean / Math.sqrt(Math.PI / 2));
      } else if (distribution === 'Folded') {
        val = DistMath.generateFoldedNormalValue(mean, stdDev);
      } else {
        val = DistMath.generateNormalValue(mean, stdDev);
      }

      const roundedVal = Math.round(val * 10000) / 10000;
      return { id: uuidv4(), value: roundedVal, timestamp: Date.now() };
    });

    setMeasures(prev => prev.map(m => m.id === activeMeasureId ? { 
      ...m, 
      name: 'TEST',
      limits: testLimits, 
      data: testData, 
      distribution: distribution,
      sigmaLevel: sigma,
      isAnalyzed: false, 
      stats: null, 
      histogram: [] 
    } : m));
    
    setIsDataDirty(true);
    
    setTimeout(() => {
      const stats = calculateStatistics(
        testData, 
        testLimits, 
        sigma, 
        distribution, 
        studyType,
        activeMeasure.calculationMethod || 'serial',
        activeMeasure.subgroupSize || 2
      );
      if (stats) {
        setMeasures(prev => prev.map(m => m.id === activeMeasureId ? {
          ...m,
          stats: stats,
          histogram: generateHistogramData(testData, stats, testLimits, distribution),
          isAnalyzed: true
        } : m));
        setIsDataDirty(false);
      }
    }, 100);
  }, [activeMeasureId, t.testStudyName, t.testStudyPurpose]);

  const incrementTrial = useCallback(() => {
    if (trialData.isForever) return true;
    
    // Check if this study has already been counted
    if (trialData.lastStudyId === studyInfo.id) return true;

    if (isLocked && trialData.count >= totalAllowedTrials) {
      setShowTrialEndedModal(true);
      return false;
    }

    setTrialData(prev => ({ 
      ...prev, 
      count: prev.count + 1,
      lastStudyId: studyInfo.id 
    }));
    return true;
  }, [trialData, totalAllowedTrials, studyInfo.id]);

  const performAnalysis = useCallback(() => {
    try {
      if (activeMeasure.data.length < 2) { 
        alert(t.tooFewMeasurements || "Too few measurements"); 
        return; 
      }
      
      // Check trial status
      if (!incrementTrial()) return;

      const stats = calculateStatistics(
        activeMeasure.data, 
        activeMeasure.limits, 
        activeMeasure.sigmaLevel || 3, 
        activeMeasure.distribution,
        studyInfo.studyType,
        activeMeasure.calculationMethod || 'serial',
        activeMeasure.subgroupSize || 2
      );
      
      if (stats) {
        const histogram = generateHistogramData(activeMeasure.data, stats, activeMeasure.limits, activeMeasure.distribution);
        updateActiveMeasure({ 
          stats: stats, 
          histogram: histogram, 
          isAnalyzed: true 
        });
        setIsDataDirty(false);
      }
    } catch (error) {
      console.error("Analysis crashed:", error);
      alert("Analysis failed. Please check your data.");
    }
  }, [activeMeasure, t.tooFewMeasurements, updateActiveMeasure, studyInfo.studyType, incrementTrial]);

  const handleExportPdf = async () => {
    const element = document.getElementById('capability-report-content');
    if (!element || isExporting) return;
    
    setIsExporting(true);
    
    // Give UI time to show loader and re-render the report with PDF-specific styles
    setTimeout(async () => {
      try {
        const opt = { 
          margin: 20, 
          filename: `Digicap_${studyInfo.partNumber || 'Export'}.pdf`, 
          image: { type: 'jpeg', quality: 0.98 }, 
          html2canvas: { 
            scale: 2, 
            useCORS: true, 
            letterRendering: true,
            logging: false
          }, 
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        const html2pdf = (window as any).html2pdf;
        if (html2pdf) {
          await html2pdf().set(opt).from(element).save();
        } else {
          alert(t.pdfLibError);
        }
      } catch (error) {
        console.error("PDF export failed:", error);
        alert(t.pdfExportError);
      } finally {
        setIsExporting(false);
      }
    }, 200);
  };

  const handleExportExcel = () => {
    if (isExporting) return;
    setIsExporting(true);
    
    setTimeout(() => {
      try {
        const wb = XLSX.utils.book_new();
        let combinedRows: any[] = [];
        
        combinedRows.push({ A: t.reportExportTitle, B: "" });
        combinedRows.push({ A: t.date, B: studyInfo.date });
        combinedRows.push({ A: "", B: "" });

        combinedRows.push({ A: t.studyInfo.toUpperCase(), B: "" });
        combinedRows.push({ A: t.partNo, B: studyInfo.partNumber });
        combinedRows.push({ A: t.revision, B: studyInfo.revision });
        combinedRows.push({ A: t.machineNo, B: studyInfo.machineNumber });
        combinedRows.push({ A: t.performedBy, B: studyInfo.performedBy });
        combinedRows.push({ A: "", B: "" });

        const targetMeasures = showOverlayReport ? measures.filter(m => overlayMeasureIds.includes(m.id)) : [activeMeasure];
        
        targetMeasures.forEach((m) => {
          if (!m.stats) return;
          
          const isMachine = studyInfo.studyType === 'Machine';
          const isPerformance = studyInfo.studyType === 'Performance';
          
          const label1 = isMachine ? "Cmk" : (isPerformance ? "Ppk" : "Cpk");
          const label2 = isMachine ? "Cm" : (isPerformance ? "Pp" : "Cp");

          // Prepend zero-width space to force left alignment in Excel
          const zws = "\u200B";

          combinedRows.push({ A: `--- ${m.name.toUpperCase() || t.reportDataLog.toUpperCase()} ---`, B: "" });
          combinedRows.push({ A: label1, B: zws + m.stats.cpk.toFixed(4) });
          combinedRows.push({ A: label2, B: zws + (m.stats.cp?.toFixed(4) || t.notAvailable) });
          combinedRows.push({ A: t.mean, B: zws + m.stats.mean.toFixed(6) });
          combinedRows.push({ A: t.stdDev, B: zws + m.stats.stdDev.toFixed(6) });
          combinedRows.push({ A: t.min, B: zws + m.stats.min.toFixed(6) });
          combinedRows.push({ A: t.max, B: zws + m.stats.max.toFixed(6) });
          combinedRows.push({ A: t.range, B: zws + (m.stats.max - m.stats.min).toFixed(6) });
          
          combinedRows.push({ A: "", B: "" });
          combinedRows.push({ A: t.reportDataLog.toUpperCase(), B: "" });
          m.data.forEach((d, i) => {
            combinedRows.push({ A: `${t.sample} ${i+1}`, B: zws + d.value });
          });
          combinedRows.push({ A: "", B: "" });
        });

        const ws = XLSX.utils.json_to_sheet(combinedRows, { skipHeader: true });
        ws['!cols'] = [{ wch: 25 }, { wch: 60 }];

        XLSX.utils.book_append_sheet(wb, ws, "Analysis");
        XLSX.writeFile(wb, `Digicap_${studyInfo.partNumber || 'Export'}.xlsx`);
      } catch (error) {
        console.error("Excel export failed:", error);
        alert(t.excelExportError);
      } finally {
        setIsExporting(false);
      }
    }, 200);
  };

  const handleOpenCheckout = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const url = EXTERNAL_LINKS.LEMON_SQUEEZY_CHECKOUT;
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const handleSave = useCallback(() => {
    setIsSaving(true);
    setTimeout(() => {
      try {
        const studyData = {
          measures,
          studyInfo,
          appColor,
          language,
          timestamp: Date.now()
        };
        
        // Save to localStorage as backup
        localStorage.setItem('digicap_study_data', JSON.stringify(studyData));
        
        // Also trigger file download for "Save" button
        const blob = new Blob([JSON.stringify(studyData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Digicap_${studyInfo.partNumber || 'Study'}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setToast({ message: t.studySaved, type: 'success' });
      } catch (e) {
        console.error("Save failed", e);
        setToast({ message: t.studySaveError, type: 'error' });
      } finally {
        setIsSaving(false);
      }
    }, 50);
  }, [measures, studyInfo, appColor, language, t.studySaved, t.studySaveError]);

  const handleLoad = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.name.toLowerCase().endsWith('.json')) {
        setToast({ message: "Please select a .json study file (not Excel)", type: 'error' });
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target?.result as string);
          if (data.measures) setMeasures(data.measures);
          if (data.studyInfo) setStudyInfo(data.studyInfo);
          if (data.appColor) setAppColor(data.appColor);
          if (data.language) setLanguage(data.language);
          
          setStudyKey(Date.now());
          setToast({ message: t.studyLoaded, type: 'success' });
        } catch (err) {
          console.error("Load from file failed", err);
          setToast({ message: t.studyLoadError, type: 'error' });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [t.studyLoaded, t.studyLoadError]);

  const handleResumeStudy = (study: any) => {
    // Allow resuming even if locked, so user can see their last study
    if (study.measures) setMeasures(study.measures);
    if (study.studyInfo) setStudyInfo(study.studyInfo);
    if (study.appColor) setAppColor(study.appColor);
    if (study.language) setLanguage(study.language);
    
    setStudyKey(Date.now());
    setActiveMeasureId(study.measures[0].id);
    setShowResumeModal(false);
    setIsDataDirty(false);
  };

  const handleStartApp = () => {
    const hasActiveStudy = !!localStorage.getItem('digicap_study_data') || (recentStudies.length > 0);
    
    // Only block if locked AND no active study to view
    if (isLocked && !hasActiveStudy) {
      setShowTrialEndedModal(true);
      return;
    }
    
    if (!trialData.hasSeenWelcome && trialData.count === 0) {
      setShowWelcomeModal(true);
      setTrialData(prev => ({ ...prev, hasSeenWelcome: true }));
    }
    
    setShowLanding(false);
  };

  const handleNewStudy = () => {
    setShowNewStudyConfirm(false);

    if (isLocked) {
      setShowTrialEndedModal(true);
      return;
    }

    if (!trialData.isForever && trialData.count === APP_LIMITS.TRIAL_WARNING_THRESHOLD) {
      setShowTrialWarning(true);
    }

    // Reset all operational states IMMEDIATELY
    setIsExporting(false);
    setIsDataDirty(false);

    try {
      const defaultMeasure = createDefaultMeasure(language, 1); 
      setMeasures([defaultMeasure]); 
      setActiveMeasureId(defaultMeasure.id); 
      setStudyInfo({ 
          id: uuidv4(),
          partNumber: '', 
          revision: '', 
          machineNumber: '', 
          date: new Date().toISOString().split('T')[0], 
          studyType: 'Machine', 
          studyPurpose: '', 
          performedBy: '' 
      }); 
      
      // Close all modals
      setShowOverlayReport(false);
      setShowOverlayModal(false);
      setOverlayMeasureIds([]);
      setShowSettings(false);
      setShowAbout(false);
      setShowTerms(false);
      setShowPrivacy(false);
      setShowStudyGuide(false);
      setShowFormulaGuide(false);
      setShowDistGuide(false);
      
      // Force remount
      setStudyKey(Date.now());
    } catch (error) {
      console.error("Failed to start new study:", error);
      alert(t.studyStartError);
    }
  };

  const compatibleMeasures = measures.filter(m => m.isAnalyzed && m.stats && m.limits.lsl === activeMeasure.limits.lsl && m.limits.usl === activeMeasure.limits.usl && m.limits.target === activeMeasure.limits.target );
  const toggleOverlayMeasure = (id: string) => setOverlayMeasureIds(prev => prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]);

  const standardHelpText = useMemo(() => {
      const std = activeMeasure.limits.standard;
      if (std === 'IATF') return t.standardDescIATF;
      if (std === 'VDA') return t.standardDescVDA;
      if (std === 'SEMI') return t.standardDescSEMI;
      return '';
  }, [activeMeasure.limits.standard, t]);

  const selectBaseStyle = useMemo(() => {
    const focusRing = `focus:ring-${currentTheme.primary}-500`;
    const arrowColor = currentTheme.hex.replace('#', '');
    return `block w-full px-3 py-2 text-sm font-bold rounded-sm appearance-none focus:outline-none focus:ring-2 ${focusRing} focus:border-transparent transition-all cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%23${arrowColor}%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%20%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-no-repeat bg-[right_0.5rem_center] shadow-sm`;
  }, [currentTheme]);

  return (
    <>
      {/* Trial Warning Modal */}
      {showTrialWarning && (
        <div className="fixed inset-0 z-[300] bg-slate-950/90 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-4 border-amber-600 max-w-sm w-full p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-4">{t.trialWarning}</h3>
            <button 
              onClick={() => setShowTrialWarning(false)}
              className="w-full py-4 bg-amber-600 text-white font-black uppercase tracking-widest rounded-sm hover:bg-amber-700 transition-colors"
            >
              {t.okBtn}
            </button>
          </div>
        </div>
      )}

      {/* Storage Blocked Warning Modal */}
      {isStorageBlocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl max-w-md w-full p-8 border border-red-200 dark:border-red-900/30">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-500" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {t.storageBlockedTitle}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t.storageBlockedDesc}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-md border border-slate-100 dark:border-slate-800 w-full">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  {t.instructions}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                  {t.storageBlockedInstruction}
                </p>
              </div>

              <button
                onClick={() => setIsStorageBlocked(false)}
                className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold uppercase tracking-widest text-xs rounded-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
              >
                {t.okBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-black mb-4 text-slate-900 dark:text-white uppercase tracking-tight">
              {t.welcomeTitle}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed font-medium">
              {t.welcomeDesc}
            </p>
            <button
              onClick={() => setShowWelcomeModal(false)}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-95 shadow-lg ${currentTheme.newStudy} text-white uppercase tracking-wider`}
            >
              {t.welcomeButton}
            </button>
          </div>
        </div>
      )}

      {/* Trial Ended Modal */}
      {showTrialEndedModal && (
        <div className="fixed inset-0 z-[300] bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border-4 border-red-600 max-w-md w-full p-8 text-center shadow-[0_0_50px_rgba(220,38,38,0.3)]">
            <ShieldCheck className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">{t.trialEndedTitle}</h3>
            <p className="text-slate-400 font-bold text-sm mb-8 leading-relaxed">
              {t.trialEndedDesc}
            </p>
            
            <div className="flex flex-col gap-4 mb-8">
              <button 
                onClick={() => {
                  setShowTrialEndedModal(false);
                  setShowLanding(false);
                  // If we have recent studies and current measures are empty, load the latest one
                  if (recentStudies.length > 0 && measures[0].data.length === 0 && !studyInfo.partNumber) {
                    handleResumeStudy(recentStudies[0]);
                  }
                }}
                className="w-full py-4 bg-slate-800 text-white font-black uppercase tracking-widest rounded-sm hover:bg-slate-700 transition-colors border-2 border-slate-700 flex items-center justify-center gap-2"
              >
                <FolderOpen className="w-5 h-5" />
                {t.viewLastStudy}
              </button>

              <a 
                href={`mailto:${t.contactEmail}`}
                className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 font-bold transition-colors"
              >
                <Mail className="w-4 h-4" />
                {t.contactEmail}
              </a>
              <a 
                href="https://digicap.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 font-bold transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                digicap.app
              </a>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  value={trialCode}
                  onChange={(e) => {
                    setTrialCode(e.target.value);
                    if (trialFeedback) setTrialFeedback(null);
                  }}
                  placeholder={t.enterKey}
                  className={`w-full bg-slate-800 border-2 ${trialFeedback?.type === 'error' ? 'border-red-500' : 'border-slate-700'} text-white px-4 py-3 rounded-sm font-bold focus:outline-none focus:border-red-600 transition-colors`}
                />
                {trialFeedback && (
                  <div className={`mt-2 text-sm font-bold ${trialFeedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trialFeedback.message}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={handleActivateCode}
                  disabled={isActivating}
                  className={`w-full py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-sm hover:bg-red-700 transition-colors active:scale-95 transform flex items-center justify-center gap-2 ${isActivating ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isActivating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t.activating || 'Activating...'}
                    </>
                  ) : (
                    t.activateCode
                  )}
                </button>
              </div>
              <button 
                onClick={() => {
                  setShowAbout(true);
                  setShowTrialEndedModal(false);
                }}
                className="w-full py-4 bg-emerald-700 text-white font-black uppercase tracking-widest rounded-sm hover:bg-emerald-800 transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                <Info className="w-5 h-5" />
                {t.infoAndPurchase || 'Info & Purchase'}
              </button>

              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-sm">
                <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">
                  {t.purchaseViaInfo || 'Purchase license via the Info (i) menu'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLanding ? (
        <PhoneFrame>
          <LandingPage 
            onStart={handleStartApp} 
            themeColor={currentTheme} 
            language={language} 
            onLanguageChange={handleLanguageChange} 
          />
        </PhoneFrame>
      ) : (
        <div key={studyKey} className={`h-[100dvh] flex flex-col font-sans ${themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'} ${colors.bg} overflow-hidden relative`}>
      <div className="shrink-0 z-50 sticky top-0 shadow-lg">
        <header className={`${colors.header} text-white border-b-4 ${currentTheme.border.replace('text', 'border')} pt-2 pb-2`}>
          <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center md:items-start justify-between gap-3 md:gap-0">
            <div className="flex flex-col items-center py-1">
              <div className="flex flex-row items-start justify-center gap-3 flex-wrap">
                <div className="flex flex-col items-center">
                  <h1 
                    onClick={() => setShowLanding(true)}
                    className="text-2xl font-black tracking-tight text-amber-500 leading-none flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                    title={t.tooltipHome}
                  >
                    DIGICAP
                    <span className="text-[7px] font-bold text-slate-400 ml-0.5 mt-[-12px] align-top select-none">®</span>
                  </h1>
              <p className="text-[7px] text-slate-400 font-medium tracking-[0.15em] uppercase mt-[-2px] text-center">{t.appSubtitle}</p>
                </div>
                {!trialData.isForever && (
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${trialData.unlocked > 0 ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'} whitespace-nowrap shadow-sm mt-1.5 md:mt-1`}>
                    {trialData.unlocked > 0 ? `${t.proTrial} (${trialData.count}/${totalAllowedTrials})` : `${t.trial} (${trialData.count}/${totalAllowedTrials})`}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-row md:flex-col items-center md:items-end gap-2 mt-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button onClick={handleLoad} className={`w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 border-slate-700 text-slate-300 hover:text-white transition-all active:scale-90 shrink-0 font-mono bg-slate-800/50`} title={t.tooltipOpen}><FolderOpen className="w-4 h-4 sm:w-4 sm:h-4" /></button>
                <button onClick={handleSave} className={`w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 border-slate-700 text-slate-300 hover:text-white transition-all active:scale-90 shrink-0 font-mono bg-slate-800/50`} title={t.tooltipSave} disabled={isSaving}>{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}</button>
                <button onClick={() => setShowAbout(true)} className={`w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 border-slate-700 text-slate-300 hover:text-white transition-all active:scale-90 shrink-0 font-mono bg-slate-800/50`} title={t.tooltipAbout}><Info className="w-4 h-4 sm:w-4 sm:h-4" /></button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettings(true);
                  }} 
                  className={`w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 border-slate-700 text-slate-300 hover:text-white transition-all active:scale-110 active:bg-slate-700 shrink-0 font-mono bg-slate-800/50 relative z-[100] cursor-pointer`} 
                  title={t.tooltipSettings}
                >
                  <Settings className="w-4 h-4 sm:w-4 sm:h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                 <button 
                  type="button"
                  onClick={handleExportExcel} 
                  title={t.tooltipExcel}
                  className={`w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 transition-all active:scale-90 shrink-0 ${activeMeasure.stats && !isExporting ? 'border-slate-700 text-emerald-400 hover:text-emerald-300 cursor-pointer bg-slate-800/50' : 'border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'} relative z-10 font-mono`} 
                  disabled={!activeMeasure.stats || isExporting}
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 sm:w-4 sm:h-4" />}
                </button>
                 <button 
                  type="button"
                  onClick={handleExportPdf} 
                  title={t.tooltipPdf}
                  className={`w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 transition-all active:scale-90 shrink-0 ${activeMeasure.stats && !isExporting ? 'border-slate-700 text-emerald-400 hover:text-emerald-300 cursor-pointer bg-slate-800/50' : 'border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'} relative z-10 font-mono`} 
                  disabled={!activeMeasure.stats || isExporting}
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 sm:w-4 sm:h-4" />}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="bg-slate-900 border-b-2 border-black shadow-inner">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-start sm:items-center justify-start py-2 gap-2 sm:gap-4">
              <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto">
                <button 
                  type="button"
                  onClick={() => setShowNewStudyConfirm(true)} 
                  title={t.tooltipNewStudy}
                  className={`px-2 sm:px-3 py-1.5 ${colors.newStudy} text-white rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider border-2 ${currentTheme.border.replace('text', 'border').replace('500', '600')} transition-all active:scale-95 whitespace-nowrap cursor-pointer relative z-10`}
                >
                  {t.newStudy}
                </button>

                {recentStudies.length > 0 && (
                  <button 
                    onClick={() => setShowResumeModal(true)} 
                    className={`px-2 sm:px-3 py-1.5 ${colors.newStudy} text-white rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider border-2 ${currentTheme.border.replace('text', 'border').replace('500', '600')} shrink-0 hover:opacity-90 transition-all active:scale-95 whitespace-nowrap flex items-center gap-1.5`}
                  >
                    <RefreshCw className="w-3 h-3" />
                    {t.restore}
                  </button>
                )}

                <button 
                  onClick={handleAddMeasure} 
                  className={`px-2 sm:px-3 py-1.5 ${colors.newStudy} text-white rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider border-2 ${currentTheme.border.replace('text', 'border').replace('500', '600')} shrink-0 hover:opacity-90 transition-all active:scale-95 whitespace-nowrap`}
                >
                  {t.addMeasure}
                </button>
                <button 
                  onClick={() => { setOverlayMeasureIds(compatibleMeasures.map(m => m.id)); setShowOverlayModal(true); }} 
                  className={`px-2 sm:px-3 py-1.5 ${colors.newStudy} text-white rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider border-2 ${currentTheme.border.replace('text', 'border').replace('500', '600')} flex items-center gap-1 shrink-0 hover:opacity-90 transition-all active:scale-95 whitespace-nowrap`}
                >
                  <Layers className="w-3 h-3" /> {t.overlayBtn}
                </button>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar justify-start w-full sm:w-auto">
                {measures.map((m, idx) => (
                <button 
                  key={m.id} 
                  onClick={() => { setActiveMeasureId(m.id); setShowOverlayReport(false); }} 
                  className={`min-w-[30px] sm:min-w-[36px] h-[32px] flex items-center justify-center text-[12px] font-mono font-bold rounded-sm border-2 shrink-0 transition-all ${activeMeasureId === m.id && !showOverlayReport ? colors.newStudy + ' text-white ' + currentTheme.border.replace('text', 'border').replace('500', '600') : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                >
                  {idx + 1}
                </button>
                ))}
              </div>
          </div>
        </div>
      </div>

      <main className="flex-1 w-full overflow-y-auto custom-scrollbar p-2 md:p-4">
        <div className="max-w-6xl mx-auto flex flex-col gap-4 md:gap-8 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <StudyDetails info={studyInfo} setInfo={setStudyInfo as any} language={language} theme={theme} themeColor={currentTheme} themeMode={themeMode} />
              <LimitsInput 
                key={`limits-${activeMeasure.id}`} 
                limits={activeMeasure.limits} 
                setLimits={handleUpdateLimits} 
                measureName={activeMeasure.name} 
                setMeasureName={handleUpdateName} 
                onAddMeasure={handleAddMeasure} 
                onDeleteMeasure={handleDeleteMeasure} 
                measureCount={measures.length} 
                language={language} 
                theme={theme} 
                themeColor={currentTheme} 
                measureId={activeMeasureId} 
                calculationMethod={activeMeasure.calculationMethod || 'serial'}
                setCalculationMethod={(method) => updateActiveMeasure({ calculationMethod: method })}
                subgroupSize={activeMeasure.subgroupSize || 2}
                setSubgroupSize={(size) => updateActiveMeasure({ subgroupSize: size })}
                themeMode={themeMode} 
              />
              <DataInput 
                key={`data-${activeMeasure.id}`} 
                data={activeMeasure.data} 
                limits={activeMeasure.limits} 
                onAddData={handleAddData} 
                onAddSubgroup={handleAddSubgroup}
                onClearData={handleClearData} 
                onRemoveData={handleRemoveData} 
                onAnalyze={performAnalysis} 
                isDataDirty={isDataDirty} 
                hasStats={!!activeMeasure.stats} 
                sigmaLevel={activeMeasure.sigmaLevel || 3} 
                setSigmaLevel={setSigmaLevel => updateActiveMeasure({ sigmaLevel: setSigmaLevel as number })} 
                language={language} 
                theme={theme} 
                themeColor={currentTheme} 
                onSimulateData={handleSimulateData} 
                onImportData={handleImportData} 
                onStartTestSuite={handleStartTestSuite} 
                calculationMethod={activeMeasure.calculationMethod || 'serial'}
                subgroupSize={activeMeasure.subgroupSize || 2}
                themeMode={themeMode} 
              />
          </div>

          <div className="w-full">
              {(showOverlayReport && measuresToOverlay && measuresToOverlay.length > 0 && measuresToOverlay[0].stats) || (activeMeasure.isAnalyzed && activeMeasure.stats) ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <CapabilityReport 
                          stats={(showOverlayReport && measuresToOverlay && measuresToOverlay.length > 0 && measuresToOverlay[0].stats) ? measuresToOverlay[0].stats : activeMeasure.stats!} 
                          limits={(showOverlayReport && measuresToOverlay && measuresToOverlay.length > 0) ? measuresToOverlay[0].limits : activeMeasure.limits} 
                          histogramData={activeMeasure.histogram} 
                          studyInfo={studyInfo} 
                          language={language}
                          distribution={activeMeasure.distribution}
                          overlayMeasures={measuresToOverlay}
                          rawData={activeMeasure.data}
                          calculationMethod={activeMeasure.calculationMethod || 'serial'}
                          subgroupSize={activeMeasure.subgroupSize || 2}
                          themeColor={currentTheme}
                          themeMode={themeMode}
                          isPdfExporting={isExporting}
                      />
                  </div>
              ) : (
                  <div className={`h-64 flex flex-col items-center justify-center text-slate-500 text-center ${themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-black'} border-4`}>
                      <BarChart className="w-16 h-16 mb-4 opacity-20" />
                      <h3 className="text-base font-black uppercase tracking-widest">{t.noData}</h3>
                      <p className="text-[12px] font-bold mt-2 uppercase tracking-widest opacity-40">{t.pressToAnalyze}</p>
                  </div>
              )}
          </div>
        </div>
      </main>

      {showSettings && (
          <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
              <div className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-black'} max-w-sm w-full border-4 flex flex-col max-h-[90vh]`} onClick={(e) => e.stopPropagation()}>
                  <div className={`${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'} px-4 py-4 border-b-2 flex justify-between items-center`}><div className="flex items-center gap-2"><Settings className={`w-5 h-5 ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-800'}`} /><h3 className={`font-bold text-sm uppercase tracking-wider ${themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{t.params}</h3></div><button onClick={() => setShowSettings(false)}><X className="w-6 h-6 text-slate-500" /></button></div>
                  <div className="p-6 space-y-8 overflow-y-auto">
                      {/* License Section */}
                      <div className={`p-6 rounded-sm border-2 ${trialData.isForever ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className={`w-5 h-5 ${trialData.isForever ? 'text-emerald-500' : 'text-amber-500'}`} />
                            <h4 className={`font-black uppercase tracking-widest text-[11px] ${themeMode === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {trialData.isForever ? 'DigiCap® Pro Active' : 'Free Version'}
                            </h4>
                          </div>
                          {trialData.isForever && (
                            <span className="px-2 py-1 bg-emerald-500 text-white text-[9px] font-black rounded-full uppercase tracking-tighter">Lifetime</span>
                          )}
                        </div>

                        {!trialData.isForever ? (
                          <div className="space-y-3">
                            <p className="text-[11px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest text-center">
                              {t.professionalFeaturesUnlocked || 'Professional license unlocks all features'}
                            </p>
                            <div className="flex flex-col gap-2">
                              <input 
                                type="text" 
                                value={trialCode}
                                onChange={(e) => setTrialCode(e.target.value)}
                                placeholder={t.enterKey}
                                className={`w-full ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border-2 px-4 py-3 rounded-sm font-bold focus:outline-none focus:border-emerald-600 transition-colors text-[11px]`}
                              />
                              <button 
                                onClick={handleActivateCode}
                                disabled={isActivating || !trialCode.trim()}
                                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-black uppercase tracking-widest text-[10px] rounded-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                {isActivating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                                {t.activateCode}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] font-bold text-emerald-500/80 italic">
                            Thank you for supporting DigiCap®! All professional features are unlocked.
                          </p>
                        )}
                        
                        {trialFeedback && (
                          <div className={`mt-3 text-[10px] font-bold text-center ${trialFeedback.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {trialFeedback.message}
                          </div>
                        )}
                      </div>

                      <div><label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">{t.languageLabel}</label>
                          <select value={language} onChange={handleLanguageChange} className={`${selectBaseStyle} ${themeMode === 'dark' ? 'bg-slate-800 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-400'}`}>{Object.entries(languageNames).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>
                      </div>
                      <div className="pt-6 border-t-2 border-slate-200 space-y-6">
                         <div>
                            <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">{t.statStandard}</label>
                            <select 
                                value={activeMeasure.limits.standard} 
                                onChange={(e) => handleUpdateLimits({ ...activeMeasure.limits, standard: e.target.value as StandardType })} 
                                className={`${selectBaseStyle} ${themeMode === 'dark' ? 'bg-slate-800 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-400'}`}
                            >
                                <option value="IATF">{t.standardIATF}</option>
                                <option value="VDA">{t.standardVDA}</option>
                                <option value="SEMI">{t.standardSEMI}</option>
                            </select>
                            {standardHelpText && (
                                <div className={`mt-3 p-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : currentTheme.lightBg + ' ' + currentTheme.lightBorder + ' ' + currentTheme.darkText} border-2 text-[12px] leading-relaxed animate-in fade-in slide-in-from-top-1`}>
                                    <ReactMarkdown>{standardHelpText}</ReactMarkdown>
                                </div>
                            )}
                         </div>
                         <div><label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">{t.distModel}</label><select value={activeMeasure.distribution} onChange={(e) => updateActiveMeasure({ distribution: e.target.value as DistributionType })} className={`${selectBaseStyle} ${themeMode === 'dark' ? 'bg-slate-800 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-400'}`}><option value="Normal">{t.distNormal}</option><option value="LogNormal">{t.distLog}</option><option value="Folded">{t.distFolded}</option><option value="Rayleigh">{t.distRayleigh}</option><option value="Weibull">{t.distWeibull}</option></select></div>
                         <div className="pt-2"><label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2 block flex items-center gap-1"><Sigma className="w-4 h-4" /> {t.sigmaLevel}</label><div className="grid grid-cols-4 gap-2">{[2, 3, 4, 6].map(lvl => (<button key={lvl} onClick={() => updateActiveMeasure({ sigmaLevel: lvl })} className={`py-3 text-[12px] font-black border-2 rounded-sm transition-all ${activeMeasure.sigmaLevel === lvl ? 'bg-black text-white border-black' : (themeMode === 'dark' ? 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-400' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500')}`}>±{lvl}σ</button>))}</div></div>
                      </div>
                      <div className="pt-6 border-t-2 border-slate-200 space-y-3">
                          <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-3 block">{t.helpAndGuides}</label>
                          <button onClick={() => setShowStudyGuide(true)} className={`w-full flex items-center justify-between p-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'} border-2 font-bold text-sm uppercase tracking-wide text-left transition-all`}><span className="flex items-center gap-2"><Book className={`w-5 h-5 ${currentTheme.icon}`} /> {t.guideTitle}</span><ChevronDown className="w-5 h-5 -rotate-90 text-slate-400" /></button>
                          <button onClick={() => setShowFormulaGuide(true)} className={`w-full flex items-center justify-between p-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'} border-2 font-bold text-sm uppercase tracking-wide text-left transition-all`}><span className="flex items-center gap-2"><Calculator className="w-5 h-5 text-emerald-600" /> {t.formulaGuideTitle}</span><ChevronDown className="w-5 h-5 -rotate-90 text-slate-400" /></button>
                          <button onClick={() => setShowDistGuide(true)} className={`w-full flex items-center justify-between p-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'} border-2 font-bold text-sm uppercase tracking-wide text-left transition-all`}><span className="flex items-center gap-2"><BarChart className="w-5 h-5 text-violet-600" /> {t.distGuideTitle}</span><ChevronDown className="w-5 h-5 -rotate-90 text-slate-400" /></button>
                          <button onClick={() => setShowGlossary(true)} className={`w-full flex items-center justify-between p-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'} border-2 font-bold text-sm uppercase tracking-wide text-left transition-all`}><span className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-600" /> {t.glossaryTitle}</span><ChevronDown className="w-5 h-5 -rotate-90 text-slate-400" /></button>
                          <button onClick={() => setShowTraining(true)} className={`w-full flex items-center justify-between p-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'} border-2 font-bold text-sm uppercase tracking-wide text-left transition-all`}><span className="flex items-center gap-2"><Book className={`w-5 h-5 ${currentTheme.icon}`} /> {t.trainingTitle}</span><ChevronDown className="w-5 h-5 -rotate-90 text-slate-400" /></button>
                          <button 
                            onClick={() => { setShowSettings(false); setShowGame(true); }} 
                            className="w-full flex items-center justify-between p-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-widest rounded-sm transition-all shadow-lg shadow-blue-900/20"
                          >
                            <span className="flex items-center gap-2">
                              <Target className="w-5 h-5" /> 
                              {t.playHitTheMean}
                            </span>
                            <ChevronDown className="w-5 h-5 -rotate-90 text-white/50" />
                          </button>
                      </div>
                      <div className="pt-6 border-t-2 border-slate-200">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-3 block flex items-center gap-1"><Monitor className="w-4 h-4" /> {t.themeModeLabel}</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => handleThemeModeChange('light')} 
                            className={`py-3 text-[11px] font-black border-2 rounded-sm transition-all flex items-center justify-center gap-2 ${themeMode === 'light' ? 'bg-black text-white border-black' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}
                          >
                            <div className="w-3 h-3 bg-white border border-slate-300 rounded-full" /> {t.lightMode}
                          </button>
                          <button 
                            onClick={() => handleThemeModeChange('dark')} 
                            className={`py-3 text-[11px] font-black border-2 rounded-sm transition-all flex items-center justify-center gap-2 ${themeMode === 'dark' ? 'bg-slate-100 text-black border-slate-100' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600'}`}
                          >
                            <div className="w-3 h-3 bg-slate-950 border border-slate-700 rounded-full" /> {t.darkMode}
                          </button>
                        </div>
                      </div>
                      <div className="pt-6 border-t-2 border-slate-200">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-3 block flex items-center gap-1"><Palette className="w-4 h-4" /> {t.themeTitle}</label>
                        <div className="grid grid-cols-4 gap-2">
                          {(Object.keys(themeColors) as AppColor[]).map((color) => (
                            <button 
                              key={color} 
                              onClick={() => handleColorChange(color)} 
                              className={`h-10 rounded-sm border-2 transition-all ${appColor === color ? (themeMode === 'dark' ? 'border-white ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'border-black ring-2 ring-black ring-offset-2') : 'border-transparent hover:scale-105'}`}
                              style={{ backgroundColor: themeColors[color].hex }}
                              title={themeColors[color].name}
                            />
                          ))}
                        </div>
                      </div>
                      {/* Lemon Squeezy UI */}
                      {!trialData.isForever && (
                        <div className="pt-6 border-t-2 border-slate-200 space-y-4">
                          {trialData.unlocked > 0 && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm">
                              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                                {t.trialActive || 'Temporary Unlock Active'}
                              </p>
                              <p className="text-[9px] text-amber-600 font-medium mt-1">
                                {trialData.count} / {totalAllowedTrials} {t.studiesCompleted || 'studies completed'}
                              </p>
                            </div>
                          )}
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 text-center bg-slate-100 dark:bg-slate-800 py-3 rounded-sm">
                            {t.purchaseViaInfo || 'Purchase license via the Info (i) menu'}
                          </p>
                          
                          <div className="relative">
                            <input 
                              type="text" 
                              value={trialCode}
                              onChange={(e) => {
                                setTrialCode(e.target.value);
                                if (trialFeedback) setTrialFeedback(null);
                              }}
                              placeholder={t.enterKey}
                              className={`w-full ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border-2 px-4 py-3 rounded-sm font-bold focus:outline-none focus:border-emerald-600 transition-colors text-[11px]`}
                            />
                            <button 
                              onClick={handleActivateCode}
                              disabled={isActivating || !trialCode.trim()}
                              className={`mt-2 w-full py-3 ${themeMode === 'dark' ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'} font-black uppercase tracking-widest text-[9px] rounded-sm transition-all flex items-center justify-center gap-2 ${isActivating ? 'opacity-50' : ''}`}
                            >
                              {isActivating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                              {t.activateCode}
                            </button>
                            {trialFeedback && (
                              <div className={`mt-2 text-[10px] font-bold text-center ${trialFeedback.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                                {trialFeedback.message}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                  <div className={`p-6 border-t-2 ${themeMode === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-300 bg-slate-200'}`}><button onClick={() => setShowSettings(false)} className={`w-full py-3.5 ${themeMode === 'dark' ? 'bg-white text-black' : 'bg-black text-white'} font-bold text-sm uppercase tracking-wider transition-colors`}>{t.close}</button></div>
              </div>
          </div>
      )}
            {(showStudyGuide || showFormulaGuide || showDistGuide || showGlossary || showTraining) && (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4" onClick={() => {setShowStudyGuide(false); setShowFormulaGuide(false); setShowDistGuide(false); setShowGlossary(false); setShowTraining(false);}}>
           <div className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-black'} border-4 max-lg w-full max-h-[85vh] flex flex-col overflow-hidden`} onClick={(e) => e.stopPropagation()}>
              <div className={`p-5 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'} border-b-2 flex justify-between items-center shrink-0`}>
                 <h3 className={`font-bold text-sm uppercase tracking-widest ${themeMode === 'dark' ? 'text-slate-100' : 'text-black'}`}>
                   {showStudyGuide ? t.guideTitle : showFormulaGuide ? t.formulaGuideTitle : showDistGuide ? t.distGuideTitle : showTraining ? t.trainingTitle : t.glossaryTitle}
                 </h3>
                 <button onClick={() => {setShowStudyGuide(false); setShowFormulaGuide(false); setShowDistGuide(false); setShowGlossary(false); setShowTraining(false);}} className="p-1"><X className={`w-6 h-6 ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-900'}`}/></button>
              </div>
              <div className={`p-8 overflow-y-auto custom-scrollbar prose prose-sm ${themeMode === 'dark' ? 'prose-invert' : 'prose-slate'} max-w-none`}>
                <ReactMarkdown>
                  {showStudyGuide ? t.guideIntro + '\n\n' + '---' + '\n\n' + '#### ' + t.cmTitle + '\n' + t.cmDesc + '\n\n' + '#### ' + t.ppTitle + '\n' + t.ppDesc + '\n\n' + '#### ' + t.cpTitle + '\n' + t.cpDesc 
                  : showFormulaGuide ? t.formulaGuideIntro 
                  : showDistGuide ? t.distGuideContent
                  : showTraining ? t.glossaryTraining
                  : t.glossarySPC + '\n\n' + t.glossaryCpk + '\n\n' + t.glossaryPpk + '\n\n' + t.glossaryCmk + '\n\n' + t.glossarySigma + '\n\n' + t.glossaryNormalDist + '\n\n' + t.glossaryUsEu + '\n\n' + t.glossaryPotentialActual}
                </ReactMarkdown>
              </div>
              <div className={`p-5 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'} border-t-2 shrink-0`}>
                 <button onClick={() => {setShowStudyGuide(false); setShowFormulaGuide(false); setShowDistGuide(false); setShowGlossary(false); setShowTraining(false);}} className={`w-full py-3 ${themeMode === 'dark' ? 'bg-white text-black' : 'bg-black text-white'} font-bold text-sm uppercase tracking-widest transition-colors`}>{t.okBtn}</button>
              </div>
           </div>
        </div>
      )}

      {/* Modals */}

      {showAbout && (
          <div className="fixed inset-0 z-[500] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowAbout(false)}>
              <div className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-black'} border-4 max-w-sm md:max-w-lg w-full shadow-2xl overflow-hidden flex flex-col transition-all`} onClick={(e) => e.stopPropagation()}>
                  <div className={`px-5 py-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'} border-b-2 flex justify-between items-center`}><div className="flex items-center gap-2"><Info className={`w-5 h-5 ${currentTheme.icon}`} /> <h3 className={`font-bold text-sm uppercase tracking-widest ${themeMode === 'dark' ? 'text-slate-100' : 'text-black'}`}>{t.aboutTitle}</h3></div><button onClick={() => setShowAbout(false)}><X className="w-6 h-6 text-slate-500" /></button></div>
                  <div className="p-8 space-y-8 overflow-y-auto max-h-[75vh] custom-scrollbar">
                      <div className="flex flex-col items-center text-center">
                        <h2 className={`text-3xl font-black uppercase tracking-tighter ${themeMode === 'dark' ? 'text-white' : 'text-slate-900'} mb-0`}>DIGICAP<span className="text-[9px] font-bold text-slate-400 ml-0.5 mt-[-12px] align-top select-none">®</span> {t.professional}</h2>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.25em] mt-[-3px] mb-2">{t.appSubtitle}</p>
                        
                        <div className={`mt-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${trialData.isForever ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                          {trialData.isForever ? <ShieldCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {trialData.isForever ? t.approved || 'Professional License' : `${t.trial || 'Trial'} (${trialData.count}/${totalAllowedTrials})`}
                        </div>
                      </div>

                      {/* License Section */}
                      <div className={`p-6 border-2 rounded-sm space-y-4 ${trialData.isForever ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-amber-500/5 border-amber-500/10'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className={`w-5 h-5 ${trialData.isForever ? 'text-emerald-500' : 'text-amber-500'}`} />
                            <h4 className={`font-black uppercase tracking-widest text-[11px] ${themeMode === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {trialData.isForever ? 'DIGICAP® PROFESSIONAL' : 'DIGICAP® TRIAL'}
                            </h4>
                          </div>
                          {trialData.isForever && (
                            <span className="px-2 py-1 bg-emerald-500 text-white text-[9px] font-black rounded-full uppercase tracking-tighter shadow-sm">Active</span>
                          )}
                        </div>
                        
                        {!trialData.isForever ? (
                          <div className="space-y-4">
                            <p className="text-[11px] font-bold text-slate-500 leading-relaxed uppercase tracking-wide">
                              {t.reachedLimitDesc}
                            </p>
                            
                            <a 
                              href={EXTERNAL_LINKS.LEMON_SQUEEZY_CHECKOUT}
                              onClick={handleOpenCheckout}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`w-full py-4 ${themeMode === 'dark' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-700 hover:bg-emerald-800'} text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-sm transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 no-underline group`}
                            >
                              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                              {t.subscribeNow || 'Get PRO License'}
                            </a>

                            <div className="pt-2">
                               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">Already have a key?</p>
                               <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  value={trialCode}
                                  onChange={(e) => {
                                    setTrialCode(e.target.value);
                                    if (trialFeedback) setTrialFeedback(null);
                                  }}
                                  placeholder={t.enterKey}
                                  className={`flex-1 ${themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} border-2 px-4 py-3 rounded-sm font-bold focus:outline-none focus:border-emerald-600 transition-colors text-[11px]`}
                                />
                                <button 
                                  onClick={handleActivateCode}
                                  disabled={isActivating || !trialCode.trim()}
                                  className={`px-6 py-3 ${themeMode === 'dark' ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-900 text-white hover:bg-slate-800'} font-black uppercase tracking-widest text-[9px] rounded-sm transition-all flex items-center justify-center gap-2 ${isActivating ? 'opacity-50' : ''}`}
                                >
                                  {isActivating ? <Loader2 className="w-4 h-4 animate-spin" /> : t.activateCode}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-sm">
                            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1 italic">
                              Professional License Verified
                            </p>
                            <p className="text-[10px] text-emerald-600/70 font-medium">
                              All features unlocked for this device.
                            </p>
                          </div>
                        )}
                        
                        {trialFeedback && (
                          <div className={`mt-2 text-[10px] font-bold ${trialFeedback.type === 'success' ? 'text-emerald-500' : 'text-red-500'} animate-in fade-in zoom-in-95`}>
                            {trialFeedback.message}
                          </div>
                        )}
                      </div>

                      <div className={`space-y-6 pt-2`}>
                          <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">{t.systemDev}</label><p className={`text-xs font-bold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>{t.companyName}</p></div>
                             <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">{t.techSupport}</label>
                              <a href={`mailto:${t.contactEmail}`} className={`text-xs font-black ${themeMode === 'dark' ? 'text-white' : currentTheme.text} flex items-center gap-2 hover:underline`}><Mail className="w-3 h-3" /> {t.contactEmail}</a>
                            </div>
                          </div>
                      </div>

                      <div className={`grid grid-cols-2 gap-3 pt-6 border-t-2 ${themeMode === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                          <button onClick={() => setShowTerms(true)} className={`px-2 py-3 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'} border-2 text-[10px] font-black uppercase tracking-widest transition-all`}>{t.termsTitle}</button>
                          <button onClick={() => setShowPrivacy(true)} className={`px-2 py-3 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'} border-2 text-[10px] font-black uppercase tracking-widest transition-all`}>{t.privacyTitle}</button>
                      </div>

                      <div className="pt-2">
                        <button 
                          onClick={() => { setShowAdminPanel(true); setShowAbout(false); }} 
                          className={`w-full py-3 ${themeMode === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} text-[8px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2`}
                        >
                          <ShieldCheck className="w-3 h-3" /> Admin Area
                        </button>
                      </div>
                  </div>
                  <div className={`p-6 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300'} border-t-2`}><button onClick={() => setShowAbout(false)} className={`w-full py-3.5 ${themeMode === 'dark' ? 'bg-white text-black' : 'bg-black text-white'} font-black text-[12px] uppercase tracking-[0.2em]`}>{t.close}</button></div>
              </div>
          </div>
      )}

      {(showTerms || showPrivacy) && (
          <div className="fixed inset-0 z-[600] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => { setShowTerms(false); setShowPrivacy(false); }}>
              <div className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-black'} border-4 max-lg w-full shadow-2xl flex flex-col max-h-[90vh]`} onClick={(e) => e.stopPropagation()}>
                  <div className={`px-5 py-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'} border-b-2 flex justify-between items-center shrink-0`}><h3 className={`font-bold text-sm uppercase tracking-widest ${themeMode === 'dark' ? 'text-slate-100' : 'text-black'}`}>{showTerms ? t.termsTitle : t.privacyTitle}</h3><button onClick={() => { setShowTerms(false); setShowPrivacy(false); }}><X className="w-6 h-6 text-slate-500" /></button></div>
                  <div className={`p-8 overflow-y-auto text-sm leading-relaxed prose max-w-none ${themeMode === 'dark' ? 'prose-invert' : 'prose-slate'}`}>
                    <div className="space-y-6">
                        <ReactMarkdown>{showTerms ? t.termsFull : t.privacyFull}</ReactMarkdown>
                    </div>
                  </div>
                  <div className={`p-6 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border-t-2 shrink-0`}><button onClick={() => { setShowTerms(false); setShowPrivacy(false); }} className={`w-full py-3 ${themeMode === 'dark' ? 'bg-white text-black' : 'bg-black text-white'} font-black text-[12px] uppercase tracking-widest`}>{t.okBtn}</button></div>
              </div>
          </div>
      )}

      {showAdminPanel && (
        <div className="fixed inset-0 z-[700] bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-4 border-slate-800 w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-800 border-b-2 border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-sm uppercase tracking-widest text-white">Admin Panel</h3>
              </div>
              <button onClick={() => { setShowAdminPanel(false); setIsAdminAuthenticated(false); setAdminPasswordInput(''); }} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {!isAdminAuthenticated ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
                <div className="text-center space-y-2">
                  <h4 className="text-white font-black uppercase tracking-widest text-lg">Restricted Area</h4>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Enter access code to continue</p>
                </div>
                <input 
                  type="password" 
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  placeholder="••••"
                  className="bg-slate-950 border-2 border-slate-800 text-white text-center text-2xl font-black tracking-[0.5em] py-4 w-48 focus:border-blue-500 outline-none transition-all"
                />
                <button 
                  onClick={handleAdminLogin}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[0.2em] px-8 py-4 transition-all active:scale-95"
                >
                  Authorize
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recent Webhook Events</span>
                  <button onClick={fetchWebhookLogs} disabled={isLoadingLogs} className="text-blue-500 hover:text-blue-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {webhookLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                      <WifiOff className="w-8 h-8 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No logs found</p>
                    </div>
                  ) : (
                    webhookLogs.slice().reverse().map((log, i) => (
                      <div key={i} className="bg-slate-950 border border-slate-800 p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="bg-blue-900/30 text-blue-400 text-[9px] font-black px-2 py-0.5 uppercase tracking-widest rounded-full border border-blue-800/50">
                            {log.event}
                          </span>
                          <span className="text-slate-600 text-[9px] font-mono">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900">
                          <div>
                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Email</label>
                            <span className="text-xs text-slate-300 font-bold">{log.data.user_email || 'N/A'}</span>
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">License Key</label>
                            <span className="text-xs text-blue-400 font-mono font-bold">{log.data.key || 'N/A'}</span>
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Status</label>
                            <span className="text-xs text-slate-300 font-bold uppercase">{log.data.status || 'N/A'}</span>
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Order ID</label>
                            <span className="text-xs text-slate-300 font-bold">#{log.data.order_id || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showResumeModal && (
        <div className="fixed inset-0 z-[250] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowResumeModal(false)}>
          <div className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-black'} border-4 max-w-md w-full flex flex-col max-h-[80vh]`} onClick={(e) => e.stopPropagation()}>
            <div className={`p-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'} border-b-2 flex justify-between items-center`}>
              <h3 className={`font-bold text-sm uppercase tracking-widest ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>{t.restore}</h3>
              <button onClick={() => setShowResumeModal(false)}><X className="w-6 h-6 text-slate-500" /></button>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar space-y-2">
              {recentStudies.map((study) => (
                <button 
                  key={study.id} 
                  onClick={() => handleResumeStudy(study)}
                  className={`w-full p-4 text-left border-2 transition-all flex flex-col gap-1 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 hover:border-slate-500' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`font-black text-[12px] uppercase tracking-wider ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                      {study.studyInfo.partNumber || t.notSpecified}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">
                      {new Date(study.timestamp).toLocaleString(language === 'sv' ? 'sv-SE' : 'en-GB')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {study.studyInfo.machineNumber || t.notSpecified}
                    </span>
                    <span className={`text-[10px] font-black ${currentTheme.text}`}>
                      {study.measures.reduce((acc: number, m: any) => acc + m.data.length, 0)} {t.count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className={`p-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300'} border-t-2`}>
              <button onClick={() => setShowResumeModal(false)} className={`w-full py-3 ${themeMode === 'dark' ? 'bg-white text-black' : 'bg-black text-white'} font-bold text-sm uppercase tracking-widest`}>{t.close}</button>
            </div>
          </div>
        </div>
      )}

      {showNewStudyConfirm && (
        <div className="fixed inset-0 z-[250] bg-black/80 flex items-center justify-center p-4">
          <div className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-black'} p-8 border-4 max-w-xs w-full text-center`}>
            <AlertTriangle className={`w-12 h-12 ${currentTheme.text} mx-auto mb-4`} />
            <h3 className={`font-bold ${themeMode === 'dark' ? 'text-white' : 'text-black'} mb-3 uppercase tracking-widest text-base`}>{t.newStudy}</h3>
            <p className={`${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'} text-sm mb-8 leading-relaxed`}>{t.newStudyConfirm}</p>
            <div className="grid grid-cols-2 gap-4"><button onClick={() => setShowNewStudyConfirm(false)} className={`px-4 py-3 ${themeMode === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-900'} font-bold uppercase text-[12px] tracking-widest`}>{t.cancel}</button><button onClick={handleNewStudy} className={`px-4 py-3 ${colors.newStudy} font-bold text-white uppercase text-[12px] tracking-widest`}>{t.okBtn}</button></div>
          </div>
        </div>
      )}

      {showOverlayModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowOverlayModal(false)}>
          <div className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-black'} border-4 max-md w-full overflow-hidden flex flex-col`} onClick={(e) => e.stopPropagation()}>
             <div className="px-5 py-4 bg-violet-700 text-white flex justify-between items-center"><h3 className="font-bold text-sm uppercase tracking-wider">{t.selectOverlay}</h3><button onClick={() => setShowOverlayModal(false)}><X className="w-6 h-6" /></button></div>
             <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {compatibleMeasures.length > 0 ? compatibleMeasures.map(m => (
                    <button key={m.id} onClick={() => toggleOverlayMeasure(m.id)} className={`w-full flex items-center justify-between p-4 border-2 transition-all ${overlayMeasureIds.includes(m.id) ? 'bg-violet-900/30 border-violet-500' : (themeMode === 'dark' ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-100 hover:border-slate-300')}`}>
                        <span className={`text-[12px] font-black uppercase tracking-widest ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>{m.name}</span>
                        {overlayMeasureIds.includes(m.id) ? <CheckCircle className="w-6 h-6 text-violet-600" /> : <Circle className={`w-6 h-6 ${themeMode === 'dark' ? 'text-slate-700' : 'text-slate-200'}`} />}
                    </button>
                )) : <p className="text-sm text-slate-500 italic text-center py-8">{t.noMatchingMeasures}</p>}
             </div>
             <div className={`p-6 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300'} border-t-2 flex gap-3`}><button onClick={() => setShowOverlayModal(false)} className={`flex-1 py-3 ${themeMode === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-300 text-slate-700'} font-bold text-sm uppercase`}>{t.cancel}</button><button onClick={() => { setShowOverlayModal(false); setShowOverlayReport(true); }} disabled={overlayMeasureIds.length < 2} className="flex-1 py-3 bg-violet-700 text-white font-bold text-sm uppercase">{t.runAnalysis}</button></div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] animate-in slide-in-from-bottom-4 duration-300">
          <div className={`px-6 py-3 rounded-full shadow-2xl border-2 flex items-center gap-3 ${
            toast.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-400' 
              : 'bg-rose-950/90 border-rose-500 text-rose-400'
          } backdrop-blur-md`}>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="font-bold text-sm uppercase tracking-wider">{toast.message}</span>
          </div>
        </div>
      )}

      {showGame && !isTeaserMode && (
        <Suspense fallback={null}>
          <HitTheMeanGame 
            language={language} 
            onClose={() => setShowGame(false)} 
            isTeaserMode={isTeaserMode}
          />
        </Suspense>
      )}
    </div>
      )}
    </>
  );
};

export default App;
