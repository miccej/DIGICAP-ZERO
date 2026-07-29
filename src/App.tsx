
import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from 'react'; // Build Version: 2026-03-13-v1
import { motion, AnimatePresence } from 'motion/react';
console.log("DIGICAP App Loading...");
import { 
  Menu, X, Globe, Plus, FolderOpen, Save, FileSpreadsheet, Monitor, Play, CheckCircle2, RotateCcw as RotateCcwIcon, FileText,
  AlertTriangle, Bug, CheckCircle, Clock, DownloadCloud, Download, WifiOff, Circle, PlayCircle, Info, Settings, Gauge, Book, BarChart, Calculator, ChevronDown, BookOpen, Target, HelpCircle, ShieldCheck, Scale, Mail, Sigma, FileDown, Palette, Layers, Maximize, ExternalLink, Loader2, Users, RefreshCw, LayoutDashboard, Sparkles, LogIn, Key
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
const HitTheMeanGame = lazy(() => import('./components/HitTheMeanGame'));
import { APP_IDENTITY, EXTERNAL_LINKS, APP_LIMITS } from './config';
import { auth, ensureAuthenticated, loginWithGoogle, db } from './firebase';
import { getUserAccess, initializeUserAccess, redeemCode, UserAccessData, decrementTrial, checkLicenseByEmail, verifyLicense, logUserActivity } from './firebaseService';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Resilient localized localStorage wrapper to bypass strict cross-origin iframe storage blocks
const getSafeLocalStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch (e) {
    console.warn("[STORAGE] localStorage access is restricted in this context:", e);
  }
  return null;
};

const safeStorageInstance = getSafeLocalStorage();

const localStorage = {
  getItem: (key: string): string | null => {
    try {
      return safeStorageInstance ? safeStorageInstance.getItem(key) : null;
    } catch (e) {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (safeStorageInstance) {
        safeStorageInstance.setItem(key, value);
      }
    } catch (e) {}
  },
  removeItem: (key: string): void => {
    try {
      if (safeStorageInstance) {
        safeStorageInstance.removeItem(key);
      }
    } catch (e) {}
  },
  get length(): number {
    try {
      return safeStorageInstance ? safeStorageInstance.length : 0;
    } catch (e) {
      return 0;
    }
  },
  key: (index: number): string | null => {
    try {
      return safeStorageInstance ? safeStorageInstance.key(index) : null;
    } catch (e) {
      return null;
    }
  },
  clear: (): void => {
    try {
      if (safeStorageInstance) {
        safeStorageInstance.clear();
      }
    } catch (e) {}
  }
};

const uuidv4 = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const getCountryFlagAndName = (countryCode?: string | null, countryName?: string | null): string => {
  if (!countryCode) return '';
  const code = countryCode.toUpperCase();
  try {
    const flag = code.replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
    return `${countryName || code} ${flag}`;
  } catch {
    return countryName || code;
  }
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
      stroke="#d97706"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="drop-shadow-sm"
    />
  </svg>
);

const LandingPage: React.FC<{ 
  onStart: () => void; 
  onDemo: () => void; 
  onLogin: () => void; 
  onLicenseLogin: () => void;
  themeColor: any; 
  logoColorClass: string;
  language: Language; 
  onLanguageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; 
  userAccess: UserAccessData | null 
}> = ({ onStart, onDemo, onLogin, onLicenseLogin, themeColor, logoColorClass, language, onLanguageChange, userAccess }) => {
  const t = translations[language];
  return (
    <div className="h-full w-full bg-[#081427] flex flex-col relative overflow-hidden">
      
      {/* Background subtle pattern */}
      <div className="absolute inset-0 opacity-[0.1] pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      </div>

      {/* Border Luster - Soft inner border */}
      <div className="absolute inset-0 border border-slate-400/40 pointer-events-none z-50"></div>

      {/* HEADER: LOGO - LOCKED SECTION: DO NOT MODIFY LAYOUT, SPACING OR POSITIONING */}
      <div className="w-full p-6 z-10 flex flex-col items-center shrink-0 mt-2 md:mt-3 translate-y-[16px]">
        <div className="inline-flex flex-col items-start">
          <h1 
            className={`relative text-5xl font-black tracking-[0.02em] ${logoColorClass} leading-none flex items-start`}
            style={{ 
              textShadow: '-0.5px -0.5px 0 rgba(255, 255, 255, 0.45), 0.5px -0.5px 0 rgba(255, 255, 255, 0.45), -0.5px 0.5px 0 rgba(255, 255, 255, 0.45), 0.5px 0.5px 0 rgba(255, 255, 255, 0.45)' 
            }}
          >
            {APP_IDENTITY.name}
            <span className="absolute left-[calc(100%+3px)] top-[2px] text-[14px] font-bold text-slate-300 select-none" style={{ WebkitTextStroke: 'none', textShadow: 'none' }}>®</span>
          </h1>
          <div 
            className="w-full mt-[-5px] uppercase text-slate-400 text-[11.5px] font-semibold flex justify-between select-none"
          >
            {"CAPABILITY ANYWHERE".split("").map((char, idx) => (
              <span key={idx}>
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </div>
        </div>
      </div>
      {/* END LOCKED SECTION */}

      {/* MIDDLE: BUTTONS */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 w-full gap-6">
        <button 
          onClick={onStart}
          className={`px-6 py-5 bg-gradient-to-br from-[#1a365d] to-[#0f172a] text-white font-black text-[11px] uppercase tracking-[0.12em] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)] transition-all active:scale-95 hover:translate-y-[-2px] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] border border-${themeColor.primary}-400/30 rounded-sm overflow-hidden group min-w-[240px] max-w-[90vw] relative`}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <div className="flex flex-col items-center gap-1 whitespace-normal relative z-10">
            <span className="text-center leading-tight">{t.landingStart}</span>
            <div className="text-[8px] opacity-60 tracking-[0.1em] font-bold">
              {t.landingStartSub}
            </div>
          </div>
        </button>
      </div>

      {/* BOTTOM: CURVE */}
      <div className="w-full max-w-[260px] flex flex-col items-center gap-4 z-10 mb-8 mx-auto shrink-0">
        <button 
          onClick={onDemo}
          className="px-10 py-4 bg-slate-800/80 border border-slate-600 text-slate-100 hover:text-white hover:border-slate-400 hover:bg-slate-700 font-bold text-[9px] uppercase tracking-[0.2em] transition-all active:scale-95 rounded-full whitespace-nowrap backdrop-blur-md shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
          {t.landingDemo}
        </button>

        <div className="w-full opacity-60">
          <NormalCurve color={themeColor.hex} />
        </div>
          <div className="flex flex-col items-center gap-4">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] opacity-80">
              {t.landingStandards}
            </p>
            
            {/* Language Selector */}
            <div className="relative group shrink-0">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Globe className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors" />
              </div>
              <select 
                value={language} 
                onChange={onLanguageChange}
                className="appearance-none bg-slate-900/50 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 text-[10px] font-bold uppercase tracking-[0.2em] py-2 pl-9 pr-10 border border-slate-800 hover:border-slate-700 rounded-full transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-700"
              >
                {Object.entries(languageNames).map(([code, name]) => (
                  <option key={code} value={code} className="bg-slate-900 text-white">{name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <ChevronDown className="w-3 h-3 text-slate-600" />
              </div>
            </div>

            <div className="mt-2 text-[9px] text-slate-600 tracking-[0.2em] font-medium opacity-60 uppercase select-none">
               {t.creditText}
            </div>
          </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    // Suppress Recharts defaultProps deprecation warnings
    const originalError = console.error;
    console.error = (...args: any[]) => {
      if (typeof args[0] === 'string' && args[0].includes('Support for defaultProps will be removed from function components')) {
        return;
      }
      originalError.apply(console, args);
    };
    return () => {
      console.error = originalError;
    };
  }, []);

  const [language, setLanguage] = useState<Language>('en');
  const [spcRule, setSpcRule] = useState<'IATF' | 'AIAG' | 'ISO'>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('digicap_spc_rule') : null;
      if (saved === 'IATF' || saved === 'AIAG' || saved === 'ISO') {
        return saved;
      }
      return 'IATF';
    } catch (e) {
      return 'IATF';
    }
  });

  const handleSpcRuleChange = (newRule: 'IATF' | 'AIAG' | 'ISO') => {
    setSpcRule(newRule);
    try {
      if (typeof window !== 'undefined') localStorage.setItem('digicap_spc_rule', newRule);
    } catch (e) {}
  };

  const [theme] = useState<AppTheme>('sharp');
  const t = translations[language];

  type AppColor = 'navy' | 'orange' | 'red' | 'green' | 'blue' | 'violet';
  const [appColor, setAppColor] = useState<AppColor>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('digicap_color') : null;
      if (!saved || saved === 'violet') {
        // Automatically migrate users to the beautiful new default navy theme
        if (typeof window !== 'undefined') {
          localStorage.setItem('digicap_color', 'navy');
        }
        return 'navy';
      }
      return (saved as AppColor);
    } catch (e) {
      return 'navy';
    }
  });

  const themeMode = 'dark';

  const [showLanding, setShowLanding] = useState(true);

  const [studyKey, setStudyKey] = useState<number>(Date.now());
  const [showExportExcelModal, setShowExportExcelModal] = useState(false);
  const [exportSelectedMeasureIds, setExportSelectedMeasureIds] = useState<string[]>([]);

  const handleColorChange = (color: AppColor) => {
    setAppColor(color);
    try { localStorage.setItem('digicap_color', color); } catch (e) {}
  };


  const themeColors = {
    navy: {
      name: t.colorNavy,
      primary: 'indigo',
      logo: 'text-white',
      newStudy: 'bg-[#081427] hover:bg-[#0c1e3a]',
      activeTab: 'bg-[#081427] border-[#081427]',
      border: 'border-[#081427]',
      text: 'text-white',
      icon: 'text-white',
      hex: '#081427',
      stroke: '#081427',
      lightBg: 'bg-slate-900',
      lightBorder: 'border-slate-800/60',
      darkText: 'text-white'
    },
    violet: {
      name: t.colorViolet,
      primary: 'violet',
      logo: 'text-violet-500',
      newStudy: 'bg-violet-600 hover:bg-violet-700',
      activeTab: 'bg-violet-600 border-violet-600',
      border: 'border-violet-500',
      text: 'text-violet-500',
      icon: 'text-violet-600',
      hex: '#7c3aed',
      stroke: '#5b21b6',
      lightBg: 'bg-violet-50',
      lightBorder: 'border-violet-100',
      darkText: 'text-violet-900'
    },
    orange: {
      name: t.colorOrange,
      primary: 'amber',
      logo: 'text-amber-500',
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
      logo: 'text-red-600',
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
      logo: 'text-emerald-600',
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
      logo: 'text-blue-500',
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

  const logoTheme = themeColors[appColor] || themeColors.navy;
  const currentTheme = themeColors.navy;

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

  const [userAccess, setUserAccess] = useState<UserAccessData | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isFreeUnlocked, setIsFreeUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('digicap_free_unlocked') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [showFreeCodeModal, setShowFreeCodeModal] = useState(false);
  const [freePasswordInput, setFreePasswordInput] = useState('');
  const [freePasswordError, setFreePasswordError] = useState<string | null>(null);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showLicenseLogin, setShowLicenseLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginOrderId, setLoginOrderId] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await ensureAuthenticated();
      } catch (authError) {
        console.warn("Could not ensure authenticated state on startup:", authError);
      }
      
      // Check for APPTEST Bypass
      try {
        const localExpiry = localStorage.getItem('apptest_bypass_expiry');
        if (localExpiry && Number(localExpiry) > Date.now()) {
          console.log("[APPTEST] Active local bypass found.");
          setUserAccess({
            isForever: true,
            trialRemaining: 999,
            redeemedCodes: [],
            updatedAt: new Date().toISOString()
          });
          setAppTestBypassActive(true);
          return;
        }

        // Verify IP-based bypass in cloud Firestore
        const res = await fetch('https://api.ipify.org?format=json');
        if (res.ok) {
          const data = await res.json();
          const ip = data.ip;
          if (ip) {
            const docId = ip.replace(/\./g, '_');
            const ipDoc = await getDoc(doc(db, 'apptest_ips', docId));
            if (ipDoc.exists()) {
              const docData = ipDoc.data();
              if (docData && docData.expiresAt > Date.now()) {
                console.log("[APPTEST] Cloud IP-based bypass authorized.");
                localStorage.setItem('apptest_bypass_expiry', String(docData.expiresAt));
                localStorage.setItem('apptest_bypass_ip', ip);
                setUserAccess({
                  isForever: true,
                  trialRemaining: 999,
                  redeemedCodes: [],
                  updatedAt: new Date().toISOString()
                });
                setAppTestBypassActive(true);
                return;
              }
            }
          }
        }
      } catch (err) {
        console.log("No cloud IP bypass active:", err);
      }

      // Check for locally saved license link (Corporate/Apple users)
      const savedLicenseEmail = localStorage.getItem('digicap_active_license');
      if (savedLicenseEmail && !userAccess) {
        // Secure check: Verify the license email against Firestore before granting access
        const isValid = await checkLicenseByEmail(savedLicenseEmail);
        if (isValid) {
          setUserAccess({
            isForever: true,
            trialRemaining: 999,
            redeemedCodes: [],
            updatedAt: new Date().toISOString()
          });
        } else {
          console.warn("[SECURITY] Saved license email is invalid, removing from storage:", savedLicenseEmail);
          try {
            localStorage.removeItem('digicap_active_license');
          } catch (e) {}
        }
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let access = await getUserAccess(user.uid);
        if (!access) {
          access = await initializeUserAccess(user.uid);
        }
        
        // Automatic License Check
        if (!access.isForever && user.email) {
          const hasActiveLicense = await checkLicenseByEmail(user.email);
          if (hasActiveLicense) {
            console.log("Active license detected for user:", user.email);
            // We could update the user_access doc here or just update the local state
            // Let's at least update the state for now.
            access = { ...access, isForever: true };
          }
        }
        
        setUserAccess(access);
      } else {
        setUserAccess(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      getUserAccess(userId).then((data) => {
        console.log("License status:", data);
      });
    }
  }, []);

  const [showAbout, setShowAbout] = useState(false);

  // Free Trial (3 tests) states
  const [freeTrialCount, setFreeTrialCount] = useState<number>(() => {
    try {
      const val = localStorage.getItem('digicap_free_trial_count');
      return val ? Number(val) : 0;
    } catch {
      return 0;
    }
  });
  const [showLastFreeTrialWarningModal, setShowLastFreeTrialWarningModal] = useState(false);
  
  // APPTEST access states
  const [showAppTestModal, setShowAppTestModal] = useState(false);
  const [appTestPassword, setAppTestPassword] = useState('');
  const [appTestError, setAppTestError] = useState('');
  const [isVerifyingAppTest, setIsVerifyingAppTest] = useState(false);
  const [appTestBypassActive, setAppTestBypassActive] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [activeLicenses, setActiveLicenses] = useState<any[]>([]);
  const [userActivities, setUserActivities] = useState<any[]>([]);
  const [adminSearch, setAdminSearch] = useState('');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [adminTab, setAdminTab] = useState<'logs' | 'licenses' | 'activity' | 'logos'>('licenses');
  const [masterMode, setMasterMode] = useState(false);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [masterModeCount, setMasterModeCount] = useState(0);

  const getCurrentUserEmail = useCallback(() => {
    if (auth.currentUser?.email) return auth.currentUser.email;
    const saved = localStorage.getItem('digicap_active_license');
    if (saved) return saved.trim();
    if (auth.currentUser?.uid) return `uid_${auth.currentUser.uid}`;
    return 'anonymous_user';
  }, []);

  const logTelemetry = useCallback((action: string, details?: any) => {
    const email = getCurrentUserEmail();
    if (email && email !== 'anonymous_user') {
      logUserActivity(email, action, details);
    }
  }, [getCurrentUserEmail]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const email = getCurrentUserEmail();
      if (email && email !== 'anonymous_user') {
        logTelemetry('App Opened', { screen_width: window.innerWidth, user_agent: navigator.userAgent });
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [getCurrentUserEmail, logTelemetry]);

  useEffect(() => {
    if (masterModeCount >= 5) {
      setMasterMode(true);
      setToast({ message: "Master Systems Engaged", type: 'success' });
      setMasterModeCount(0);
    }
  }, [masterModeCount]);

  const handleAdminTrigger = () => {
    setAdminClickCount(prev => prev + 1);
    if (adminClickCount >= 4) {
      setShowAdminPanel(true);
      setShowAbout(false);
      setAdminClickCount(0);
    }
  };

  const isMasterUser = useMemo(() => {
    if (masterMode) return true;
    const email = auth.currentUser?.email?.toLowerCase();
    const masterEmails = ['mikael.rj.johansson@gmail.com', 'mikaelj@digicap.app'];
    return email ? masterEmails.includes(email) : false;
  }, [auth.currentUser, masterMode]);

  const fetchWebhookLogs = async () => {
    setIsLoadingLogs(true);
    setAdminError(null);
    try {
      const baseUrl = Capacitor.isNativePlatform() ? EXTERNAL_LINKS.API_BASE_URL : '';
      const response = await fetch(`${baseUrl}/api/webhook-logs`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setWebhookLogs(data.logs || []);
      setActiveLicenses(data.licenses || []);
      setUserActivities(data.activities || []);
    } catch (error: any) {
      console.error("Failed to fetch logs:", error);
      setAdminError(`Database error: ${error.message}`);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated && showAdminPanel) {
      fetchWebhookLogs();
    }
  }, [isAdminAuthenticated, showAdminPanel]);

  const handleFreeLogin = () => {
    const trimmedInput = freePasswordInput.trim().toLowerCase();
    if (trimmedInput === 'qualitas') {
      setIsFreeUnlocked(true);
      try {
        localStorage.setItem('digicap_free_unlocked', 'true');
      } catch (e) {}
      setFreePasswordError(null);
      setFreePasswordInput('');
      setShowFreeCodeModal(false);
      setToast({
        message: language === 'sv' ? "Fritt läge aktiverat! Full tillgång beviljad." : "Free mode activated! Full access granted.",
        type: 'success'
      });
    } else {
      setFreePasswordError(language === 'sv' ? "Felaktig kod" : "Invalid access code");
    }
  };

  const handleAdminLogin = async () => {
    const trimmedInput = adminPasswordInput.trim();
    console.log('Attempting admin login...');
    
    if (trimmedInput === '1731' || isMasterUser) {
      setIsAdminAuthenticated(true);
      setAdminError(null);
      // fetchWebhookLogs will be triggered by useEffect
    } else if (trimmedInput === '9911') {
      setIsAdminAuthenticated(true);
      setMasterMode(true);
      setAdminError(null);
    } else {
      console.log('Admin login failed: Invalid password');
      setAdminError(t.trialInvalidCode || "Invalid password");
    }
  };

  const handleMasterAuthorize = () => {
    // Grant full access
    setMasterMode(true);
    const updatedData = { ...trialData, isForever: true };
    setTrialData(updatedData);
    try { localStorage.setItem('digicap_trial_data', JSON.stringify(updatedData)); } catch (e) {}
    
    // Also update session state
    setUserAccess(prev => ({
      ...(prev || { trialRemaining: 999, redeemedCodes: [], updatedAt: new Date().toISOString() }),
      isForever: true
    }));
    
    setToast({ message: "Master Access Authorized", type: 'success' });
    setShowAdminPanel(false);
    setShowLanding(false);
    confirmNewStudy();
  };

  const handleVerifyAppTestPassword = async () => {
    const pwd = appTestPassword.trim().toUpperCase();
    if (pwd === 'GOOGLE') {
      setIsVerifyingAppTest(true);
      setAppTestError('');
      try {
        let ip = null;
        try {
          const res = await fetch('https://api.ipify.org?format=json');
          if (res.ok) {
            const data = await res.json();
            ip = data.ip;
          }
        } catch (e) {
          console.error("IP lookup failed inside prompt", e);
        }

        const expiresAt = Date.now() + 21 * 24 * 60 * 60 * 1000;
        localStorage.setItem('apptest_bypass_expiry', String(expiresAt));
        if (ip) {
          localStorage.setItem('apptest_bypass_ip', ip);
          const docId = ip.replace(/\./g, '_');
          try {
            await setDoc(doc(db, 'apptest_ips', docId), {
              ip: ip,
              unlockedAt: new Date().toISOString(),
              expiresAt: expiresAt
            });
          } catch (dbErr) {
            console.warn("Could not save IP to cloud DB, but completing local access flow:", dbErr);
          }
        }

        setUserAccess({
          isForever: true,
          trialRemaining: 999,
          redeemedCodes: [],
          updatedAt: new Date().toISOString()
        });

        setToast({ message: "APPTEST beviljad! Fri tillgång i 14 dagar.", type: 'success' });
        setShowAppTestModal(false);
        setAppTestPassword('');
        setAppTestBypassActive(true);
        
        // Auto-close ChoiceModal/Landing and start app to let them run immediately
        setShowChoiceModal(false);
        setShowLanding(false);
        confirmNewStudy();
      } catch (err) {
        console.error("APPTEST save failed:", err);
        setAppTestError("Kunde inte spara åtkomst, försök igen.");
      } finally {
        setIsVerifyingAppTest(false);
      }
    } else {
      setAppTestError("Fel lösenord. Försök igen.");
    }
  };

  const handleStartFreeTrial = () => {
    if (freeTrialCount >= 3) {
      alert("Dina 3 gratistester är slut! Köp en licens för att göra fler studier.");
      handleOpenCheckout();
      return;
    }

    const newCount = freeTrialCount + 1;
    setFreeTrialCount(newCount);
    localStorage.setItem('digicap_free_trial_count', String(newCount));
    localStorage.setItem('digicap_free_trial_active', 'true');

    if (newCount === 3) {
      setShowLastFreeTrialWarningModal(true);
    } else {
      setToast({ message: `Gratistest ${newCount} av 3 påbörjat.`, type: 'success' });
      setShowChoiceModal(false);
      setShowLanding(false);
      confirmNewStudy();
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setToast({ message: "Signing in...", type: 'success' });
      await loginWithGoogle();
      setToast({ message: "Successfully signed in!", type: 'success' });
      setShowChoiceModal(false);
    } catch (error) {
      console.error("Login failed:", error);
      setToast({ message: "Login failed. Please try again.", type: 'error' });
    }
  };

  const handleLicenseLogin = async () => {
    if (!loginEmail || !loginOrderId) return;
    setIsLoggingIn(true);
    try {
      const success = await verifyLicense(loginEmail, loginOrderId);
      if (success) {
        setToast({ message: "License verified successfully!", type: 'success' });
        setShowLicenseLogin(false);
        setShowChoiceModal(false);
        
        // Create synthetic user access for this session
        const syntheticAccess: UserAccessData = {
          isForever: true,
          trialRemaining: 999,
          redeemedCodes: [],
          updatedAt: new Date().toISOString()
        };
        setUserAccess(syntheticAccess);
        
        // Force start because we just verified
        localStorage.setItem('digicap_onboarding_started', 'true');
        setShowLanding(false);
        setShowChoiceModal(false);
        setIsDemoMode(false);
        confirmNewStudy();
      } else {
        setToast({ message: translations[language].invalidLicense, type: 'error' });
      }
    } catch (error) {
      setToast({ message: "Login failed", type: 'error' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
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
  const [showFormulaDocument, setShowFormulaDocument] = useState(false);
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
  }>({
    count: 0,
    unlocked: 999,
    isForever: true,
    lastStudyId: null,
    hasSeenWelcome: false, 
    qualitasUseCount: 0
  });

  // Load trial data from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('digicap_trial_data');
      if (saved) {
        setTrialData(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load trial data");
    }
  }, []);

  const [trialCode, setTrialCode] = useState('');
  const [trialFeedback, setTrialFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showTrialWarning, setShowTrialWarning] = useState(false);
  const [showTrialEndedModal, setShowTrialEndedModal] = useState(false);

  const [isActivating, setIsActivating] = useState(false);
  const [isStorageBlocked, setIsStorageBlocked] = useState(false);

  // Use Firebase status for locking - only lock if we HAVE userAccess and it says so
  const isLocked = false; // Trial features disabled per user request
  const totalPossibleTrials = (userAccess?.trialRemaining || 0);

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
    const isFreeTrialActiveAndValid = freeTrialCount > 0 && freeTrialCount <= 3;
    if (!userAccess?.isForever && !isFreeUnlocked && (userAccess?.trialRemaining || 0) <= 0 && !hasActiveStudy && !showLanding && !isFreeTrialActiveAndValid) {
      // If no trials left and no active study, show ended modal
      // but wait for userAccess to load
      if (userAccess) setShowTrialEndedModal(true);
    }
  }, [userAccess, recentStudies.length, showLanding, isFreeUnlocked]);

  const handleActivateCode = async () => {
    const code = trialCode.trim().toLowerCase();
    if (!code) return;
    
    setIsActivating(true);
    setTrialFeedback(null);

    // Bypass code for admin
    if (code === '1731') {
      const fullAccess: UserAccessData = {
        isForever: true,
        trialRemaining: 1000,
        redeemedCodes: ['admin_bypass'],
        updatedAt: new Date()
      };
      setUserAccess(fullAccess);
      setShowTrialEndedModal(false);
      setTrialFeedback({ message: t.trialUnlockedForever || "Admin Access Granted", type: 'success' });
      setTrialCode('');
      setIsActivating(false);
      return;
    }

    try {
      // Ensure we have an auth session before redeeming
      const currentUser = auth.currentUser || await ensureAuthenticated();
      if (!currentUser) throw new Error(t.networkError || "Authentication failed");

      await redeemCode(currentUser.uid, code);
      
      // Update local state immediately
      const updatedAccess = await getUserAccess(currentUser.uid);
      setUserAccess(updatedAccess);

      if (code === 'qualitas') {
        setTrialFeedback({ message: t.bonusStudiesUnlocked, type: 'success' });
      } else if (code === 'qualitas forever') {
        setTrialFeedback({ message: t.qualitasWarning, type: 'success' });
      } else {
        setTrialFeedback({ message: t.trialUnlockedForever, type: 'success' });
      }

      // Close faster if it's a success
      setTimeout(() => {
        setShowTrialEndedModal(false);
        setTrialFeedback(null);
        setTrialCode('');
        
        // If they were on landing, maybe auto-start? 
        // For now, just letting them click start again is safer.
      }, 1500);
    } catch (error: any) {
      console.error("Activation failed:", error);
      setTrialFeedback({ message: error.message || t.invalidCode, type: 'error' });
    } finally {
      setIsActivating(false);
    }
  };

  const colors = {
    header: 'bg-[#081427]',
    logo: currentTheme.logo,
    newStudy: currentTheme.newStudy,
    activeTab: currentTheme.activeTab,
    bg: 'bg-[#081427]' 
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
      if (isDemoMode && !isMasterUser) {
        setShowChoiceModal(true);
        return;
      }
      if (measures.length >= APP_LIMITS.MAX_MEASURES) { alert(t.maxMeasures); return; }
      const newMeasure = createDefaultMeasure(language, measures.length + 1);
      setMeasures(prev => [...prev, newMeasure]);
      setActiveMeasureId(newMeasure.id);
      setShowOverlayReport(false);
  }, [isDemoMode, isMasterUser, createDefaultMeasure, language, t.maxMeasures, measures.length]);

  const handleDeleteMeasure = useCallback(() => {
      if (isDemoMode && !isMasterUser) {
        setShowChoiceModal(true);
        return;
      }
      if (measures.length <= 1) return;
      if (!confirm(t.deleteMeasureConfirm)) return;
      
      const newMeasures = measures.filter(m => m.id !== activeMeasureId);
      setMeasures(newMeasures);
      setActiveMeasureId(newMeasures[0].id);
      setShowOverlayReport(false);
  }, [isDemoMode, isMasterUser, activeMeasureId, t.deleteMeasureConfirm, measures]);

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
    if (isDemoMode && !isMasterUser) {
      setShowChoiceModal(true);
      return;
    }
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
  }, [activeMeasureId, isDemoMode, setShowChoiceModal]);

  const handleImportData = useCallback((values: number[]) => {
      if (isDemoMode && !isMasterUser) {
        setShowChoiceModal(true);
        return;
      }
      setMeasures(prev => prev.map(m => m.id === activeMeasureId ? { ...m, data: [...m.data, ...values.map(val => ({ id: uuidv4(), value: val, timestamp: Date.now() }))], isAnalyzed: false, stats: null, histogram: [] } : m));
  }, [activeMeasureId, isDemoMode]);

  const incrementTrial = useCallback(async () => {
    if (isDemoMode) return true;
    if (userAccess?.isForever || isFreeUnlocked) return true;
    
    // Check if within 3-test free trial
    const isFreeTrialActiveAndValid = freeTrialCount > 0 && freeTrialCount <= 3;
    if (isFreeTrialActiveAndValid) return true;
    
    // If study already counted this session, allow
    if (trialData.lastStudyId === studyInfo.id) return true;

    if (!userAccess || userAccess.trialRemaining <= 0) {
      setShowTrialEndedModal(true);
      return false;
    }

    if (auth.currentUser) {
      await decrementTrial(auth.currentUser.uid);
      const updated = await getUserAccess(auth.currentUser.uid);
      setUserAccess(updated);
    }

    setTrialData(prev => ({ 
      ...prev, 
      count: prev.count + 1,
      lastStudyId: studyInfo.id 
    }));
    return true;
  }, [userAccess, trialData.lastStudyId, studyInfo.id, isDemoMode, isFreeUnlocked]);

  const performAnalysis = useCallback(async () => {
    try {
      if (activeMeasure.data.length < 2) { 
        alert(t.tooFewMeasurements || "Too few measurements"); 
        return; 
      }
      
      // Check trial status
      const allowed = await incrementTrial();
      if (!allowed) return;

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
        logTelemetry('Run CPK Analysis', {
          measure_name: activeMeasure.name || 'Unnamed',
          sample_count: activeMeasure.data.length,
          distribution: activeMeasure.distribution,
          cpk: stats.cpk || 0,
          cp: stats.cp || 0
        });
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
          logTelemetry('PDF Export', {
            part_number: studyInfo.partNumber || 'Unnamed',
            measure_name: activeMeasure.name || 'Unnamed'
          });
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

  const runExcelExport = (selectedIds: string[]) => {
    if (isExporting) return;
    setIsExporting(true);
    
    setTimeout(() => {
      try {
        const wb = XLSX.utils.book_new();
        const targetMeasures = measures.filter(m => selectedIds.includes(m.id));
        
        if (targetMeasures.length === 0) {
          alert(language === 'sv' ? "Inga mått valda för export." : "No metrics selected for export.");
          setIsExporting(false);
          return;
        }

        const measuresWithStats = targetMeasures.filter(m => m.stats);
        if (measuresWithStats.length === 0) {
          alert(language === 'sv' ? "De valda måtten har ingen beräknad statistik än." : "The selected metrics do not have any calculated statistics yet.");
          setIsExporting(false);
          return;
        }

        logTelemetry('Excel Export', {
          count_measures: measuresWithStats.length,
          measure_names: measuresWithStats.map(m => m.name || 'Unnamed').join(', ')
        });

        measuresWithStats.forEach((m, idx) => {
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

          const isMachine = studyInfo.studyType === 'Machine';
          const isPerformance = studyInfo.studyType === 'Performance';
          
          const label1 = isMachine ? "Cmk" : (isPerformance ? "Ppk" : "Cpk");
          const label2 = isMachine ? "Cm" : (isPerformance ? "Pp" : "Cp");

          // Prepend zero-width space to force left alignment in Excel
          const zws = "\u200B";

          combinedRows.push({ A: `--- ${(m.name || (language === 'sv' ? `MÅTT ${idx + 1}` : `MEASURE ${idx + 1}`)).toUpperCase()} ---`, B: "" });
          combinedRows.push({ A: label1, B: zws + m.stats!.cpk.toFixed(4) });
          combinedRows.push({ A: label2, B: zws + (m.stats!.cp?.toFixed(4) || t.notAvailable) });
          combinedRows.push({ A: t.mean, B: zws + m.stats!.mean.toFixed(6) });
          combinedRows.push({ A: t.stdDev, B: zws + m.stats!.stdDev.toFixed(6) });
          combinedRows.push({ A: t.min, B: zws + m.stats!.min.toFixed(6) });
          combinedRows.push({ A: t.max, B: zws + m.stats!.max.toFixed(6) });
          combinedRows.push({ A: t.range, B: zws + (m.stats!.max - m.stats!.min).toFixed(6) });
          
          combinedRows.push({ A: "", B: "" });
          combinedRows.push({ A: t.reportDataLog.toUpperCase(), B: "" });
          m.data.forEach((d, i) => {
            combinedRows.push({ A: `${t.sample} ${i+1}`, B: zws + d.value });
          });
          combinedRows.push({ A: "", B: "" });

          const ws = XLSX.utils.json_to_sheet(combinedRows, { skipHeader: true });
          ws['!cols'] = [{ wch: 25 }, { wch: 60 }];

          let sheetName = m.name?.trim() || (language === 'sv' ? `Mått ${idx + 1}` : `Measure ${idx + 1}`);
          sheetName = sheetName.replace(/[\\/?*\[\]]/g, "_");
          if (sheetName.length > 30) {
            sheetName = sheetName.substring(0, 30);
          }
          
          let finalSheetName = sheetName;
          let counter = 1;
          while (wb.SheetNames.includes(finalSheetName)) {
            finalSheetName = `${sheetName.substring(0, 27)}_${counter}`;
            counter++;
          }

          XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
        });

        XLSX.writeFile(wb, `Digicap_${studyInfo.partNumber || 'Export'}.xlsx`);
      } catch (error) {
        console.error("Excel export failed:", error);
        alert(t.excelExportError);
      } finally {
        setIsExporting(false);
      }
    }, 200);
  };

  const handleExportExcel = () => {
    if (isExporting) return;
    
    if (measures.length > 1) {
      // Pre-select all measures with stats by default
      const withStats = measures.filter(m => m.stats).map(m => m.id);
      if (withStats.length > 0) {
        setExportSelectedMeasureIds(withStats);
      } else {
        setExportSelectedMeasureIds([activeMeasureId]);
      }
      setShowExportExcelModal(true);
    } else {
      runExcelExport([activeMeasureId]);
    }
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
    const isFreeTrialActiveAndValid = freeTrialCount > 0 && freeTrialCount <= 3;
    if (userAccess !== null && !userAccess.isForever && (userAccess.trialRemaining || 0) <= 0 && !hasActiveStudy && !isFreeTrialActiveAndValid) {
      setShowTrialEndedModal(true);
      return;
    }

    if (!trialData.hasSeenWelcome) {
      setShowWelcomeModal(true);
      const updatedData = { ...trialData, hasSeenWelcome: true };
      setTrialData(updatedData);
      try { localStorage.setItem('digicap_trial_data', JSON.stringify(updatedData)); } catch (e) {}
    }
    
    setShowLanding(false);
    setIsDemoMode(false);
  };

  const handleStartDemo = () => {
    setIsDemoMode(true);
    setShowLanding(false);
    setAppColor('navy');
    try { localStorage.setItem('digicap_color', 'navy'); } catch (e) {}

    if (!trialData.hasSeenWelcome) {
      setShowWelcomeModal(true);
      const updatedData = { ...trialData, hasSeenWelcome: true };
      setTrialData(updatedData);
      try { localStorage.setItem('digicap_trial_data', JSON.stringify(updatedData)); } catch (e) {}
    }
    
    // Initialize with Demo Data
    const demoLimits: ProcessLimits = {
      lsl: 12.000,
      usl: 12.040,
      target: 12.020,
      standard: 'VDA',
      toleranceType: 'double'
    };

    // Generate 50 realistic values for Diameter 1
    const d1Values = Array.from({ length: 50 }, () => {
      const val = DistMath.generateNormalValue(12.021, 0.005); 
      return { id: uuidv4(), value: Math.round(val * 1000) / 1000, timestamp: Date.now() };
    });

    const d1Stats = calculateStatistics(d1Values, demoLimits, 3, 'Normal', 'Machine', 'serial', 2);

    const measure1: Measure = {
      id: uuidv4(),
      name: 'Diameter 1',
      data: d1Values,
      limits: demoLimits,
      distribution: 'Normal',
      stats: d1Stats,
      histogram: d1Stats ? generateHistogramData(d1Values, d1Stats, demoLimits, 'Normal') : [],
      isAnalyzed: true,
      sigmaLevel: 3,
      calculationMethod: 'serial',
      subgroupSize: 2
    };

    // Diameter 2 (Different machine)
    const d2Values = Array.from({ length: 50 }, () => {
      const val = DistMath.generateNormalValue(12.018, 0.006); 
      return { id: uuidv4(), value: Math.round(val * 1000) / 1000, timestamp: Date.now() };
    });
    const d2Stats = calculateStatistics(d2Values, demoLimits, 3, 'Normal', 'Machine', 'serial', 2);
    
    const measure2: Measure = {
      id: uuidv4(),
      name: 'Diameter 2',
      data: d2Values,
      limits: demoLimits,
      distribution: 'Normal',
      stats: d2Stats,
      histogram: d2Stats ? generateHistogramData(d2Values, d2Stats, demoLimits, 'Normal') : [],
      isAnalyzed: true,
      sigmaLevel: 3,
      calculationMethod: 'serial',
      subgroupSize: 2
    };

    setMeasures([measure1, measure2]);
    setActiveMeasureId(measure1.id);
    
      setStudyInfo({
        id: uuidv4(),
        partNumber: '207-554',
        revision: '001',
        machineNumber: 'Star 1208',
        date: new Date().toISOString().split('T')[0],
        studyType: 'Machine',
        studyPurpose: t.demoStudyPurpose,
        performedBy: 'QUALITY DEPT'
      });
    
    setStudyKey(Date.now());
  };

  // Handle machine number switching in demo mode
  useEffect(() => {
    if (isDemoMode) {
      if (activeMeasureId) {
        const activeM = measures.find(m => m.id === activeMeasureId);
        if (activeM) {
          if (activeM.name === 'Diameter 1') {
            setStudyInfo(prev => ({ ...prev, machineNumber: 'Star 1208' }));
          } else if (activeM.name === 'Diameter 2') {
            setStudyInfo(prev => ({ ...prev, machineNumber: 'Star 1330' }));
          }
        }
      }
    }
  }, [activeMeasureId, isDemoMode, measures]);

  const handleNewStudy = () => {
    if (isMasterUser || isFreeUnlocked) {
      confirmNewStudy();
      return;
    }
    
    // Check if free trial limits are exceeded and block new study creation
    if (freeTrialCount >= 3 && !userAccess?.isForever) {
      setShowNewStudyConfirm(false);
      setShowTrialEndedModal(true); // Shows the beautiful "Trial Ended" modal with the prominent Buy button!
      setToast({ message: "Dina 3 gratistester är slut! Köp licens för att göra fler studier.", type: 'error' });
      return;
    }

    setShowNewStudyConfirm(false);
    setShowChoiceModal(true); // Show the 4-choice menu instead
  };

  async function confirmNewStudy() {
    setShowChoiceModal(false);
    
    // Clear local storage for the current study
    localStorage.removeItem('digicap_study_data');
    localStorage.removeItem('digicap_onboarding_started');
    
    // Reset all operational states IMMEDIATELY
    setIsExporting(false);
    setIsDataDirty(false);
    setIsDemoMode(false);
    setAppColor('navy');
    try { localStorage.setItem('digicap_color', 'navy'); } catch (e) {}

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
      setShowWelcomeModal(false);
      setShowLicenseLogin(false);
      setShowChoiceModal(false);
      setShowResumeModal(false);
      
      // Force remount by changing key instead of hard reload
      setStudyKey(Date.now());
    } catch (error) {
      console.error("Failed to start new study:", error);
      alert(t.studyStartError);
    }
  }

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
      {/* New Study Choice Modal */}
      {showChoiceModal && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-700 max-w-sm w-full p-8 shadow-2xl rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500"></div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8 text-center">{t.newStudyTitle}</h3>
            
            <div className="flex flex-col gap-4">
              <button 
                onClick={handleOpenCheckout}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-start px-6 gap-4 border border-emerald-400/30 shadow-lg shadow-emerald-900/20"
              >
                <Plus className="w-5 h-5 text-emerald-200" />
                <span className="text-[11px]">{t.newStudyOptionBuy}</span>
              </button>

              <button 
                onClick={handleStartFreeTrial}
                disabled={freeTrialCount >= 3}
                className={`w-full py-4 ${freeTrialCount >= 3 ? 'bg-slate-800/60 border border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-400/30 shadow-lg active:scale-95 duration-150'} font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-start px-6 gap-4`}
              >
                <Sparkles className={`w-5 h-5 ${freeTrialCount >= 3 ? 'text-slate-600' : 'text-amber-200'}`} />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[11px]">{t.newStudyOptionFreeTrial}</span>
                  <span className="text-[8px] opacity-70 font-mono tracking-tight">
                    {freeTrialCount >= 3 ? t.freeTrialsUsedUp : (t.freeTrialsRemaining || '').replace('{count}', (3 - freeTrialCount).toString())}
                  </span>
                </div>
              </button>

              <button 
                onClick={async () => {
                  try {
                    await handleGoogleLogin();
                    // Small delay to ensure firebase state is updated
                    setTimeout(() => confirmNewStudy(), 300);
                  } catch (e) {
                    console.error("Login sequence failed");
                  }
                }}
                className="w-full py-4 bg-white hover:bg-slate-100 text-slate-900 font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center border-2 border-white"
              >
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-[11px] font-sans">{t.newStudyOptionLogin}</span>
                </div>
              </button>

              <button 
                onClick={() => setShowLicenseLogin(true)}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-start px-6 gap-4 border border-slate-600"
              >
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <div className="flex flex-col items-start leading-tight">
                    <span className="text-[11px]">{t.newStudyOptionNewCustomer}</span>
                    <span className="text-[8px] opacity-60 font-mono tracking-tight">{t.newStudyOptionNewCustomerDesc}</span>
                </div>
              </button>

              <button 
                onClick={() => setShowChoiceModal(false)}
                className="mt-4 w-full py-2 bg-transparent text-slate-500 hover:text-slate-300 font-bold uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcwIcon className="w-3 h-3" />
                {t.newStudyOptionBack}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* License Login Overlay */}
      {showLicenseLogin && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <div 
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">{t.loginWithLicense}</h2>
              <button onClick={() => setShowLicenseLogin(false)} className="text-slate-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">{t.emailPlaceholder}</label>
                <input 
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">{t.orderIdPlaceholder}</label>
                <input 
                  type="text"
                  value={loginOrderId}
                  onChange={(e) => setLoginOrderId(e.target.value)}
                  placeholder="8234719"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>

              <button 
                onClick={handleLicenseLogin}
                disabled={isLoggingIn || !loginEmail || !loginOrderId}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center mt-4"
              >
                {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {t.landingLogin}
              </button>
              
              <p className="text-[9px] text-slate-500 text-center uppercase tracking-widest font-mono pt-4 leading-relaxed">
                Works for Apple users and corporate emails
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FREE Code Modal Overlay */}
      {showFreeCodeModal && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <div 
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">FREE Access</h2>
              <button onClick={() => { setShowFreeCodeModal(false); setFreePasswordInput(''); setFreePasswordError(null); }} className="text-slate-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  {language === 'sv' ? "Ange lösenord" : "Enter password"}
                </label>
                <input 
                  type="password"
                  value={freePasswordInput}
                  onChange={(e) => {
                    setFreePasswordInput(e.target.value);
                    if (freePasswordError) setFreePasswordError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleFreeLogin()}
                  placeholder="••••"
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-center text-lg font-mono focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {freePasswordError && (
                <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center animate-pulse">
                  {freePasswordError}
                </p>
              )}

              <button 
                onClick={handleFreeLogin}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                {language === 'sv' ? "Aktivera" : "Activate"}
              </button>
            </div>
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

      {/* APPTEST Password Prompt Modal */}
      {showAppTestModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500 max-w-sm w-full p-8 shadow-2xl rounded-2xl text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto">
              <Key className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">APPTEST TILLGÅNG</h3>
            <p className="text-slate-400 text-xs font-bold">Ange lösenord för att få obehindrad tillgång till appen i 14 dagar.</p>
            
            <input 
              type="password"
              value={appTestPassword}
              onChange={(e) => {
                setAppTestPassword(e.target.value);
                if (appTestError) setAppTestError('');
              }}
              placeholder="Lösenord"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            
            {appTestError && (
              <p className="text-rose-500 text-xs font-bold">{appTestError}</p>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={() => { setShowAppTestModal(false); setAppTestError(''); setAppTestPassword(''); }}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all"
              >
                Avbryt
              </button>
              <button 
                onClick={handleVerifyAppTestPassword}
                disabled={isVerifyingAppTest}
                className="py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isVerifyingAppTest ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Bevilja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Last Free Trial Warning Modal */}
      {showLastFreeTrialWarningModal && (
        <div className="fixed inset-0 z-[1600] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6" onClick={(e) => e.stopPropagation()}>
          <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock className="w-8 h-8 text-amber-500 animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">SISTA GRATISTESTET</h2>
            <p className="text-slate-300 text-sm leading-relaxed font-bold">
              Det här är din sista gratis testomgång. Du kan avsluta och utföra detta 3:e test komplett inklusive analyser och rapporter.<br/><br/>
              När du därefter påbörjar ett nytt test kommer du att behöva köpa en licens.
            </p>
            <button 
              onClick={() => {
                setShowLastFreeTrialWarningModal(false);
                setToast({ message: "Sista gratistestet påbörjat.", type: 'success' });
                setShowChoiceModal(false);
                setShowLanding(false);
                confirmNewStudy();
              }}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg font-bold"
            >
              AVSLUTA KOMPLETT
            </button>
          </div>
        </div>
      )}

      {/* Trial Ended Modal */}
      {showTrialEndedModal && (
        <div className="fixed inset-0 z-[1500] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">{t.trialEndedTitle}</h2>
            <p className="text-slate-400 text-sm leading-relaxed font-bold">
              {t.trialEndedDesc}
            </p>
            <div className="space-y-3 pt-4">
              <button 
                onClick={handleOpenCheckout}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest rounded-sm transition-all shadow-lg shadow-emerald-900/20"
              >
                {t.subscribeNow || "Lås upp PRO"}
              </button>
              <button 
                onClick={() => { setShowTrialEndedModal(false); setShowLicenseLogin(true); }}
                className="w-full py-3 text-slate-500 hover:text-white font-bold uppercase tracking-widest text-[10px]"
              >
                {t.loginWithLicense}
              </button>
              <button 
                onClick={() => { setShowTrialEndedModal(false); setShowLanding(true); }}
                className="w-full px-4 py-2 text-slate-600 hover:text-slate-500 font-bold uppercase tracking-widest text-[9px]"
              >
                {t.newStudyOptionBack}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 text-center custom-scrollbar">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-black mb-4 text-slate-900 dark:text-white uppercase tracking-tight">
              {t.welcomeTitle}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed font-medium">
              {t.welcomeDesc}
            </p>
            <button
              onClick={() => {
                setShowWelcomeModal(false);
              }}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-95 shadow-lg ${currentTheme.newStudy} text-white uppercase tracking-wider`}
            >
              {t.welcomeButton}
            </button>
          </div>
        </div>
      )}

      {showLanding ? (
        <PhoneFrame>
          <LandingPage 
            onStart={() => setShowChoiceModal(true)} 
            onDemo={handleStartDemo}
            onLogin={() => setShowChoiceModal(true)}
            onLicenseLogin={() => setShowLicenseLogin(true)}
            themeColor={currentTheme} 
            logoColorClass={logoTheme.logo}
            language={language} 
            onLanguageChange={handleLanguageChange} 
            userAccess={userAccess}
          />
        </PhoneFrame>
      ) : (
        <div key={studyKey} className={`h-[100dvh] flex flex-col font-sans ${themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'} ${colors.bg} relative border-[8px] md:border-[12px] border-slate-400/50 dark:border-slate-700/60 md:rounded-[32px] overflow-hidden shadow-2xl`}>
          <div className="shrink-0 z-50 sticky top-0 shadow-lg">
            <header className={`${colors.header} text-white border-b-4 ${currentTheme.hex === '#1e3a8a' ? 'border-blue-900' : 'border-slate-400/50 dark:border-slate-700/60'} pt-2 pb-2`}>
          <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center md:items-start justify-between gap-3 md:gap-0">
            <div className="flex flex-col items-center py-0 px-2 mt-[1px]">
              <div className="flex flex-row items-start justify-center gap-3 flex-wrap">
                <div className="flex flex-col items-start">
                  <h1 
                    onClick={() => setShowLanding(true)}
                    className={`relative text-2xl font-black tracking-normal ${logoTheme.text} leading-none flex items-center justify-start cursor-pointer hover:opacity-80 transition-opacity`}
                    title={t.tooltipHome}
                    style={{ 
                      textShadow: '-0.4px -0.4px 0 rgba(255, 255, 255, 0.45), 0.4px -0.4px 0 rgba(255, 255, 255, 0.45), -0.4px 0.4px 0 rgba(255, 255, 255, 0.45), 0.4px 0.4px 0 rgba(255, 255, 255, 0.45)' 
                    }}
                  >
                    DIGICAP
                    <span className="absolute left-[calc(100%+1.5px)] top-[0px] text-[7px] font-bold text-slate-300 select-none" style={{ WebkitTextStroke: 'none', textShadow: 'none' }}>®</span>
                  </h1>
                  <div 
                    className="w-full mt-[-1px] uppercase text-slate-400 text-[6.2px] font-semibold flex justify-between select-none"
                  >
                    {t.appSubtitle.split("").map((char, idx) => (
                      <span key={idx}>
                        {char === " " ? "\u00A0" : char}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-row md:flex-col items-center md:items-end gap-2 mt-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button onClick={handleLoad} className={`w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 border-slate-400 dark:border-slate-500 text-slate-200 hover:text-white transition-all active:scale-90 shrink-0 font-mono bg-gradient-to-b from-slate-800 via-slate-800/80 to-slate-900 shadow-sm`} title={t.tooltipOpen}><FolderOpen className="w-4 h-4 sm:w-4 sm:h-4" /></button>
                <button onClick={handleSave} className={`w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 border-slate-400 dark:border-slate-500 text-slate-200 hover:text-white transition-all active:scale-90 shrink-0 font-mono bg-gradient-to-b from-slate-800 via-slate-800/80 to-slate-900 shadow-sm`} title={t.tooltipSave} disabled={isSaving}>{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}</button>
                <button onClick={() => setShowAbout(true)} className={`w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 border-slate-400 dark:border-slate-500 text-slate-200 hover:text-white transition-all active:scale-90 shrink-0 font-mono bg-gradient-to-b from-slate-800 via-slate-800/80 to-slate-900 shadow-sm`} title={t.tooltipAbout}><Info className="w-4 h-4 sm:w-4 sm:h-4" /></button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettings(true);
                  }} 
                  className={`w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 border-slate-400 dark:border-slate-500 text-slate-200 hover:text-white transition-all active:scale-110 active:bg-slate-700 shrink-0 font-mono bg-gradient-to-b from-slate-800 via-slate-800/80 to-slate-900 relative z-[100] cursor-pointer shadow-sm`} 
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
                  className={`w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 transition-all active:scale-90 shrink-0 ${activeMeasure.stats && !isExporting ? 'border-slate-400 dark:border-slate-500 text-emerald-400 hover:text-emerald-300 bg-gradient-to-b from-slate-800 to-slate-900' : 'border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'} relative z-10 font-mono`} 
                  disabled={!activeMeasure.stats || isExporting}
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 sm:w-4 sm:h-4" />}
                </button>
                 <button 
                  type="button"
                  onClick={handleExportPdf} 
                  title={t.tooltipPdf}
                  className={`w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 transition-all active:scale-90 shrink-0 ${activeMeasure.stats && !isExporting ? 'border-slate-400 dark:border-slate-500 text-emerald-400 hover:text-emerald-300 bg-gradient-to-b from-slate-800 to-slate-900' : 'border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'} relative z-10 font-mono`} 
                  disabled={!activeMeasure.stats || isExporting}
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 sm:w-4 sm:h-4" />}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="bg-slate-900 border-b-2 border-black shadow-inner">
          <div className="max-w-6xl mx-auto px-2 sm:px-4 flex flex-col sm:flex-row items-start sm:items-center justify-start py-2 gap-2 sm:gap-4">
              <div className="flex items-center gap-0.5 sm:gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto">
                <button 
                  onClick={handleNewStudy} 
                  className={`px-1 sm:px-3 py-1 sm:py-1.5 ${colors.newStudy} text-white rounded-sm text-[8.5px] sm:text-[10px] font-mono font-bold uppercase tracking-wider border sm:border-2 ${currentTheme.border.replace('text', 'border').replace('500', '600')} shrink-0 hover:opacity-90 transition-all active:scale-95 whitespace-nowrap flex items-center gap-1 sm:gap-1.5`}
                >
                  <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  {t.newStudy}
                </button>

                {recentStudies.length > 0 && (
                  <button 
                    onClick={() => setShowResumeModal(true)} 
                    className={`px-1 sm:px-3 py-1 sm:py-1.5 ${colors.newStudy} text-white rounded-sm text-[8.5px] sm:text-[10px] font-mono font-bold uppercase tracking-wider border sm:border-2 ${currentTheme.border.replace('text', 'border').replace('500', '600')} shrink-0 hover:opacity-90 transition-all active:scale-95 whitespace-nowrap flex items-center gap-1 sm:gap-1.5`}
                  >
                    <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {t.restore}
                  </button>
                )}

                <button 
                  onClick={handleAddMeasure} 
                  className={`px-1 sm:px-3 py-1 sm:py-1.5 ${colors.newStudy} text-white rounded-sm text-[8.5px] sm:text-[10px] font-mono font-bold uppercase tracking-wider border sm:border-2 ${currentTheme.border.replace('text', 'border').replace('500', '600')} shrink-0 hover:opacity-90 transition-all active:scale-95 whitespace-nowrap`}
                >
                  {t.addMeasure}
                </button>
                <button 
                  onClick={() => { setOverlayMeasureIds(compatibleMeasures.map(m => m.id)); setShowOverlayModal(true); }} 
                  className={`px-1 sm:px-3 py-1 sm:py-1.5 ${colors.newStudy} text-white rounded-sm text-[8.5px] sm:text-[10px] font-mono font-bold uppercase tracking-wider border sm:border-2 ${currentTheme.border.replace('text', 'border').replace('500', '600')} flex items-center gap-0.5 sm:gap-1 shrink-0 hover:opacity-90 transition-all active:scale-95 whitespace-nowrap`}
                >
                  <Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {t.overlayBtn}
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
          {!showOverlayReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                <StudyDetails 
                  info={studyInfo} 
                  setInfo={setStudyInfo as any} 
                  language={language} 
                  theme={theme} 
                  themeColor={currentTheme} 
                  themeMode={themeMode} 
                  isDemoMode={isDemoMode}
                />
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
                <div className="md:col-span-2 lg:col-span-3">
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
                    isDemoMode={isDemoMode}
                    onRestrictedAction={() => {
                      if (isMasterUser) {
                        // For Master users, we don't need to show the modal
                      } else {
                        setShowChoiceModal(true);
                      }
                    }}
                    calculationMethod={activeMeasure.calculationMethod || 'serial'}
                    subgroupSize={activeMeasure.subgroupSize || 2}
                    themeMode={themeMode} 
                  />
                </div>
            </div>
          )}

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
                          spcRule={spcRule}
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
          <div className="fixed inset-0 z-[1000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
              <div className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-black'} max-w-sm w-full border-4 flex flex-col max-h-[90vh]`} onClick={(e) => e.stopPropagation()}>
                  <div className={`${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'} px-4 py-4 border-b-2 flex justify-between items-center`}><div className="flex items-center gap-2"><Settings className={`w-5 h-5 ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-800'}`} /><h3 className={`font-bold text-sm uppercase tracking-wider ${themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{t.params}</h3></div><button onClick={() => setShowSettings(false)}><X className="w-6 h-6 text-slate-500" /></button></div>
                  <div className="p-6 space-y-8 overflow-y-auto">
                      {/* License Section */}
                      <div className={`p-6 rounded-sm border-2 ${userAccess?.isForever ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            <h4 className={`font-black uppercase tracking-widest text-[11px] ${themeMode === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              DigiCap® Pro Active
                            </h4>
                          </div>
                          <span className="px-2 py-1 bg-emerald-500 text-white text-[9px] font-black rounded-full uppercase tracking-tighter">Lifetime</span>
                        </div>

                        <p className="text-[11px] font-bold text-emerald-500/80 italic">
                          Thank you for supporting DigiCap®! All professional features are unlocked.
                        </p>
                      </div>

                      <div className="pt-2">
                          <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                              {language === 'sv' ? 'SPC-Regelverk (Styrgränser)' : 'SPC Standard (Control Limits)'}
                          </label>
                          <select 
                              value={spcRule} 
                              onChange={(e) => handleSpcRuleChange(e.target.value as 'IATF' | 'AIAG' | 'ISO')} 
                              className={`${selectBaseStyle} ${themeMode === 'dark' ? 'bg-slate-800 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-400'} mb-4`}
                          >
                              <option value="IATF">IATF 16949 / VDA (7 pts)</option>
                              <option value="ISO">ISO 7870-2 (8 pts)</option>
                              <option value="AIAG">AIAG / Nelson (9 pts)</option>
                          </select>
                      </div>
                      <div><label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">{t.languageLabel}</label>
                          <select value={language} onChange={handleLanguageChange} className={`${selectBaseStyle} ${themeMode === 'dark' ? 'bg-slate-800 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-400'}`}>{Object.entries(languageNames).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>
                          <div className="mt-2 text-center">
                            <span className="text-[8px] font-bold uppercase tracking-widest opacity-20 text-slate-500">
                               DIGICAP APP
                            </span>
                          </div>
                      </div>

                      <div className="pt-6 border-t-2 border-slate-200 space-y-3">
                          <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-3 block">{t.helpAndGuides}</label>
                          <button onClick={() => { setShowStudyGuide(true); }} className={`w-full flex items-center justify-between p-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'} border-2 font-bold text-sm uppercase tracking-wide text-left transition-all cursor-pointer`}><span className="flex items-center gap-2"><Book className={`w-5 h-5 ${currentTheme.icon}`} /> {t.guideTitle}</span><ChevronDown className="w-5 h-5 -rotate-90 text-slate-400" /></button>
                          <button onClick={() => { setShowFormulaGuide(true); }} className={`w-full flex items-center justify-between p-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'} border-2 font-bold text-sm uppercase tracking-wide text-left transition-all cursor-pointer`}><span className="flex items-center gap-2"><Calculator className="w-5 h-5 text-emerald-600" /> {t.formulaGuideTitle}</span><ChevronDown className="w-5 h-5 -rotate-90 text-slate-400" /></button>
                          <button onClick={() => { setShowFormulaDocument(true); }} className={`w-full flex items-center justify-between p-4 ${themeMode === 'dark' ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/50' : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'} border-2 font-bold text-sm uppercase tracking-wide text-left transition-all cursor-pointer`}><span className="flex items-center gap-2"><FileText className={`w-5 h-5 text-emerald-500`} /> {t.formulaDocumentTitle}</span><ChevronDown className="w-5 h-5 -rotate-90 text-slate-400" /></button>
                          <button onClick={() => { setShowDistGuide(true); }} className={`w-full flex items-center justify-between p-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'} border-2 font-bold text-sm uppercase tracking-wide text-left transition-all cursor-pointer`}><span className="flex items-center gap-2"><BarChart className="w-5 h-5 text-violet-600" /> {t.distGuideTitle}</span><ChevronDown className="w-5 h-5 -rotate-90 text-slate-400" /></button>
                          <button onClick={() => { setShowGlossary(true); }} className={`w-full flex items-center justify-between p-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'} border-2 font-bold text-sm uppercase tracking-wide text-left transition-all cursor-pointer`}><span className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-600" /> {t.glossaryTitle}</span><ChevronDown className="w-5 h-5 -rotate-90 text-slate-400" /></button>
                          <button onClick={() => { setShowTraining(true); }} className={`w-full flex items-center justify-between p-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'} border-2 font-bold text-sm uppercase tracking-wide text-left transition-all cursor-pointer`}><span className="flex items-center gap-2"><HelpCircle className={`w-5 h-5 ${currentTheme.icon}`} /> {t.trainingTitle}</span><ChevronDown className="w-5 h-5 -rotate-90 text-slate-400" /></button>
                          <button 
                            onClick={() => { setShowSettings(false); setShowGame(true); }} 
                            className="w-full flex items-center justify-between p-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-widest rounded-sm transition-all shadow-lg shadow-blue-900/20 cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Target className="w-5 h-5" /> 
                              {t.playHitTheMean}
                            </span>
                            <ChevronDown className="w-5 h-5 -rotate-90 text-white/50" />
                          </button>
                          <a 
                            href="mailto:info@digicap.app"
                            className={`w-full flex items-center justify-between p-4 ${themeMode === 'dark' ? 'bg-red-950/30 border-red-500/30 text-red-400 hover:bg-red-950/50' : 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100'} border-2 font-bold text-sm uppercase tracking-wide text-left transition-all cursor-pointer`}
                          >
                            <span className="flex items-center gap-2">
                              <Bug className="w-5 h-5 text-red-500" /> 
                              RAPPORTERA EN BUGG
                            </span>
                            <ExternalLink className="w-5 h-5 text-red-400/50" />
                          </a>
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
                            </select>
                            {standardHelpText && (
                                <div className={`mt-3 p-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : currentTheme.lightBg + ' ' + currentTheme.lightBorder + ' ' + currentTheme.darkText} border-2 text-[12px] leading-relaxed animate-in fade-in slide-in-from-top-1`}>
                                    <ReactMarkdown>{standardHelpText}</ReactMarkdown>
                                </div>
                            )}
                         </div>
                         <div><label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">{t.distModel}</label><select value={activeMeasure.distribution} onChange={(e) => updateActiveMeasure({ distribution: e.target.value as DistributionType })} className={`${selectBaseStyle} ${themeMode === 'dark' ? 'bg-slate-800 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-400'}`}><option value="Normal">{t.distNormal}</option><option value="LogNormal">{t.distLogNormal}</option><option value="Folded">{t.distFolded}</option><option value="Rayleigh">{t.distRayleigh}</option><option value="Weibull">{t.distWeibull}</option></select></div>
                         <div className="pt-2"><label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2 block flex items-center gap-1"><Sigma className="w-4 h-4" /> {t.sigmaLevel}</label><div className="grid grid-cols-4 gap-2">{[2, 3, 4, 6].map(lvl => (<button key={lvl} onClick={() => updateActiveMeasure({ sigmaLevel: lvl })} className={`py-3 text-[12px] font-black border-2 rounded-sm transition-all ${activeMeasure.sigmaLevel === lvl ? 'bg-black text-white border-black' : (themeMode === 'dark' ? 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-400' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500')}`}>±{lvl}σ</button>))}</div></div>
                      </div>
                      <div className="pt-6 border-t-2 border-slate-200">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-3 block flex items-center gap-1"><Palette className="w-4 h-4" /> {t.themeTitle}</label>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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
                      {!userAccess?.isForever && (
                        <div className="pt-6 border-t-2 border-slate-200 space-y-4">
                          {userAccess?.trialRemaining && userAccess.trialRemaining > 0 && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm">
                              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                                {t.trialActive || 'Temporary Unlock Active'}
                              </p>
                              <p className="text-[9px] text-amber-600 font-medium mt-1">
                                {userAccess.trialRemaining} {t.studiesRemaining || 'studies remaining'}
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

                      {/* Developer Console Logo v2.0 Live Preview in Settings */}
                      <div className="pt-6 border-t-2 border-slate-700/60">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2 block flex items-center gap-1.5">
                          <span>Console Logo v2.0</span>
                          <span className="text-[8px] bg-violet-600 text-white font-extrabold px-1.5 py-0.5 rounded-full tracking-wider">DEV</span>
                        </label>
                        <p className="text-[10px] text-slate-400 font-bold leading-normal mb-3 uppercase tracking-wide">
                          {language === 'sv' 
                            ? 'Mörkblå bakgrund med supervit text för nästa version.' 
                            : 'Deep navy-blue background with pure white typography for the next release.'}
                        </p>
                        
                        <a 
                          href="/digicap_console_logo.svg?v=2" 
                          target="_blank" 
                          rel="noreferrer"
                          className="block relative aspect-square bg-slate-950 border-2 border-slate-800 rounded-lg overflow-hidden group hover:border-violet-500 transition-all cursor-pointer p-4 shadow-inner"
                        >
                          <img 
                            src={`/digicap_console_logo.svg?v=${studyKey}`} 
                            alt="DigiCap Console Logo v2.0" 
                            className="w-full h-full object-contain pointer-events-none group-hover:scale-[1.03] transition-transform duration-300" 
                          />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <span className="bg-slate-900 border border-slate-700 text-white font-black uppercase text-[10px] tracking-widest px-3 py-1.5 shadow-xl rounded-sm">
                              {language === 'sv' ? 'Öppna SVG (512x512)' : 'Open SVG (512x512)'}
                            </span>
                          </div>
                        </a>
                        
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <a 
                            href="/digicap_console_logo.png?v=2" 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-center py-2 bg-slate-800 hover:bg-slate-700 text-[9px] font-black text-slate-300 border border-slate-700/60 transition-colors uppercase tracking-widest rounded-sm"
                          >
                            Öppna PNG
                          </a>
                          <a 
                            href="/digicap_console_logo.jpg?v=2" 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-center py-2 bg-slate-800 hover:bg-slate-700 text-[9px] font-black text-slate-300 border border-slate-700/60 transition-colors uppercase tracking-widest rounded-sm"
                          >
                            Öppna JPG
                          </a>
                        </div>
                      </div>
                  </div>
                  <div className={`p-6 border-t-2 ${themeMode === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-300 bg-slate-200'}`}><button onClick={() => setShowSettings(false)} className={`w-full py-3.5 ${themeMode === 'dark' ? 'bg-white text-black' : 'bg-black text-white'} font-bold text-sm uppercase tracking-wider transition-colors`}>{t.close}</button></div>
              </div>
          </div>
      )}
            {(showStudyGuide || showFormulaGuide || showFormulaDocument || showDistGuide || showGlossary || showTraining) && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4" onClick={() => {setShowStudyGuide(false); setShowFormulaGuide(false); setShowFormulaDocument(false); setShowDistGuide(false); setShowGlossary(false); setShowTraining(false);}}>
           <div className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-black'} border-4 max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden`} onClick={(e) => e.stopPropagation()}>
              <div className={`p-5 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'} border-b-2 flex justify-between items-center shrink-0`}>
                 <h3 className={`font-bold text-sm uppercase tracking-widest ${themeMode === 'dark' ? 'text-slate-100' : 'text-black'}`}>
                   {showStudyGuide ? t.guideTitle : showFormulaGuide ? t.formulaGuideTitle : showFormulaDocument ? t.formulaDocumentTitle : showDistGuide ? t.distGuideTitle : showTraining ? t.trainingTitle : t.glossaryTitle}
                 </h3>
                 <button onClick={() => {setShowStudyGuide(false); setShowFormulaGuide(false); setShowFormulaDocument(false); setShowDistGuide(false); setShowGlossary(false); setShowTraining(false);}} className="p-1"><X className={`w-6 h-6 ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-900'}`}/></button>
              </div>
              <div className={`p-8 overflow-y-auto custom-scrollbar prose prose-sm ${themeMode === 'dark' ? 'prose-invert' : 'prose-slate'} max-w-none`}>
                <ReactMarkdown>
                  {showStudyGuide ? t.guideIntro + '\n\n' + '---' + '\n\n' + '#### ' + t.cmTitle + '\n' + t.cmDesc + '\n\n' + '#### ' + t.ppTitle + '\n' + t.ppDesc + '\n\n' + '#### ' + t.cpTitle + '\n' + t.cpDesc 
                  : showFormulaGuide ? t.formulaGuideIntro 
                  : showFormulaDocument ? t.formulaDocumentContent
                  : showDistGuide ? t.distGuideContent
                  : showTraining ? t.glossaryTraining
                  : t.glossarySPC + '\n\n' + t.glossaryCpk + '\n\n' + t.glossaryPpk + '\n\n' + t.glossaryCmk + '\n\n' + t.glossarySigma + '\n\n' + t.glossaryNormalDist + '\n\n' + t.glossaryUsEu + '\n\n' + t.glossaryPotentialActual}
                </ReactMarkdown>
              </div>
              <div className={`p-5 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'} border-t-2 shrink-0`}>
                 <button onClick={() => {setShowStudyGuide(false); setShowFormulaGuide(false); setShowFormulaDocument(false); setShowDistGuide(false); setShowGlossary(false); setShowTraining(false);}} className={`w-full py-3 ${themeMode === 'dark' ? 'bg-white text-black' : 'bg-black text-white'} font-bold text-sm uppercase tracking-widest transition-colors`}>{t.okBtn}</button>
              </div>
           </div>
        </div>
      )}

      {/* Modals */}

      {showAbout && (
          <div className="fixed inset-0 z-[1100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowAbout(false)}>
              <div className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-black'} border-4 max-w-sm md:max-w-lg w-full shadow-2xl overflow-hidden flex flex-col transition-all`} onClick={(e) => e.stopPropagation()}>
                  <div className={`px-5 py-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'} border-b-2 flex justify-between items-center`}><div className="flex items-center gap-2"><Info className={`w-5 h-5 ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-900'}`} /> <h3 className={`font-bold text-sm uppercase tracking-widest ${themeMode === 'dark' ? 'text-slate-100' : 'text-black'}`}>{t.aboutTitle}</h3></div><button onClick={() => setShowAbout(false)}><X className="w-6 h-6 text-slate-500" /></button></div>
                  <div className="p-8 space-y-8 overflow-y-auto max-h-[75vh] custom-scrollbar">
                      <div className="flex flex-col items-center">
                        <div className="flex flex-col items-start">
                          <h2 
                            onClick={handleAdminTrigger}
                            className={`relative text-3xl font-black uppercase tracking-[0.02em] ${themeMode === 'dark' ? logoTheme.text : 'text-slate-900'} mb-1 cursor-default select-none flex items-start`}
                            style={{ 
                              textShadow: themeMode === 'dark'
                                ? '-0.4px -0.4px 0 rgba(255, 255, 255, 0.45), 0.4px -0.4px 0 rgba(255, 255, 255, 0.45), -0.4px 0.4px 0 rgba(255, 255, 255, 0.45), 0.4px 0.4px 0 rgba(255, 255, 255, 0.45)'
                                : '-0.4px -0.4px 0 rgba(0, 0, 0, 0.15), 0.4px -0.4px 0 rgba(0, 0, 0, 0.15), -0.4px 0.4px 0 rgba(0, 0, 0, 0.15), 0.4px 0.4px 0 rgba(0, 0, 0, 0.15)'
                            }}
                          >
                            DIGICAP<span className="absolute left-[calc(100%+2px)] top-[1px] text-[9px] font-bold text-slate-400 select-none" style={{ WebkitTextStroke: 'none', textShadow: 'none' }}>®</span>
                          </h2>
                          <div 
                            className="w-full mt-[-1px] mb-6 uppercase text-slate-400 text-[7.2px] font-semibold flex justify-between select-none"
                          >
                            {t.appSubtitle.split("").map((char, idx) => (
                              <span key={idx}>
                                {char === " " ? "\u00A0" : char}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className={`p-5 border-2 ${currentTheme.border} bg-slate-50 rounded-sm mb-2 text-left`}>
                            <p className="text-[12px] font-bold text-slate-700 leading-relaxed">
                                {t.aboutDescription}
                            </p>
                            <div className="mt-4 flex justify-center">
                                <button 
                                  onClick={handleOpenCheckout}
                                  className={`px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest rounded-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 flex items-center gap-2 shadow-lg hover:shadow-emerald-900/20`}
                                >
                                  <Sparkles className="w-4 h-4" />
                                  {t.buyNow}
                                </button>
                            </div>
                        </div>
                      </div>

                      <div className={`space-y-6 pt-2`}>
                          <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">{t.systemDev}</label><p className={`text-xs font-bold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>{t.companyName}</p></div>
                             <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">{t.techSupport}</label>
                              <a href={`mailto:${t.contactEmail}`} className={`text-xs font-black ${themeMode === 'dark' ? 'text-white' : currentTheme.text} flex items-center gap-2 hover:underline`}><Mail className="w-3 h-3" /> {t.contactEmail}</a>
                            </div>
                          </div>

                          <div className={`grid grid-cols-2 gap-3 pt-6 border-t-2 ${themeMode === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                              <button onClick={() => setShowTerms(true)} className={`px-2 py-3 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'} border-2 text-[10px] font-black uppercase tracking-widest transition-all`}>{t.termsTitle}</button>
                              <button onClick={() => setShowPrivacy(true)} className={`px-2 py-3 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'} border-2 text-[10px] font-black uppercase tracking-widest transition-all`}>{t.privacyTitle}</button>
                              <button 
                                onClick={() => setShowChangelog(true)} 
                                className={`col-span-2 px-2 py-3 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'} border-2 text-[10px] font-black uppercase tracking-widest transition-all`}
                              >
                                {language === 'sv' ? 'CHANGELOG / VERSION HISTORY' : 'CHANGELOG / VERSION HISTORY'}
                              </button>
                              <button 
                                onClick={() => { setShowFormulaDocument(true); }} 
                                className={`col-span-2 px-2 py-3 ${themeMode === 'dark' ? 'bg-emerald-900/20 border-emerald-500/20 text-emerald-500 hover:bg-emerald-900/30' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'} border-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2`}
                              >
                                <Calculator className="w-3 h-3" />
                                {t.formulaDocumentTitle}
                              </button>
                          </div>
                      </div>

                      {/* Color Selector */}
                      <div className={`pt-6 border-t-2 ${themeMode === 'dark' ? 'border-slate-800' : 'border-slate-100'} space-y-3`}>
                        <label className="text-[10px] font-black uppercase tracking-[0.20em] text-slate-400 block">
                          {language === 'sv' ? 'VÄLJ FÄRGTEMA (LOGOTYP)' : 'CHOOSE COLOR THEME (LOGO)'}
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {Object.entries(themeColors).map(([key, col]: [string, any]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                handleColorChange(key as AppColor);
                              }}
                              className={`p-2 rounded-sm border-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center relative overflow-hidden ${
                                appColor === key 
                                  ? 'bg-slate-800 border-slate-500 shadow-lg' 
                                  : 'bg-slate-950/50 border-transparent hover:border-slate-800'
                              }`}
                              style={{ borderColor: appColor === key ? col.hex : undefined }}
                              title={col.name}
                            >
                              <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: col.hex }} />
                              <span className="text-[8px] font-black uppercase tracking-normal text-slate-300">
                                {key === 'orange' ? 'AMBER' : key.toUpperCase()}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2">
                        <button 
                          onClick={() => { setShowAdminPanel(true); setShowAbout(false); }} 
                          className={`w-full py-3 ${themeMode === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} text-[8px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2`}
                        >
                          <ShieldCheck className="w-3 h-3" /> {t.adminArea}
                        </button>
                      </div>

                      <div className="pt-1">
                        <button 
                          onClick={() => { setShowFreeCodeModal(true); setShowAbout(false); }} 
                          className={`w-full py-3 ${themeMode === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} text-[8px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2`}
                        >
                          <Key className="w-3 h-3" /> FREE
                        </button>
                      </div>
                  </div>
                  <div className={`p-6 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300'} border-t-2`}><button onClick={() => setShowAbout(false)} className={`w-full py-3.5 ${themeMode === 'dark' ? 'bg-white text-black' : 'bg-black text-white'} font-black text-[12px] uppercase tracking-[0.2em]`}>{t.close}</button></div>
              </div>
          </div>
      )}

      {showExportExcelModal && (
          <div className="fixed inset-0 z-[1200] bg-slate-900/85 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowExportExcelModal(false)}>
              <div className="bg-slate-900 border-slate-700 border-4 max-w-md w-full shadow-2xl flex flex-col transition-all rounded-sm" onClick={(e) => e.stopPropagation()}>
                  <div className="px-5 py-4 bg-slate-800 border-slate-700 border-b-2 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-bold text-sm uppercase tracking-widest text-slate-100">
                        {language === 'sv' ? "Exportera till Excel" : "Export to Excel"}
                      </h3>
                    </div>
                    <button onClick={() => setShowExportExcelModal(false)}>
                      <X className="w-6 h-6 text-slate-500 hover:text-slate-300" />
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh] custom-scrollbar">
                    <p className="text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">
                      {language === 'sv' 
                        ? "Välj vilka mått du vill inkludera i exporten. Varje mått skapas på en egen flik i samma Excel-fil." 
                        : "Select which metrics you want to include in the export. Each metric will be placed on its own sheet in the same Excel file."}
                    </p>
                    
                    <div className="space-y-2">
                      {measures.map((m, idx) => {
                        const hasStats = !!m.stats;
                        const isChecked = exportSelectedMeasureIds.includes(m.id);
                        const displayName = m.name?.trim() || (language === 'sv' ? `Mått ${idx + 1}` : `Measure ${idx + 1}`);
                        
                        return (
                          <label 
                            key={m.id} 
                            className={`flex items-start gap-3 p-3 border-2 rounded-sm transition-all cursor-pointer ${
                              !hasStats 
                                ? 'border-slate-800 opacity-50 bg-slate-950/20 cursor-not-allowed' 
                                : isChecked 
                                ? 'border-emerald-500 bg-emerald-500/5' 
                                : 'border-slate-700 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/60'
                            }`}
                          >
                            <input 
                              type="checkbox"
                              disabled={!hasStats}
                              checked={isChecked}
                              onChange={() => {
                                if (!hasStats) return;
                                if (isChecked) {
                                  setExportSelectedMeasureIds(prev => prev.filter(id => id !== m.id));
                                } else {
                                  setExportSelectedMeasureIds(prev => [...prev, m.id]);
                                }
                              }}
                              className="mt-0.5 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 bg-slate-800"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-black text-slate-100 block truncate uppercase tracking-wide">
                                {displayName}
                              </span>
                              {!hasStats ? (
                                <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-500 block">
                                  {language === 'sv' ? "Saknar statistik (analysera först)" : "No analysis (run calculation first)"}
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                                  {language === 'sv' 
                                    ? `Värden: ${m.data.length} st • Status: Klar` 
                                    : `Samples: ${m.data.length} • Status: Ready`}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="p-5 border-t-2 border-slate-700 bg-slate-800 flex gap-3">
                    <button 
                      onClick={() => setShowExportExcelModal(false)}
                      className="flex-1 py-3 border-2 border-slate-600 text-slate-300 font-bold text-xs uppercase tracking-widest hover:bg-slate-700 transition-all rounded-sm"
                    >
                      {language === 'sv' ? "Avbryt" : "Cancel"}
                    </button>
                    <button 
                      onClick={() => {
                        setShowExportExcelModal(false);
                        runExcelExport(exportSelectedMeasureIds);
                      }}
                      disabled={exportSelectedMeasureIds.length === 0}
                      className={`flex-1 py-3 text-white font-black text-xs uppercase tracking-widest transition-all rounded-sm cursor-pointer ${
                        exportSelectedMeasureIds.length === 0 
                          ? 'bg-slate-700 opacity-50 cursor-not-allowed' 
                          : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/40 active:scale-[0.98]'
                      }`}
                    >
                      {language === 'sv' ? "Exportera" : "Export"}
                    </button>
                  </div>
              </div>
          </div>
      )}

      {(showTerms || showPrivacy || showChangelog) && (
          <div className="fixed inset-0 z-[2000] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 shadow-[0_0_100px_rgba(0,0,0,0.8)]" onClick={() => { setShowTerms(false); setShowPrivacy(false); setShowChangelog(false); }}>
              <div className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-black'} border-4 max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh] text-left`} onClick={(e) => e.stopPropagation()}>
                  <div className={`px-5 py-4 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'} border-b-2 flex justify-between items-center shrink-0`}>
                    <h3 className={`font-bold text-sm uppercase tracking-widest ${themeMode === 'dark' ? 'text-slate-100' : 'text-black'}`}>
                      {showTerms ? t.termsTitle : showPrivacy ? t.privacyTitle : (language === 'sv' ? 'Versionshistorik' : 'Changelog')}
                    </h3>
                    <button onClick={() => { setShowTerms(false); setShowPrivacy(false); setShowChangelog(false); }}><X className="w-6 h-6 text-slate-500" /></button>
                  </div>
                  <div className={`p-8 overflow-y-auto text-sm leading-relaxed ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-800'}`}>
                    {showChangelog ? (
                      <div className="space-y-4">
                        <h4 className={`font-black text-xs uppercase tracking-widest flex items-center gap-2 ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                          <span>ℹ️</span> {language === 'sv' ? 'DIGICAP® SYSTEMÄNDRINGSLOGG' : 'DIGICAP® SYSTEM CHANGELOG'}
                        </h4>
                        
                        <div className="flex flex-col gap-5 leading-relaxed text-[11px] font-bold">
                          <div className={`border-b ${themeMode === 'dark' ? 'border-slate-850' : 'border-slate-200'} pb-3`}>
                            <strong className={`${themeMode === 'dark' ? 'text-white' : 'text-black'} block text-xs`}>v1.5.1 (Aktuell version)</strong>
                            <ul className="list-disc pl-5 mt-1 space-y-1 opacity-80 font-medium">
                              <li>Stöd för valbart SPC-regelverk för stabilitetsgränser i inställningarna: IATF 16949 / VDA (7 i följd), ISO 7870-2 (8 i följd) samt AIAG / Nelson (9 i följd).</li>
                            </ul>
                          </div>
                          <div className={`border-b ${themeMode === 'dark' ? 'border-slate-850' : 'border-slate-200'} pb-3`}>
                            <strong className={`${themeMode === 'dark' ? 'text-white' : 'text-black'} block text-xs`}>v1.5.0</strong>
                            <ul className="list-disc pl-5 mt-1 space-y-1 opacity-80 font-medium">
                              <li>Möjlighet till rapportkommentar/fritext som inkluderas i PDF-exporten.</li>
                              <li>Processutvärdering med I-MR Nelson-regler (stabilitet) och varningar om instabil process.</li>
                              <li>Normalfördelningskontroll med numerisk skevhet och kurtosis samt handlingsrekommendationer.</li>
                              <li>Säkerställd verifiering och versionshistorik i rapportfooter.</li>
                            </ul>
                          </div>
                          <div className={`border-b ${themeMode === 'dark' ? 'border-slate-850' : 'border-slate-200'} pb-3`}>
                            <strong className={`${themeMode === 'dark' ? 'text-white' : 'text-black'} block text-xs`}>v1.4.0</strong>
                            <ul className="list-disc pl-5 mt-1 space-y-1 opacity-80 font-medium">
                              <li>Layout-justeringar för A4-utskrift och PDF-marginaler.</li>
                              <li>Stöd för varumärkesregistrering (®) och varumärkesgrafik i hög upplösning.</li>
                            </ul>
                          </div>
                          <div className={`border-b ${themeMode === 'dark' ? 'border-slate-850' : 'border-slate-200'} pb-3`}>
                            <strong className={`${themeMode === 'dark' ? 'text-white' : 'text-black'} block text-xs`}>v1.3.0</strong>
                            <ul className="list-disc pl-5 mt-1 space-y-1 opacity-80 font-medium">
                              <li>Flerspråkigt gränssnitt (svenska, engelska m.fl.) med dynamisk växling.</li>
                              <li>Interaktiv processguide för duglighetsindex och prestandaindex.</li>
                            </ul>
                          </div>
                          <div className={`border-b ${themeMode === 'dark' ? 'border-slate-850' : 'border-slate-200'} pb-3`}>
                            <strong className={`${themeMode === 'dark' ? 'text-white' : 'text-black'} block text-xs`}>v1.2.0</strong>
                            <ul className="list-disc pl-5 mt-1 space-y-1 opacity-80 font-medium">
                              <li>Integration med Firebase Firestore för molnbaserade Pro-licenser och orderkopplingar.</li>
                              <li>Säkerställd telemetri och serverloggning av statistiska analyser.</li>
                            </ul>
                          </div>
                          <div className={`border-b ${themeMode === 'dark' ? 'border-slate-850' : 'border-slate-200'} pb-3`}>
                            <strong className={`${themeMode === 'dark' ? 'text-white' : 'text-black'} block text-xs`}>v1.1.0</strong>
                            <ul className="list-disc pl-5 mt-1 space-y-1 opacity-80 font-medium">
                              <li>Stöd för icke-normalfördelade parametriska modeller (Weibull, LogNormal, m.fl.) via ISO 22514-2.</li>
                            </ul>
                          </div>
                          <div className={`pt-3 text-center text-[10px] opacity-60`}>
                            Utvecklad och validerad i samarbete med MI Qvalitetsutbildningar AB.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 prose max-w-none">
                        <ReactMarkdown>{showTerms ? t.termsFull : t.privacyFull}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                  <div className={`p-6 ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border-t-2 shrink-0`}><button onClick={() => { setShowTerms(false); setShowPrivacy(false); setShowChangelog(false); }} className={`w-full py-3 ${themeMode === 'dark' ? 'bg-white text-black' : 'bg-black text-white'} font-black text-[12px] uppercase tracking-widest`}>{t.okBtn}</button></div>
              </div>
          </div>
      )}

      {showAdminPanel && (
        <div className="fixed inset-0 z-[700] bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-4 border-slate-800 w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-800 border-b-2 border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                <h3 
                  onClick={() => setMasterModeCount(prev => prev + 1)}
                  className="font-bold text-sm uppercase tracking-widest text-white cursor-default select-none"
                >
                  Admin Panel
                </h3>
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
                  autoFocus
                  value={adminPasswordInput}
                  onChange={(e) => {
                    setAdminPasswordInput(e.target.value);
                    if (adminError) setAdminError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  placeholder="••••"
                  className="bg-slate-950 border-2 border-slate-800 text-white text-center text-2xl font-black tracking-[0.5em] py-4 w-48 focus:border-blue-500 outline-none transition-all"
                />
                {adminError && (
                  <div className="text-red-500 text-[10px] uppercase font-bold tracking-widest animate-pulse max-w-[250px] text-center">
                    {adminError}
                  </div>
                )}
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleAdminLogin();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs uppercase tracking-[0.2em] px-8 py-4 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Authorize
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-5 bg-blue-900/20 border-b-2 border-blue-500/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/30 rounded-full flex items-center justify-center border border-blue-500/50">
                        <Key className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="font-black text-[11px] text-white uppercase tracking-widest leading-none">System Sovereignty</h4>
                        <p className="text-[9px] text-blue-400 font-bold uppercase tracking-tight mt-1">Master Access Console</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleMasterAuthorize}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-sm shadow-lg shadow-amber-900/40 flex items-center gap-2 transition-all active:scale-95"
                    >
                      <Sparkles className="w-4 h-4" /> MASTERÖPPNING
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center flex-wrap gap-2">
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setAdminTab('licenses')}
                      className={`text-[10px] font-black uppercase tracking-widest ${adminTab === 'licenses' ? 'text-blue-500' : 'text-slate-500'}`}
                    >
                      Active Licenses ({activeLicenses.length})
                    </button>
                    <button 
                      onClick={() => setAdminTab('logs')}
                      className={`text-[10px] font-black uppercase tracking-widest ${adminTab === 'logs' ? 'text-blue-500' : 'text-slate-500'}`}
                    >
                      Raw Logs ({webhookLogs.length})
                    </button>
                    <button 
                      onClick={() => setAdminTab('activity')}
                      className={`text-[10px] font-black uppercase tracking-widest ${adminTab === 'activity' ? 'text-blue-500' : 'text-slate-500'}`}
                    >
                      User Activity ({userActivities.length})
                    </button>
                    <button 
                      onClick={() => setAdminTab('logos')}
                      className={`text-[10px] font-black uppercase tracking-widest ${adminTab === 'logos' ? 'text-blue-500' : 'text-slate-500'}`}
                    >
                      Logotyper
                    </button>
                  </div>
                  <button onClick={fetchWebhookLogs} disabled={isLoadingLogs} className="text-blue-500 hover:text-blue-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>
                
                {/* Admin Live Search Console */}
                <div className="p-3 bg-slate-900 border-b border-slate-800">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="SÖK EFTER E-POST, STATUS, ORDER ID, NYCKEL ELLER PRODUKT..." 
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-[9px] uppercase tracking-widest font-bold px-3 py-2 rounded-sm focus:outline-none focus:border-blue-500 placeholder-slate-700"
                    />
                    {adminSearch && (
                      <button 
                        onClick={() => setAdminSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-[9px] font-black uppercase"
                      >
                        [Rensa]
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {adminTab === 'activity' ? (
                    (() => {
                      const filteredActivities = userActivities.filter(act => 
                        !adminSearch ||
                        act.email?.toLowerCase().includes(adminSearch.toLowerCase()) || 
                        act.action?.toLowerCase().includes(adminSearch.toLowerCase()) ||
                        JSON.stringify(act.details || {}).toLowerCase().includes(adminSearch.toLowerCase())
                      );

                      return filteredActivities.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 py-8">
                          <Clock className="w-8 h-8 opacity-20" />
                          <p className="text-[10px] font-black uppercase tracking-widest">No activities match search</p>
                        </div>
                      ) : (
                        filteredActivities.map((act, i) => (
                          <div key={i} className="bg-slate-950 border border-slate-800 p-4 rounded-sm space-y-2">
                            <div className="flex justify-between items-start gap-4">
                              <span className="bg-amber-950/30 text-amber-500 text-[9px] font-black px-2 py-0.5 uppercase tracking-widest rounded-full border border-amber-800/40">
                                {act.action}
                              </span>
                              <span className="text-slate-600 text-[9px] font-mono">
                                {new Date(act.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs text-slate-200 font-bold break-all">{act.email}</div>
                            {act.details && Object.keys(act.details).length > 0 && (
                              <div className="bg-slate-900/50 border border-slate-900 p-2 rounded-sm text-[8px] font-mono text-slate-400 space-y-1">
                                {Object.entries(act.details).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-slate-600 uppercase font-bold">{key}:</span>
                                    <span className="text-blue-400 font-bold">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      );
                    })()
                  ) : adminTab === 'logs' ? (
                    (() => {
                      const filteredLogs = webhookLogs.filter(log => 
                        !adminSearch ||
                        log.email?.toLowerCase().includes(adminSearch.toLowerCase()) || 
                        log.eventName?.toLowerCase().includes(adminSearch.toLowerCase()) || 
                        log.status?.toLowerCase().includes(adminSearch.toLowerCase()) || 
                        log.variant?.toLowerCase().includes(adminSearch.toLowerCase())
                      );
                      
                      return filteredLogs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 py-8">
                          <WifiOff className="w-8 h-8 opacity-20" />
                          <p className="text-[10px] font-black uppercase tracking-widest">No logs match search</p>
                        </div>
                      ) : (
                        filteredLogs.map((log, i) => (
                          <div key={i} className="bg-slate-950 border border-slate-800 p-4 space-y-2">
                            <div className="flex justify-between items-start">
                              <span className="bg-blue-900/30 text-blue-400 text-[9px] font-black px-2 py-0.5 uppercase tracking-widest rounded-full border border-blue-800/50">
                                {log.eventName}
                              </span>
                              <span className="text-slate-600 text-[9px] font-mono">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs text-slate-300 font-bold">{log.email}</div>
                            {log.user_name && (
                              <div className="text-[9px] text-slate-400 font-bold">
                                Customer: {log.user_name}
                              </div>
                            )}
                            {log.variant && (
                              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                Product: {log.variant}
                              </div>
                            )}
                            {log.country && (
                              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                Land: {getCountryFlagAndName(log.country, log.country_name)}
                              </div>
                            )}
                          </div>
                        ))
                      );
                    })()
                  ) : adminTab === 'logos' ? (
                    <div className="space-y-6 py-2">
                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-sm space-y-2">
                        <h4 className="text-white font-black text-xs uppercase tracking-widest">Hämta digitala logotyper</h4>
                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider leading-relaxed">
                          Här hittar du de färdigbehandlade logotyperna i vitt utförande med elegant marinblå bakgrund, redo att sparas, bäddas in eller skickas för externa granskningar.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* SVG Vektor */}
                        <div className="bg-slate-950 border border-slate-800 p-4 rounded-sm flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            <span className="bg-blue-950/40 text-blue-400 text-[9px] font-black px-2 py-0.5 uppercase tracking-widest rounded-full border border-blue-800/40 inline-block">
                              SVG format
                            </span>
                            <div className="text-xs text-white font-black">digicap_console_logo.svg</div>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Vektor-format. Bäst för framtida tryck eller obegränsad skalning.</p>
                            
                            <div className="border border-slate-800 bg-[#081427] aspect-square w-full rounded flex items-center justify-center p-4">
                              <img src="/digicap_console_logo.svg?v=2" alt="DigiCap SVG" className="max-h-36 object-contain" referrerPolicy="no-referrer" />
                            </div>
                          </div>
                          <a 
                            href="/digicap_console_logo.svg" 
                            download="digicap_console_logo.svg" 
                            className="bg-blue-600 hover:bg-blue-700 text-white font-black text-center text-[10px] uppercase tracking-widest py-3 rounded-sm transition-all focus:outline-none"
                          >
                            Ladda ner SVG
                          </a>
                        </div>

                        {/* PNG Högupplöst */}
                        <div className="bg-slate-950 border border-slate-800 p-4 rounded-sm flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            <span className="bg-emerald-950/40 text-emerald-400 text-[9px] font-black px-2 py-0.5 uppercase tracking-widest rounded-full border border-emerald-800/40 inline-block">
                              PNG format
                            </span>
                            <div className="text-xs text-white font-black">digicap_console_logo.png</div>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Högupplöst 512x512 bild. Bra för dokumentationer & webb.</p>
                            
                            <div className="border border-slate-800 bg-[#081427] aspect-square w-full rounded flex items-center justify-center p-4">
                              <img src="/digicap_console_logo.png?v=2" alt="DigiCap PNG" className="max-h-36 object-contain" referrerPolicy="no-referrer" />
                            </div>
                          </div>
                          <a 
                            href="/digicap_console_logo.png" 
                            download="digicap_console_logo.png" 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-center text-[10px] uppercase tracking-widest py-3 rounded-sm transition-all focus:outline-none"
                          >
                            Ladda ner PNG
                          </a>
                        </div>

                        {/* JPEG Standard */}
                        <div className="bg-slate-950 border border-slate-800 p-4 rounded-sm flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            <span className="bg-amber-950/40 text-amber-500 text-[9px] font-black px-2 py-0.5 uppercase tracking-widest rounded-full border border-amber-800/40 inline-block">
                              JPG format
                            </span>
                            <div className="text-xs text-white font-black">digicap_console_logo.jpg</div>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Standard JPEG-fil 512x512 bild. Bäst för maximal kompatibilitet.</p>
                            
                            <div className="border border-slate-800 bg-[#081427] aspect-square w-full rounded flex items-center justify-center p-4">
                              <img src="/digicap_console_logo.jpg?v=2" alt="DigiCap JPG" className="max-h-36 object-contain" referrerPolicy="no-referrer" />
                            </div>
                          </div>
                          <a 
                            href="/digicap_console_logo.jpg" 
                            download="digicap_console_logo.jpg" 
                            className="bg-amber-600 hover:bg-amber-700 text-black font-black text-center text-[10px] uppercase tracking-widest py-3 rounded-sm transition-all focus:outline-none"
                          >
                            Ladda ner JPG
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const filteredLicenses = activeLicenses.filter(lic => {
                        if (!adminSearch) return true;
                        const query = adminSearch.toLowerCase();
                        return (
                          lic.email?.toLowerCase().includes(query) || 
                          lic.status?.toLowerCase().includes(query) || 
                          lic.variant_name?.toLowerCase().includes(query) || 
                          (lic.order_id || lic.orderId)?.toString().toLowerCase().includes(query) ||
                          lic.license_key?.toLowerCase().includes(query) ||
                          lic.user_name?.toLowerCase().includes(query) ||
                          lic.country?.toLowerCase().includes(query) ||
                          lic.country_name?.toLowerCase().includes(query)
                        );
                      });

                      return filteredLicenses.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 py-8">
                          <Users className="w-8 h-8 opacity-20" />
                          <p className="text-[10px] font-black uppercase tracking-widest">No licenses match search</p>
                        </div>
                      ) : (
                        filteredLicenses.map((license, i) => (
                          <div key={i} className="bg-slate-950 border border-slate-800 p-4 rounded-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start gap-4">
                              <div className="space-y-1">
                                <div className="text-xs text-white font-black break-all">{license.email}</div>
                                {license.user_name && (
                                  <div className="text-[10px] text-slate-300 font-bold">
                                    Name: {license.user_name}
                                  </div>
                                )}
                                {license.variant_name && (
                                  <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest">
                                    {license.variant_name}
                                  </div>
                                )}
                                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none">
                                  Updated: {new Date(license.updatedAt).toLocaleDateString()} {new Date(license.updatedAt).toLocaleTimeString()}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className={`text-[9px] font-black px-2 py-0.5 uppercase tracking-widest rounded-full border ${(['active', 'on_trial', 'subscribed'].includes(license.status)) ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40' : 'bg-rose-950/40 text-rose-400 border-rose-800/40'}`}>
                                  {license.status}
                                </span>
                                {license.last_event && (
                                  <span className="text-[8px] text-slate-600 uppercase tracking-widest font-black">
                                    {license.last_event.replace(/_/g, ' ')}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-900 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[9px]">
                              <div>
                                <span className="text-slate-600 font-black uppercase tracking-widest block mb-0.5">Order ID</span>
                                {license.order_id || license.orderId ? (
                                  <span className="text-blue-400 font-mono">
                                    #{license.order_id || license.orderId}
                                  </span>
                                ) : (
                                  <span className="text-slate-700 font-mono">N/A</span>
                                )}
                              </div>
                              <div>
                                <span className="text-slate-600 font-black uppercase tracking-widest block mb-0.5">License Key</span>
                                {license.license_key ? (
                                  <div className="text-slate-400 font-mono select-all">
                                    {license.license_key}
                                  </div>
                                ) : (
                                  <span className="text-slate-700 font-mono">N/A</span>
                                )}
                              </div>
                              <div>
                                <span className="text-slate-600 font-black uppercase tracking-widest block mb-0.5">Land / Country</span>
                                {license.country ? (
                                  <span className="text-slate-300 font-bold">
                                    {getCountryFlagAndName(license.country, license.country_name)}
                                  </span>
                                ) : (
                                  <span className="text-slate-700">N/A</span>
                                )}
                              </div>
                              <div>
                                <span className="text-slate-600 font-black uppercase tracking-widest block mb-0.5">Betalmetod</span>
                                {license.card_brand ? (
                                  <span className="text-slate-300 font-bold uppercase">
                                    {license.card_brand} {license.card_last_four ? `(•••• ${license.card_last_four})` : ''}
                                  </span>
                                ) : (
                                  <span className="text-slate-700">N/A</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      );
                    })()
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

      {showGame && !isTeaserMode && (
        <Suspense fallback={null}>
          <HitTheMeanGame 
            language={language} 
            onClose={() => setShowGame(false)} 
            isTeaserMode={isTeaserMode}
          />
        </Suspense>
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
    </div>
      )}
    </>
  );
};

export default App;
