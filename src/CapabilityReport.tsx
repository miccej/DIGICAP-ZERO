
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
  ComposedChart, 
  Bar, 
  Area,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  Activity, Sigma, 
  Target as TargetIcon, 
  BarChart2, ShieldCheck, 
  Zap, Calendar,
  TrendingUp
} from 'lucide-react';
import { Statistics, ProcessLimits, HistogramBin, DistributionType, Measure, AppTheme, StudyInfo, MeasurementData } from './types';
import { Language, translations } from './locales';
import * as DistMath from './distributionMath';

interface CapabilityReportProps {
  stats: Statistics;
  limits: ProcessLimits;
  histogramData: HistogramBin[];
  studyInfo: StudyInfo;
  language: Language;
  onExportPdf?: () => void;
  isPdfExporting?: boolean;
  distribution: DistributionType;
  overlayMeasures?: Measure[];
  rawData?: MeasurementData[];
  calculationMethod?: 'serial' | 'within';
  subgroupSize?: number;
  theme?: AppTheme;
  spcRule?: 'IATF' | 'AIAG' | 'ISO';
  themeColor?: {
    name: string;
    primary: string;
    logo: string;
    newStudy: string;
    activeTab: string;
    border: string;
    text: string;
    icon: string;
    hex: string;
    stroke: string;
    lightBg: string;
    lightBorder: string;
    darkText: string;
  };
  themeMode?: 'light' | 'dark';
}

// Static PDF helper functions removed, using DistMath instead

const StatCard: React.FC<{ 
  label: string; 
  value: string; 
  subtext?: string; 
  icon?: React.ReactNode;
  iconColor?: string;
  themeColor?: any;
  themeMode?: 'light' | 'dark';
  isPdfExporting?: boolean;
}> = ({ label, value, subtext, icon, iconColor, themeColor, themeMode = 'light', isPdfExporting }) => {
  const borderColor = themeColor?.hex || '#f59e0b';
  const textColor = themeColor?.hex || '#f59e0b';

  // Force light theme colors for report
  const bgColor = '#ffffff';
  const cardBorder = `2px solid ${borderColor}`;
  const labelColor = '#000000';
  const valueColor = '#000000';
  const subtextColor = '#475569';

  return (
    <div 
      className={`m-[0.4%] p-1.5 min-h-[55px] text-left shadow-sm box-border relative inline-block align-top ${isPdfExporting ? 'w-[24%]' : 'w-[48%] sm:w-[24%]'}`}
      style={{ 
        backgroundColor: bgColor,
        border: cardBorder,
      }}
    >
      <div style={{ position: 'relative', height: '100%' }}>
        <div style={{ color: labelColor, fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '2px' }}>
          {label}
        </div>
        <div style={{ fontSize: '18px', fontWeight: '900', color: valueColor, fontFamily: 'monospace', marginBottom: '2px' }}>
          {value}
        </div>
        {subtext && (
          <div style={{ fontSize: '9px', fontWeight: '700', color: subtextColor, textTransform: 'uppercase' }}>
            {subtext}
          </div>
        )}
        <div style={{ position: 'absolute', top: '0', right: '0', opacity: 0.3, color: iconColor }}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const FatBar = (props: any) => {
  const { x, y, width, height, fill, stroke, payload, barWidthPx } = props;
  if (!height || isNaN(height) || height <= 0 || isNaN(x) || isNaN(y)) return null;
  const actualWidth = (barWidthPx || width || 0) * 0.95; 
  const adjustedX = x - (actualWidth / 2);
  const barFill = payload?.isOutOfSpec ? '#ef4444' : fill;
  const barStroke = payload?.isOutOfSpec ? '#991b1b' : stroke;
  return (
    <rect 
      x={adjustedX} 
      y={y} 
      width={Math.max(0, actualWidth)} 
      height={Math.max(0, height)} 
      fill={barFill} 
      stroke={barStroke} 
      strokeWidth={1} 
      fillOpacity={0.85} 
    />
  );
};

const CapabilityReportInner: React.FC<CapabilityReportProps> = ({ 
  stats, limits, histogramData, studyInfo, language, distribution, overlayMeasures,
  rawData, calculationMethod, subgroupSize, theme, themeColor, themeMode = 'light', isPdfExporting, spcRule = 'IATF'
}) => {
  const t = translations[language];
  const isOverlay = !!overlayMeasures && overlayMeasures.length > 0;
  const colors = ['#f59e0b', '#6366f1', '#ec4899', '#10b981', '#ef4444', '#06b6d4'];
  const [showTrendChart, setShowTrendChart] = useState(true);
  
  const isWithin = calculationMethod === 'within';

  // Load and save comment based on study and limits to ensure uniqueness
  const storageKey = useMemo(() => {
    return `digicap_comment_${studyInfo.partNumber || ''}_${limits.lsl || ''}_${limits.usl || ''}`;
  }, [studyInfo.partNumber, limits.lsl, limits.usl]);

  const [comment, setComment] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    setComment(saved || '');
  }, [storageKey]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setComment(val);
    localStorage.setItem(storageKey, val);
  };

  // Stability Check using I-MR Nelson Rules on rawData
  const stabilityCheck = useMemo(() => {
    if (!rawData || rawData.length < 2) return { isStable: true, violations: [] as string[], ucl: 0, lcl: 0 };
    const values = rawData.map(d => d.value);
    const n = values.length;
    const violations: string[] = [];
    
    // Choose appropriate sigma (sigmaWithin for Process, stdDev for others)
    const activeSigma = isWithin || studyInfo.studyType === 'Process' ? stats.sigmaWithin : stats.stdDev;
    
    if (activeSigma === 0) return { isStable: true, violations: [] as string[], ucl: stats.mean, lcl: stats.mean };

    // UCL and LCL of Individual Control Chart
    const ucl = stats.mean + 3 * activeSigma;
    const lcl = stats.mean - 3 * activeSigma;

    // Rule 1: Point outside 3-sigma limits
    const outOfSpecIndex: number[] = [];
    values.forEach((v, idx) => {
      if (v > ucl || v < lcl) {
        outOfSpecIndex.push(idx + 1);
      }
    });
    if (outOfSpecIndex.length > 0) {
      violations.push(language === 'sv'
        ? `${outOfSpecIndex.length} st mätvärde(n) utanför 3-sigma styrgränser [${lcl.toFixed(4)} - ${ucl.toFixed(4)}]: Prov nr ${outOfSpecIndex.join(', ')}`
        : `${outOfSpecIndex.length} measurement(s) outside 3-sigma control limits [${lcl.toFixed(4)} - ${ucl.toFixed(4)}]: Sample #${outOfSpecIndex.join(', ')}`
      );
    }

    // Rule 2: 7, 8 or 9 consecutive points on the same side of the mean
    const rule2Limit = spcRule === 'IATF' ? 7 : spcRule === 'ISO' ? 8 : 9;
    let sameSideCount = 0;
    let prevSide = 0; // -1, 1, 0
    const rule2Indices: number[] = [];
    for (let i = 0; i < n; i++) {
      const currentSide = values[i] > stats.mean ? 1 : values[i] < stats.mean ? -1 : 0;
      if (currentSide === 0) {
        sameSideCount = 0;
        prevSide = 0;
      } else if (currentSide === prevSide) {
        sameSideCount++;
        if (sameSideCount >= rule2Limit) {
          rule2Indices.push(i + 1);
        }
      } else {
        sameSideCount = 1;
        prevSide = currentSide;
      }
    }
    if (rule2Indices.length > 0) {
      violations.push(language === 'sv'
        ? `${rule2Limit} eller fler mätvärden i följd på samma sida om medelvärdet (förskjutning i processläge, enligt ${spcRule}). Prov nr ${rule2Indices.join(', ')}`
        : `${rule2Limit} or more consecutive points on the same side of the mean (shift in process level, per ${spcRule}). Sample #${rule2Indices.join(', ')}`
      );
    }

    // Rule 3: 6 consecutive points steadily increasing or decreasing
    let trendCount = 1;
    let trendDirection = 0; // 1, -1
    const rule3Indices: number[] = [];
    for (let i = 1; i < n; i++) {
      const diff = values[i] - values[i - 1];
      if (diff > 0) {
        if (trendDirection === 1) {
          trendCount++;
        } else {
          trendCount = 2;
          trendDirection = 1;
        }
      } else if (diff < 0) {
        if (trendDirection === -1) {
          trendCount++;
        } else {
          trendCount = 2;
          trendDirection = -1;
        }
      } else {
        trendCount = 1;
        trendDirection = 0;
      }
      if (trendCount >= 6) {
        rule3Indices.push(i + 1);
      }
    }
    if (rule3Indices.length > 0) {
      violations.push(language === 'sv'
        ? `Systematisk trend: 6 eller fler mätvärden i följd som ständigt ökar eller minskar. Prov nr ${rule3Indices.join(', ')}`
        : `Systematic trend: 6 or more consecutive points steadily increasing or decreasing. Sample #${rule3Indices.join(', ')}`
      );
    }

    return {
      isStable: violations.length === 0,
      violations,
      ucl,
      lcl
    };
  }, [rawData, stats.mean, stats.sigmaWithin, stats.stdDev, isWithin, studyInfo.studyType, language]);

  // Normality check using Skewness and Kurtosis
  const normalityCheck = useMemo(() => {
    const isNormal = Math.abs(stats.skewness) <= 1.0 && Math.abs(stats.kurtosis) <= 1.5;
    return {
      isNormal,
      skewness: stats.skewness,
      kurtosis: stats.kurtosis
    };
  }, [stats.skewness, stats.kurtosis]);

  const isStudyApproved = useMemo(() => {
    if (isOverlay && overlayMeasures) {
      return overlayMeasures.every(m => 
        m.stats && m.stats.outOfSpecCount === 0 && m.stats.cpk >= 1.67 && (m.stats.cp === null || m.stats.cp >= 1.67)
      );
    }
    return stats.outOfSpecCount === 0 && stats.cpk >= 1.67 && (stats.cp === null || stats.cp === undefined || stats.cp >= 1.67);
  }, [isOverlay, overlayMeasures, stats]);

  const activeTheme = themeColor || {
    hex: '#f59e0b',
    stroke: '#d97706',
    border: 'border-amber-500',
    text: 'text-amber-500'
  };
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) setChartWidth(containerRef.current.offsetWidth);
    };
    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const isZeroBounded = useMemo(() => 
    limits.lsl === 0 || (limits.toleranceType === 'upper' && (limits.target === 0 || limits.target === undefined)),
  [limits]);

  const displayPrecision = useMemo(() => {
    const getPrec = (n: number | undefined) => {
      if (n === undefined) return -1;
      const s = n.toString();
      const dot = s.indexOf('.');
      return dot === -1 ? 0 : s.length - dot - 1;
    };
    const pLsl = getPrec(limits.lsl);
    const pUsl = getPrec(limits.usl);
    const pTarget = getPrec(limits.target);
    const maxP = Math.max(pLsl, pUsl, pTarget);
    // Increase precision to at least 3 decimals for stats to avoid rounding confusion
    return Math.max(3, maxP + 1);
  }, [limits.lsl, limits.usl, limits.target]);

  const xDomain = useMemo(() => {
    const sigmaVisualRange = Math.max(stats.sigmaLevel, 3) + 1.5; 
    let points: number[] = [
      stats.mean - (sigmaVisualRange * stats.stdDev),
      stats.mean + (sigmaVisualRange * stats.stdDev)
    ];

    if (isOverlay && overlayMeasures) {
      overlayMeasures.forEach(m => {
        if (m.stats) {
          points.push(m.stats.mean - (sigmaVisualRange * m.stats.stdDev));
          points.push(m.stats.mean + (sigmaVisualRange * m.stats.stdDev));
        }
      });
    }

    if (limits.lsl !== undefined) points.push(limits.lsl);
    if (limits.usl !== undefined) points.push(limits.usl);
    if (limits.target !== undefined) points.push(limits.target);
    
    const cleanPoints = points.filter(p => p !== undefined && p !== null && !isNaN(p) && isFinite(p));
    if (cleanPoints.length === 0) return [0, 100]; // Fallback domain
    
    const minP = Math.min(...cleanPoints);
    const maxP = Math.max(...cleanPoints);
    const range = maxP - minP;
    const padding = range === 0 ? 1 : range * 0.1;
    
    let domainMin = minP - padding;
    let domainMax = maxP + padding;

    if (isZeroBounded && domainMin < 0) domainMin = -range * 0.03; // Small negative padding to see the 0 line
    return [domainMin, domainMax];
  }, [limits, stats, isOverlay, overlayMeasures, isZeroBounded]);

  const barWidthPx = useMemo(() => {
    if (chartWidth <= 0 || histogramData.length < 1) return 30;
    const [dMin, dMax] = xDomain;
    const domainRange = dMax - dMin;
    const binWidthValue = histogramData.length > 1 
        ? histogramData[1].midPoint - histogramData[0].midPoint 
        : domainRange / (histogramData.length || 10);
    
    // Safety guard for division by zero
    if (domainRange <= 0) return 30;
    const effectiveWidth = Math.max(10, chartWidth - 100); 
    const pixelsPerUnit = effectiveWidth / domainRange;
    return Math.max(8, (binWidthValue * pixelsPerUnit));
  }, [chartWidth, histogramData, xDomain]);

  const combinedData = useMemo(() => {
    const [dMin, dMax] = xDomain;
    const numCurvePoints = 120; 
    const step = (dMax - dMin) / (numCurvePoints - 1);
    let binWidth = 1;
    if (histogramData.length > 1) {
      binWidth = histogramData[1].midPoint - histogramData[0].midPoint;
    } else if (histogramData.length === 1) {
      binWidth = (dMax - dMin) / 10;
    }
    
    // Safety guard to avoid NaN in scaling
    const safeBinWidth = Math.max(0.000001, binWidth);
    const scalingFactor = stats.sampleSize * safeBinWidth;

    // Estimate params for non-normal if needed
    const values = rawData?.map(d => d.value) || [];
    const normSigma = (calculationMethod === 'within' ? (stats.sigmaWithin ?? stats.stdDev) : stats.stdDev) || 0.0001;
    const logNormalParams = DistMath.estimateLogNormalParams(values);
    const weibullParams = DistMath.estimateWeibullParams(values);
    const rayleighParams = DistMath.estimateRayleighParams(values);

    const points: any[] = [];
    for (let i = 0; i < numCurvePoints; i++) {
      const x = dMin + i * step;
      const point: any = { midPoint: x };

      if (!isOverlay) {
        // Calculate all curves for background visual reference
        const cNorm = DistMath.normalPDF(x, stats.mean, normSigma);
        const cLog = DistMath.logNormalPDF(x, logNormalParams.mu, logNormalParams.sigma);
        const cWei = DistMath.weibullPDF(x, weibullParams.shape, weibullParams.scale);
        const cRay = DistMath.rayleighPDF(x, rayleighParams.sigma);

        point.curveNormal = (isZeroBounded && x < 0 ? 0 : cNorm) * scalingFactor;
        point.curveLogNormal = (isZeroBounded && x < 0 ? 0 : cLog) * scalingFactor;
        point.curveWeibull = (isZeroBounded && x < 0 ? 0 : cWei) * scalingFactor;
        point.curveRayleigh = (isZeroBounded && x < 0 ? 0 : cRay) * scalingFactor;

        // The "actual" one being analyzed
        let curveVal = 0;
        if (distribution === 'Normal') curveVal = cNorm;
        else if (distribution === 'LogNormal') curveVal = cLog;
        else if (distribution === 'Weibull') curveVal = cWei;
        else if (distribution === 'Rayleigh') curveVal = cRay;
        else if (distribution === 'Folded') curveVal = DistMath.foldedNormalPDF(x, stats.mean, stats.stdDev);
        else curveVal = cNorm;
        
        point.actualCurve = (isZeroBounded && x < 0 ? 0 : curveVal) * scalingFactor;
      } else if (overlayMeasures) {
        overlayMeasures.forEach((m, idx) => {
          if (m.stats) {
            // Scale overlay curves to a common height for comparison
            const curveVal = DistMath.normalPDF(x, m.stats.mean, m.stats.stdDev) * 100;
            point[`curve_${idx}`] = isZeroBounded && x < 0 ? 0 : curveVal;
          }
        });
      }
      
      points.push(point);
    }
    if (!isOverlay) {
      histogramData.forEach(bin => {
          points.push({ midPoint: bin.midPoint, count: bin.count, isOutOfSpec: bin.isOutOfSpec });
      });
    }
    return points.sort((a, b) => a.midPoint - b.midPoint);
  }, [isOverlay, histogramData, stats, xDomain, distribution, overlayMeasures, isZeroBounded]);

  const trendYDomain = useMemo(() => {
    if (!rawData || rawData.length === 0) return ['auto', 'auto'];
    
    const values = rawData.map(d => d.value);
    let min = Math.min(...values);
    let max = Math.max(...values);
    
    if (limits.lsl !== undefined) min = Math.min(min, limits.lsl);
    if (limits.usl !== undefined) max = Math.max(max, limits.usl);
    if (limits.target !== undefined) {
      min = Math.min(min, limits.target);
      max = Math.max(max, limits.target);
    }
    
    const range = max - min;
    const padding = range === 0 ? 1 : range * 0.1;
    
    return [min - padding, max + padding];
  }, [rawData, limits]);

  const getCapLabels = (type: string) => {
    const isMachine = type === 'Machine';
    const isPerf = type === 'Performance';
    let sigmaLabel = isMachine ? t.sigmaST : isPerf ? t.sigmaTotal : t.sigmaW;
    
    if (isWithin && !isMachine && !isPerf) {
      sigmaLabel = `${t.sigmaW} (n=${subgroupSize})`;
    }

    return {
      cap: isMachine ? 'CM' : isPerf ? 'PP' : 'CP',
      capk: isMachine ? 'CMK' : isPerf ? 'PPK' : 'CPK',
      sigma: sigmaLabel
    };
  };

  const formatNum = (n: number | undefined | null, prec: number = 2) => {
    if (n === undefined || n === null || isNaN(n)) return '-';
    return n.toLocaleString('sv-SE', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: Math.max(2, prec) 
    });
  };

  return (
    <div 
      id="capability-report-content"
      className={`${isPdfExporting ? '' : 'mx-auto'} box-border relative`}
      style={{ 
        backgroundColor: '#ffffff', 
        color: '#000000', 
        border: isPdfExporting ? 'none' : `5px solid ${activeTheme.hex}`,
        width: isPdfExporting ? '170mm' : '100%',
        maxWidth: isPdfExporting ? '170mm' : '100%',
        padding: isPdfExporting ? '0mm 5mm 5mm 5mm' : '10px 20px 20px 20px',
        margin: '0',
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        display: 'block',
        minHeight: isPdfExporting ? '1130px' : 'auto',
        textAlign: 'left'
      }}
    >
      {/* Header Section */}
      <div style={{ borderBottom: `4px solid ${activeTheme.hex}`, paddingBottom: '5px', marginBottom: '8px', width: '100%' }}>
        <div style={{ width: '100%', marginBottom: '5px' }}>
          <div style={{ display: 'inline-block', width: '70%', verticalAlign: 'top' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', margin: '0', color: '#000000', letterSpacing: '-1px' }}>DIGICAP® {t.reportTitle}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>              <ShieldCheck style={{ width: '12px', height: '12px', color: !isStudyApproved ? '#ef4444' : '#000000' }} />
              <span style={{ fontSize: '9px', fontWeight: '900', color: !isStudyApproved ? '#ef4444' : '#000000', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {!isStudyApproved && stats.outOfSpecCount > 0 ? `${t.outlierTitle}: ${stats.outOfSpecCount} ${t.count}` : t.verifiedEngine}
              </span>
              <span style={{ 
                marginLeft: '10px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: !isStudyApproved ? '#fee2e2' : '#f1f5f9',
                color: !isStudyApproved ? '#ef4444' : '#000000',
                fontSize: '10px',
                fontWeight: '900',
                textTransform: 'uppercase'
              }}>
                {!isStudyApproved ? t.notApproved : t.approved}
              </span>

            </div>
            <p style={{ fontSize: '12px', fontWeight: '700', color: '#000000', textTransform: 'uppercase', margin: '2px 0 0 0' }}>
              {studyInfo.studyType} {t.reportTitle}
              {isWithin && <span style={{ marginLeft: '8px', color: '#000000' }}>({t.methodWithin} n={subgroupSize})</span>}
            </p>
          </div>
          <div style={{ display: 'inline-block', width: '30%', textAlign: 'right', verticalAlign: 'top', color: '#000000', fontSize: '11px', fontWeight: '900' }}>
            {studyInfo.date}
          </div>
        </div>
        
        <div 
          className="flex flex-wrap sm:flex-nowrap gap-y-2"
          style={{ 
            width: '100%', 
            display: 'flex', 
            flexWrap: isPdfExporting ? 'nowrap' : undefined 
          }}
        >
            {[
              { l: t.partNo, v: studyInfo.partNumber, icon: <Zap style={{ width: '12px', height: '12px' }} /> },
              { l: t.machineNo, v: studyInfo.machineNumber, icon: <TargetIcon style={{ width: '12px', height: '12px' }} /> },
              { l: t.performedBy + ' /' + t.sign, v: studyInfo.performedBy, icon: <ShieldCheck style={{ width: '12px', height: '12px' }} /> },
              { l: t.revision, v: studyInfo.revision, icon: <Calendar style={{ width: '12px', height: '12px' }} /> }
            ].map((item, i) => (
              <div 
                key={i} 
                className="w-[48%] sm:w-[24%]"
                style={{ 
                  display: 'inline-block', 
                  width: isPdfExporting ? '24%' : undefined, 
                  borderLeft: `1px solid #e2e8f0`, 
                  paddingLeft: '10px', 
                  boxSizing: 'border-box', 
                  verticalAlign: 'top' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}>
                  <span style={{ color: '#000000' }}>{item.icon}</span>
                  <span style={{ fontSize: '9px', fontWeight: '900', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.l}</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#000000', display: 'block' }}>{item.v || '-'}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Chart Section */}
      <div 
        className="mb-[10px] w-full box-border p-1 sm:p-[10px]"
        style={{ 
            border: `2px solid ${activeTheme.hex + '33'}`, 
            backgroundColor: '#ffffff', 
            width: isPdfExporting ? '130mm' : '100%',
            margin: isPdfExporting ? '0 auto 10px auto' : '0 0 15px 0'
        }}
      >
        <div ref={containerRef} style={{ height: '250px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={combinedData} margin={{ top: 65, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="midPoint" 
                type="number" 
                domain={xDomain} 
                tick={false}
                xAxisId={0}
                axisLine={{ stroke: activeTheme.hex, strokeWidth: 2 }}
              />
              <YAxis hide yAxisId={0} />
              
              {/* Only rendering the actual selected distribution curve to avoid visual confusion with other reference models */}

              {!isOverlay && (
                <Bar 
                  dataKey="count" 
                  fill={activeTheme.hex} 
                  fillOpacity={0.8} 
                  stroke="#000000" 
                  strokeWidth={0.5} 
                  shape={(props: any) => <FatBar {...props} barWidthPx={barWidthPx} />} 
                  isAnimationActive={false} 
                />
              )}
              {!isOverlay && <Area type="monotone" dataKey="actualCurve" stroke={activeTheme.stroke} strokeWidth={2.5} fill={activeTheme.hex} fillOpacity={0.2} dot={false} isAnimationActive={false} connectNulls />}
              
              {isOverlay && overlayMeasures?.map((m, idx) => (
                <Area 
                  key={m.id}
                  type="monotone" 
                  dataKey={`curve_${idx}`} 
                  stroke={colors[idx % colors.length]} 
                  strokeWidth={3} 
                  fill={colors[idx % colors.length]} 
                  fillOpacity={0.1} 
                  dot={false} 
                  isAnimationActive={false} 
                  connectNulls 
                  name={m.name || `M${idx + 1}`}
                />
              ))}
              
              {isOverlay && <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />}
              
              {limits.lsl !== undefined && <ReferenceLine xAxisId={0} x={limits.lsl} stroke="#ef4444" strokeWidth={2} label={{ position: 'top', value: `${t.lsl}: ${limits.lsl.toFixed(displayPrecision)}`, fontSize: 10, fill: '#000000', fontWeight: 900, dy: -5 }} />}
              {limits.usl !== undefined && <ReferenceLine xAxisId={0} x={limits.usl} stroke="#ef4444" strokeWidth={2} label={{ position: 'top', value: `${t.usl}: ${limits.usl.toFixed(displayPrecision)}`, fontSize: 10, fill: '#000000', fontWeight: 900, dy: -5 }} />}
              {limits.target !== undefined && <ReferenceLine xAxisId={0} x={limits.target} stroke="#000000" strokeWidth={1} strokeDasharray="5 5" label={{ position: 'bottom', value: `${t.targetLabel}: ${limits.target.toFixed(displayPrecision)}`, fontSize: 10, fill: '#000000', fontWeight: 900, dy: 15 }} />}
              {!isOverlay && (
                <>
                  <ReferenceLine xAxisId={0} x={stats.qLo} stroke="#000000" strokeWidth={1.5} strokeDasharray="3 3" label={{ position: 'top', value: distribution === 'Normal' ? `-${stats.sigmaLevel}σ` : 'Q(Lo)', fontSize: 9, fill: '#000000', fontWeight: 900, dy: -25 }} />
                  <ReferenceLine xAxisId={0} x={stats.qHi} stroke="#000000" strokeWidth={1.5} strokeDasharray="3 3" label={{ position: 'top', value: distribution === 'Normal' ? `+${stats.sigmaLevel}σ` : 'Q(Hi)', fontSize: 9, fill: '#000000', fontWeight: 900, dy: -25 }} />
                  <ReferenceLine xAxisId={0} x={stats.mean} stroke="#000000" strokeWidth={2} strokeDasharray="3 3" label={{ position: 'top', value: distribution === 'Normal' ? t.mean.toUpperCase() : 'MEDIAN', fontSize: 10, fill: '#000000', fontWeight: 900, dy: -45 }} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="w-full mb-2 text-center flex flex-wrap justify-center">
        {!isOverlay ? (
          <>
            <StatCard 
              label={getCapLabels(studyInfo.studyType).capk} 
              value={formatNum(stats.cpk, 3)} 
              subtext={`@ ±${stats.sigmaLevel}σ`} 
              icon={<ShieldCheck style={{ width: '18px', height: '18px' }} />} 
              iconColor={isStudyApproved ? '#000000' : '#ef4444'}
              themeColor={activeTheme} 
              themeMode={themeMode} 
              isPdfExporting={isPdfExporting} 
            />
            <StatCard 
              label={getCapLabels(studyInfo.studyType).cap} 
              value={formatNum(stats.cp, 3)} 
              subtext={studyInfo.studyType} 
              icon={<Activity style={{ width: '18px', height: '18px' }} />} 
              iconColor={stats.cp && stats.cp >= 1.67 && stats.outOfSpecCount === 0 ? '#000000' : '#ef4444'}
              themeColor={activeTheme} 
              themeMode={themeMode} 
              isPdfExporting={isPdfExporting} 
            />
            <StatCard 
              label={t.mean.toUpperCase()} 
              value={formatNum(stats.mean, displayPrecision)} 
              subtext={limits.target !== undefined ? `${t.goal.toUpperCase()}: ${formatNum(limits.target, displayPrecision)}` : ''} 
              icon={<TargetIcon style={{ width: '18px', height: '18px' }} />} 
              iconColor="#475569"
              themeColor={activeTheme} 
              themeMode={themeMode} 
              isPdfExporting={isPdfExporting} 
            />
            <StatCard 
              label={t.variationLabel.toUpperCase()} 
              value={formatNum(((calculationMethod === 'within' || studyInfo.studyType === 'Process') ? stats.sigmaWithin : stats.stdDev), displayPrecision)} 
              subtext={getCapLabels(studyInfo.studyType).sigma} 
              icon={<Sigma style={{ width: '18px', height: '18px' }} />} 
              iconColor="#475569"
              themeColor={activeTheme} 
              themeMode={themeMode} 
              isPdfExporting={isPdfExporting} 
            />
          </>
        ) : (
          <div style={{ padding: '0 10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                  <tr style={{ borderBottom: `2px solid ${activeTheme.hex}`, color: '#64748b' }}>
                    <th style={{ padding: '8px', fontWeight: '900' }}>{t.measureName.toUpperCase()}</th>
                    <th style={{ padding: '8px', fontWeight: '900' }}>{getCapLabels(studyInfo.studyType).capk}</th>
                    <th style={{ padding: '8px', fontWeight: '900' }}>{getCapLabels(studyInfo.studyType).cap}</th>
                    <th style={{ padding: '8px', fontWeight: '900' }}>{t.mean.toUpperCase()}</th>
                    <th style={{ padding: '8px', fontWeight: '900' }}>{t.variationLabel.toUpperCase()}</th>
                  </tr>
              </thead>
              <tbody>
                {overlayMeasures?.map((m, idx) => m.stats && (
                  <tr key={m.id} style={{ borderBottom: `1px solid #e2e8f0`, color: '#000' }}>
                    <td style={{ padding: '8px', fontWeight: '900', color: colors[idx % colors.length] }}>{m.name || `${t.measure} ${idx + 1}`}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: '700' }}>{formatNum(m.stats.cpk, 3)}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: '700' }}>{formatNum(m.stats.cp, 3)}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: '700' }}>{formatNum(m.stats.mean, 4)}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: '700' }}>{formatNum(m.stats.stdDev, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trend Chart Section */}
      {!isOverlay && (
        <div style={{ marginTop: '10px', width: '100%' }}>
          <div data-html2canvas-ignore="true" style={{ textAlign: 'center', marginBottom: '10px' }}>
            <button 
              onClick={() => setShowTrendChart(!showTrendChart)}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#ffffff', 
                border: `2px solid ${activeTheme.hex}`, 
                color: '#000000', 
                fontSize: '10px', 
                fontWeight: '900', 
                textTransform: 'uppercase', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto',
                transition: 'all 0.2s'
              }}
            >
              <TrendingUp style={{ width: '16px', height: '16px' }} />
              {showTrendChart ? t.trendHide : t.trendShow}
            </button>
          </div>
          
          {(showTrendChart || isPdfExporting) && rawData && rawData.length > 0 && (
            <div style={{ 
              height: '180px', 
              width: isPdfExporting ? '130mm' : '100%', 
              margin: isPdfExporting ? '0 auto 10px auto' : '0 0 15px 0', 
              border: `2px solid ${activeTheme.hex + '33'}`, 
              padding: '10px 10px 10px 0', 
              boxSizing: 'border-box',
              backgroundColor: '#ffffff'
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rawData.map((d, i) => ({ index: i + 1, value: d.value }))} margin={{ top: 10, right: 10, left: -15, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="index" 
                    xAxisId={0}
                    tick={{ fontSize: 9, fontWeight: 700, fill: '#000000', textRendering: 'geometricPrecision' }} 
                    label={{ value: t.measureNo, position: 'insideBottom', offset: -5, fontSize: 9, fontWeight: 700, fill: '#000000', textRendering: 'geometricPrecision' }}
                  />
                  <YAxis 
                    yAxisId={0}
                    domain={trendYDomain} 
                    tick={{ fontSize: 9, fontWeight: 700, fill: '#000000', textRendering: 'geometricPrecision' }}
                    axisLine={{ stroke: '#000000', strokeWidth: 1 }}
                    tickFormatter={(val) => formatNum(val, 4)}
                  />
                  {!isPdfExporting && (
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        borderColor: '#ffffff',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#ffffff',
                        boxShadow: 'none',
                        border: '1px solid #ffffff',
                        textRendering: 'geometricPrecision'
                      }}
                      itemStyle={{ color: '#ffffff', textRendering: 'geometricPrecision' }}
                      labelStyle={{ color: '#ffffff', marginBottom: '4px', textRendering: 'geometricPrecision' }}
                      formatter={(value: number) => [value.toFixed(displayPrecision), t.measureDefaultName]}
                      labelFormatter={(label: number) => `${t.sample} ${label}`}
                    />
                  )}
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={activeTheme.hex} 
                    strokeWidth={2} 
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      const isOutOfSpec = (limits.lsl !== undefined && payload.value < limits.lsl) || 
                                          (limits.usl !== undefined && payload.value > limits.usl);
                      return (
                        <circle 
                          key={`dot-${payload.index}`}
                          cx={cx} 
                          cy={cy} 
                          r={isOutOfSpec ? 4 : 3} 
                          fill={isOutOfSpec ? '#ef4444' : activeTheme.hex} 
                          stroke="#fff" 
                          strokeWidth={1} 
                        />
                      );
                    }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false} 
                  />
                  {limits.lsl !== undefined && <ReferenceLine yAxisId={0} y={limits.lsl} stroke="#ef4444" strokeWidth={2} label={{ position: 'right', value: `${t.lsl}: ${limits.lsl.toFixed(4)}`, fill: '#000000', fontSize: 9, fontWeight: 700, textRendering: 'geometricPrecision' }} />}
                  {limits.usl !== undefined && <ReferenceLine yAxisId={0} y={limits.usl} stroke="#ef4444" strokeWidth={2} label={{ position: 'right', value: `${t.usl}: ${limits.usl.toFixed(4)}`, fill: '#000000', fontSize: 9, fontWeight: 700, textRendering: 'geometricPrecision' }} />}
                  {limits.target !== undefined && <ReferenceLine yAxisId={0} y={limits.target} stroke="#000000" strokeDasharray="5 5" label={{ position: 'right', value: `${t.targetLabel}: ${limits.target.toFixed(4)}`, fill: '#000000', fontSize: 9, fontWeight: 700, textRendering: 'geometricPrecision' }} />}
                  {stats.mean !== undefined && <ReferenceLine yAxisId={0} y={stats.mean} stroke="#000000" strokeDasharray="3 3" opacity={0.3} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Process Audit & Diagnostics Section */}
      {!isOverlay && (
        <div style={{ marginTop: '15px', width: '100%', border: '2px solid #e2e8f0', padding: '12px', boxSizing: 'border-box', backgroundColor: '#fafafa' }}>
          <h3 style={{ fontSize: '11px', fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px', borderBottom: '2px solid #cbd5e1', paddingBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            <Activity style={{ width: '14px', height: '14px', color: activeTheme.hex }} />
            {language === 'sv' ? 'PROCESSUTVÄRDERING & AUDIT-DIAGNOSTIK' : 'PROCESS EVALUATION & AUDIT DIAGNOSTICS'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: isPdfExporting ? '1fr' : '1fr', gap: '15px', marginTop: '10px' }}>
            {/* Stability Card */}
            <div style={{ border: '1px solid #e2e8f0', padding: '8px', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '9px', fontWeight: '900', color: '#475569', textTransform: 'uppercase' }}>
                  {t.stabilityStatusLabel}
                </span>
                <span style={{ 
                  fontSize: '9px', 
                  fontWeight: '900', 
                  padding: '2px 6px', 
                  color: '#ffffff', 
                  backgroundColor: stabilityCheck.isStable ? '#10b981' : '#ef4444',
                  borderRadius: '3px',
                  textTransform: 'uppercase'
                }}>
                  {stabilityCheck.isStable 
                    ? (language === 'sv' ? 'STABIL' : 'STABLE') 
                    : (language === 'sv' ? 'INSTABIL' : 'INSTABLE')
                  }
                </span>
              </div>
              
              <div style={{ fontSize: '9px', color: '#1e293b', lineHeight: '1.4', fontWeight: '500' }}>
                {stabilityCheck.isStable ? (
                  <p style={{ margin: 0, color: '#0f766e', fontWeight: 'bold' }}>{t.stabilityOkText}</p>
                ) : (
                  <div style={{ color: '#b91c1c' }}>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{t.stabilityWarningText}</p>
                    <ul style={{ margin: 0, paddingLeft: '15px' }}>
                      {stabilityCheck.violations.map((v, idx) => (
                        <li key={idx} style={{ marginBottom: '2px', fontWeight: 'bold' }}>{v}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0', fontSize: '8px', color: '#64748b', fontFamily: 'monospace' }}>
                <span>{language === 'sv' ? 'Beräknade styrgränser' : 'Calculated Control Limits'}:</span>
                <span style={{ marginLeft: '6px', fontWeight: 'bold', color: '#000000' }}>
                  LCL = {formatNum(stabilityCheck.lcl, 4)} | UCL = {formatNum(stabilityCheck.ucl, 4)}
                </span>
              </div>
            </div>

            {/* Normality Card */}
            <div style={{ border: '1px solid #e2e8f0', padding: '8px', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '9px', fontWeight: '900', color: '#475569', textTransform: 'uppercase' }}>
                  {t.normalityStatusLabel}
                </span>
                <span style={{ 
                  fontSize: '9px', 
                  fontWeight: '900', 
                  padding: '2px 6px', 
                  color: '#ffffff', 
                  backgroundColor: (normalityCheck.isNormal || distribution !== 'Normal') ? '#10b981' : '#f59e0b',
                  borderRadius: '3px',
                  textTransform: 'uppercase'
                }}>
                  {distribution !== 'Normal' 
                    ? (language === 'sv' ? 'ANPASSAD MODELL' : 'CUSTOM MODEL')
                    : normalityCheck.isNormal 
                      ? (language === 'sv' ? 'NORMALFÖRDELAD' : 'NORMAL') 
                      : (language === 'sv' ? 'AVVIKELSE' : 'DEVIATION')
                  }
                </span>
              </div>

              <div style={{ fontSize: '9px', color: '#1e293b', lineHeight: '1.4', fontWeight: '500' }}>
                {distribution !== 'Normal' ? (
                  <p style={{ margin: 0, fontWeight: 'bold' }}>
                    {language === 'sv' 
                      ? `Beräknas med percentilmetoden enligt ISO 22514-2 för anpassad ${distribution}-fördelning.` 
                      : `Calculated using percentile method according to ISO 22514-2 for custom ${distribution} distribution.`
                    }
                  </p>
                ) : normalityCheck.isNormal ? (
                  <p style={{ margin: 0, color: '#0f766e', fontWeight: 'bold' }}>
                    {t.normalityOkText.replace('{skew}', formatNum(normalityCheck.skewness, 2)).replace('{kurt}', formatNum(normalityCheck.kurtosis, 2))}
                  </p>
                ) : (
                  <p style={{ margin: 0, color: '#b45309', fontWeight: 'bold' }}>
                    {t.normalityWarningText.replace('{skew}', formatNum(normalityCheck.skewness, 2)).replace('{kurt}', formatNum(normalityCheck.kurtosis, 2))}
                  </p>
                )}
              </div>

              <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0', fontSize: '8px', color: '#64748b', fontFamily: 'monospace' }}>
                <span>{language === 'sv' ? 'Deskriptiv data' : 'Descriptive data'}:</span>
                <span style={{ marginLeft: '6px', fontWeight: 'bold', color: '#000000' }}>
                  {language === 'sv' ? 'Skevhet' : 'Skewness'} = {formatNum(stats.skewness, 3)} | {language === 'sv' ? 'Toppighet' : 'Kurtosis'} = {formatNum(stats.kurtosis, 3)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Free Text Report Commentary */}
      {!isOverlay && (
        <div style={{ marginTop: '15px', width: '100%', marginBottom: '15px' }}>
          <h4 style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px', borderBottom: `1px solid #e2e8f0`, paddingBottom: '4px', marginTop: 0 }}>
            {t.reportCommentary}
          </h4>
          
          {isPdfExporting ? (
            <div style={{ 
              border: `2px solid ${activeTheme.hex}`, 
              padding: '12px', 
              backgroundColor: '#fafafa', 
              fontSize: '10px', 
              color: '#000000', 
              fontStyle: 'italic',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              minHeight: '40px',
              fontWeight: '700'
            }}>
              {comment.trim() ? comment : (language === 'sv' ? '[Ingen kommentar angiven]' : '[No commentary entered]')}
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <textarea
                value={comment}
                onChange={handleCommentChange}
                placeholder={t.reportCommentaryPlaceholder}
                style={{
                  width: '100%',
                  height: '80px',
                  padding: '10px',
                  boxSizing: 'border-box',
                  border: `2px solid #cbd5e1`,
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  fontFamily: 'inherit',
                  color: '#1e293b',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  resize: 'vertical',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = activeTheme.hex}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
              <div style={{ 
                textAlign: 'right', 
                fontSize: '8px', 
                color: '#64748b', 
                fontWeight: '900', 
                marginTop: '3px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {language === 'sv' ? 'Kopplad till PDF-export automatiskt' : 'Automatically mapped to PDF export'}
              </div>
            </div>
          )}
        </div>
      )}



      {/* Footer / Standard Reference Section */}
      {( (!isOverlay && rawData && rawData.length > 0) || (isOverlay && overlayMeasures && overlayMeasures.length > 0) ) && (
        <div style={{ marginTop: '20px', width: '100%', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px', borderBottom: `1px solid #e2e8f0`, paddingBottom: '4px' }}>
            {t.rawData} {isOverlay ? `(${overlayMeasures?.length} ${t.measures || 'Measures'})` : ''}
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {isOverlay ? (
              overlayMeasures?.map((m, mIdx) => (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '900', color: colors[mIdx % colors.length], textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {mIdx + 1}. {m.name}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '4px' }}>
                    {m.data.map((item, idx) => {
                      const isOutOfSpec = (m.limits.lsl !== undefined && item.value < m.limits.lsl) || 
                                          (m.limits.usl !== undefined && item.value > m.limits.usl);
                      return (
                        <div 
                          key={item.id} 
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            padding: '4px 6px', 
                            fontSize: '9px', 
                            fontFamily: 'monospace',
                            fontWeight: '700',
                            border: `1px solid ${isOutOfSpec ? '#ef4444' : '#e2e8f0'}`,
                            backgroundColor: isOutOfSpec ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                            color: isOutOfSpec ? '#ef4444' : '#000000'
                          }}
                        >
                          <span style={{ opacity: 0.5 }}>{idx + 1}</span>
                          <span>{item.value.toFixed(displayPrecision)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '4px' }}>
                {rawData?.map((item, idx) => {
                  const isOutOfSpec = (limits.lsl !== undefined && item.value < limits.lsl) || 
                                      (limits.usl !== undefined && item.value > limits.usl);
                  return (
                    <div 
                      key={item.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        padding: '4px 6px', 
                        fontSize: '9px', 
                        fontFamily: 'monospace',
                        fontWeight: '700',
                        border: `1px solid ${isOutOfSpec ? '#ef4444' : '#e2e8f0'}`,
                        backgroundColor: isOutOfSpec ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                        color: isOutOfSpec ? '#ef4444' : '#000000'
                      }}
                    >
                      <span style={{ opacity: 0.5 }}>{idx + 1}</span>
                      <span>{item.value.toFixed(displayPrecision)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ 
        marginTop: '10px', 
        paddingTop: '10px', 
        borderTop: `1px solid #e2e8f0`,
        display: isPdfExporting ? 'block' : 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        width: '100%'
      }}>
        <div style={{ 
          width: isPdfExporting ? '100%' : '70%', 
          display: isPdfExporting ? 'block' : 'inline-block',
          marginBottom: isPdfExporting ? '10px' : '0'
        }}>
          <h4 style={{ fontSize: '9px', fontWeight: '900', color: isPdfExporting ? '#334155' : '#64748b', textTransform: 'uppercase', marginBottom: '5px', letterSpacing: '0.5px' }}>
            {t.statStandard} & {t.methodology}
          </h4>
          <p style={{ fontSize: '8px', color: isPdfExporting ? '#475569' : '#94a3b8', lineHeight: '1.4', margin: 0 }}>
            {limits.standard === 'IATF' && t.methodologyIATF}
            {limits.standard === 'VDA' && t.methodologyVDA}
            {t.methodologyVerified + (t[`dist${distribution}` as keyof typeof t] || distribution) + ". "}
            {language === 'sv' 
              ? `SPC-regelverk: ${spcRule === 'IATF' ? 'IATF 16949 / VDA (7 i följd)' : spcRule === 'ISO' ? 'ISO 7870-2 (8 i följd)' : 'AIAG / Nelson (9 i följd)'}.`
              : `SPC Rule: ${spcRule === 'IATF' ? 'IATF 16949 / VDA (7 consecutive)' : spcRule === 'ISO' ? 'ISO 7870-2 (8 consecutive)' : 'AIAG / Nelson (9 consecutive)'}.`}
            {isWithin && (
              <span style={{ display: 'block', fontWeight: 'bold', color: '#000000', marginTop: '2px' }}>
                {t.withinGroupReport} (n={subgroupSize}).
              </span>
            )}
          </p>
        </div>
        <div style={{ 
          textAlign: 'right', 
          width: isPdfExporting ? '100%' : '30%',
          display: isPdfExporting ? 'block' : 'inline-block'
        }}>
          <div style={{ fontSize: '10px', fontWeight: '900', color: '#000000', textTransform: 'uppercase', letterSpacing: '1px' }}>
            DIGICAP<span style={{ fontSize: '6px', verticalAlign: 'top' }}>®</span>
          </div>
          <div style={{ fontSize: '7px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            {t.professional} {t.edition}
          </div>
        </div>
      </div>
      
      {/* Extra padding for PDF export to avoid cutting off the footer */}
      {isPdfExporting && <div style={{ height: '20px' }} />}
    </div>
  );
};

const CapabilityReport: React.FC<CapabilityReportProps> = (props) => {
  if (!props.stats) return null;
  return <CapabilityReportInner {...props} />;
};

export default CapabilityReport;
