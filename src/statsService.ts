
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
  
  // Vi vill att histogrammets klasser (bins) täcker det faktiska dataområdet
  // så att vi får precis det antal klasser vi önskar (6-8 st), utan tomma klasser i utkanterna.
  let hMin = stats.min;
  let hMax = stats.max;
  
  const hRange = hMax - hMin;
  if (hRange > 0) {
    // Lägg till en minimal marginal så att min/max-värden inte hamnar precis på gränsen
    hMin -= hRange * 0.01;
    hMax += hRange * 0.01;
  } else {
    hMin -= 0.1;
    hMax += 0.1;
  }

  const n = values.length;
  let numBins = 7; // Standard 7 klasser
  if (n < 15) {
    numBins = 5;
  } else if (n < 35) {
    numBins = 6;
  } else if (n < 60) {
    numBins = 7;
  } else if (n < 120) {
    numBins = 8;
  } else {
    numBins = 9;
  }

  let binWidth = (hMax - hMin) / numBins;
  if (binWidth <= 0 || !isFinite(binWidth)) {
    binWidth = stats.stdDev > 0 ? stats.stdDev : 0.1;
  }

  const bins: HistogramBin[] = [];

  for (let i = 0; i < numBins; i++) {
    const binStart = hMin + i * binWidth;
    const binEnd = binStart + binWidth;
    // Se till att inkludera sista värdet i sista binnat
    const binValues = values.filter(v => v >= binStart && (i === numBins - 1 ? v <= binEnd : v < binEnd));
    const count = binValues.length;
    
    const isOutOfSpec = binValues.some(v => {
      const epsilon = 0.0000000001;
      return (limits.lsl !== undefined && v < limits.lsl - epsilon) || 
             (limits.usl !== undefined && v > limits.usl + epsilon);
    });

    bins.push({ binStart, binEnd, midPoint: (binStart + binEnd) / 2, count, isOutOfSpec });
  }

  return bins;
};
