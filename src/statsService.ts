
/**
 * CORE LOGIC WRAPPER - DO NOT MODIFY WITHOUT EXPLICIT PERMISSION
 * This file bridges the UI with the Verified Core Logic Engine.
 */

import { MeasurementData, Statistics, HistogramBin, ProcessLimits, DistributionType, StudyInfo } from './types';
import { calculateStdDev, calculateSigmaWithin, calculateSigmaWithinSubgroups, calculateCapabilityIndices } from './coreLogic';
import { calculateNonNormalCapability } from './distributionMath';

export const calculateStatistics = (
  data: MeasurementData[], 
  limits: ProcessLimits, 
  sigmaLevel: number = 3,
  distribution: DistributionType = 'Normal',
  studyType: StudyInfo['studyType'] = 'Process',
  calculationMethod: 'serial' | 'within' = 'serial',
  subgroupSize: number = 2
): Statistics | null => {
  const cleanValues = data
    .map(d => d.value)
    .filter(v => v !== null && v !== undefined && !isNaN(v) && isFinite(v));

  const n = cleanValues.length;
  if (n < 2) return null;

  const isZeroBounded = limits.lsl === 0 || (limits.toleranceType === 'upper' && (limits.target === 0 || limits.target === undefined));
  const processedValues = isZeroBounded ? cleanValues.map(v => Math.max(0, v)) : cleanValues;

  const sum = processedValues.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const stdDev = calculateStdDev(processedValues, mean);
  const sigmaWithin = calculationMethod === 'within' 
    ? calculateSigmaWithinSubgroups(processedValues, subgroupSize)
    : calculateSigmaWithin(processedValues);

  const min = Math.min(...processedValues);
  const max = Math.max(...processedValues);

  let skewness = 0;
  let kurtosis = 0;
  if (n >= 3 && stdDev > 0) {
    skewness = (n / ((n - 1) * (n - 2))) * processedValues.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0);
  }
  if (n >= 4 && stdDev > 0) {
    kurtosis = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * 
      processedValues.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 4), 0) - 
      (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  }

  const { standard } = limits;
  // LOGIC FOR SIGMA SELECTION:
  // 1. If user explicitly forced 'within' (subgroup calculation), use it.
  // 2. If it's a 'Process' study (Cp/Cpk), standard (IATF/VDA/ISO) requires Sigma Within (Moving Range/Subgroup) to show inherent capability.
  // 3. If it's a 'Machine' study (Cm/Cmk) or 'Performance' study (Pp/Ppk), use Sigma Total (stdDev) per standards.
  const calcSigma = (calculationMethod === 'within' || studyType === 'Process') ? sigmaWithin : stdDev; 

  let { cp, cpk, cpm } = calculateCapabilityIndices(mean, calcSigma, limits, sigmaLevel);
  let qLo = mean - sigmaLevel * calcSigma;
  let qHi = mean + sigmaLevel * calcSigma;
  let median = mean;

  // OVERRIDE FOR NON-NORMAL DISTRIBUTIONS (ISO 22514-2 Quantile Method)
  // Ensure we have enough data (min 2, but ISO recommends more)
  if (distribution !== 'Normal' && processedValues.length >= 2) {
    const nonNormal = calculateNonNormalCapability(processedValues, distribution, limits, sigmaLevel);
    cpk = nonNormal.cpk;
    cp = nonNormal.cp;
    qLo = nonNormal.qLo;
    qHi = nonNormal.qHi;
    median = nonNormal.p50;
  }

  const outOfSpecCount = processedValues.filter(v => 
    (limits.lsl !== undefined && v < limits.lsl - 0.0000000001) || 
    (limits.usl !== undefined && v > limits.usl + 0.0000000001)
  ).length;

  return { 
    mean, 
    stdDev, 
    sigmaWithin,
    min, 
    max, 
    cp, 
    cpk, 
    cpm, 
    skewness, 
    kurtosis, 
    sampleSize: n, 
    sigmaLevel,
    outOfSpecCount,
    qLo,
    qHi,
    median
  };
};

export const generateHistogramData = (
    data: MeasurementData[], 
    stats: Statistics, 
    limits: ProcessLimits,
    distribution: DistributionType = 'Normal'
): HistogramBin[] => {
  if (data.length === 0) return [];
  const values = data.map(d => d.value);
  
  // Vi vill att histogrammet täcker minst ±(Z + 1.5) sigma för att ge kurvan luft
  const sigmaReach = stats.sigmaLevel + 1.5;
  const isZeroBounded = limits.lsl === 0 || (limits.toleranceType === 'upper' && (limits.target === 0 || limits.target === undefined));
  
  let plotMin = Math.min(stats.min, stats.mean - sigmaReach * stats.stdDev);
  let plotMax = Math.max(stats.max, stats.mean + sigmaReach * stats.stdDev);
  
  if (limits.lsl !== undefined) plotMin = Math.min(plotMin, limits.lsl);
  if (limits.usl !== undefined) plotMax = Math.max(plotMax, limits.usl);

  const range = plotMax - plotMin;
  plotMin -= range * 0.05;
  plotMax += range * 0.05;

  if (isZeroBounded) {
    plotMin = Math.max(0, plotMin);
  }

  // Dynamisk beräkning av antal klasser (bins).
  // För industriell professionalism vill vi ha tillräckligt många staplar
  // även vid lägre n för att se fördelningens form tydligt.
  const n = values.length;
  // Vi siktar på fler binar i det totala plot-spannet (~10 sigma)
  // så att vi får ca 14-16 staplar i det centrala data-området vid n=30.
  const numBins = n <= 30 ? 26 : Math.max(26, Math.min(60, Math.ceil(Math.sqrt(n) * 3.5)));
  
  let binWidth: number;
  const rawBinWidth = (plotMax - plotMin) / numBins;
  
  if (rawBinWidth > 0 && isFinite(rawBinWidth)) {
    // Högre precision i avrundningen för att behålla binar-antalet
    const precision = Math.max(1e-12, Math.pow(10, Math.floor(Math.log10(rawBinWidth)) - 2));
    binWidth = Math.ceil(rawBinWidth / precision) * precision;
  } else {
    binWidth = stats.stdDev > 0 ? stats.stdDev : 0.1;
  }
  
  if (binWidth <= 0) binWidth = 0.001;

  // Justera plotMin och plotMax
  plotMin = Math.floor(plotMin / binWidth) * binWidth;
  const actualBinsCount = Math.ceil((plotMax - plotMin) / binWidth);
  const finalNumBins = Math.min(100, Math.max(14, actualBinsCount)); 

  const bins: HistogramBin[] = [];

  for (let i = 0; i < finalNumBins; i++) {
    const binStart = plotMin + i * binWidth;
    const binEnd = binStart + binWidth;
    const binValues = values.filter(v => v >= binStart && (i === finalNumBins - 1 ? v <= binEnd : v < binEnd));
    const count = binValues.length;
    
    const isOutOfSpec = binValues.some(v => {
      // Vi jämför råvärden med en minimal epsilon för att hantera flyttalsprecision.
      // Vi använder en positiv epsilon-offset för att säkerställa att värden som ligger
      // precis på gränsen (eller extremt nära utanför) flaggas som gröna (in-spec).
      const epsilon = 0.0000000001;
      return (limits.lsl !== undefined && v < limits.lsl - epsilon) || 
             (limits.usl !== undefined && v > limits.usl + epsilon);
    });

    bins.push({ binStart, binEnd, midPoint: (binStart + binEnd) / 2, count, isOutOfSpec });
  }

  return bins;
};
