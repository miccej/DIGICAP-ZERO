
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
  if (!height || height <= 0) return null;
  const actualWidth = (barWidthPx || 30) * 0.95; 
  const adjustedX = x - (actualWidth / 2);
  const barFill = payload?.isOutOfSpec ? '#ef4444' : fill;
  const barStroke = payload?.isOutOfSpec ? '#991b1b' : stroke;

  return (
    <rect x={adjustedX} y={y} width={actualWidth} height={height} fill={barFill} stroke={barStroke} strokeWidth={1} fillOpacity={0.85} />
  );
};

const CapabilityReportInner: React.FC<CapabilityReportProps> = ({ 
  stats, limits, histogramData, studyInfo, language, distribution, overlayMeasures,
  rawData, calculationMethod, subgroupSize, theme, themeColor, themeMode = 'light', isPdfExporting
}) => {
  const t = translations[language];
  const isOverlay = !!overlayMeasures && overlayMeasures.length > 0;
  const colors = ['#f59e0b', '#6366f1', '#ec4899', '#10b981', '#ef4444', '#06b6d4'];
  const [showTrendChart, setShowTrendChart] = useState(true);
  
  const isWithin = calculationMethod === 'within';

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
            {t.methodologyVerified + (t[`dist${distribution}` as keyof typeof t] || distribution) + "."}
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
