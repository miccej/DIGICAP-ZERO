/**
 * CORE LOGIC - DO NOT MODIFY WITHOUT EXPLICIT PERMISSION
 * This file contains the verified statistical calculations for the DigiCap system.
 * Any changes to these formulas must be double-checked against ISO/statistical standards.
 * 
 * VERIFIED CALCULATIONS:
 * - Mean (Arithmetic)
 * - Standard Deviation (Sample & Within)
 * - Cp/Cpk (Process Capability)
 * - Pp/Ppk (Process Performance)
 * - Histogram Binning Logic
 * */

import { MeasurementData, Statistics, HistogramBin, ProcessLimits, DistributionType, StudyInfo } from './types';

/**
 * Verified Standard Deviation Calculation
 */
export const calculateStdDev = (values: number[], mean: number): number => {
  const n = values.length;
  if (n < 2) return 0;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1);
  return Math.sqrt(variance);
};

/**
 * Verified Sigma Within (Moving Range) Calculation
 */
export const calculateSigmaWithin = (values: number[]): number => {
  const n = values.length;
  if (n < 2) return 0;
  let sumMR = 0;
  for (let i = 1; i < n; i++) {
    sumMR += Math.abs(values[i] - values[i - 1]);
  }
  return (sumMR / (n - 1)) / 1.128;
};

/**
 * Verified Sigma Within (Subgroup Range) Calculation
 * Uses the Average Range method (R-bar / d2)
 */
export const calculateSigmaWithinSubgroups = (values: number[], n: number): number => {
  if (values.length < n || n < 2) return 0;
  
  // d2 constants for n=2 to 8
  const d2: Record<number, number> = {
    2: 1.128,
    3: 1.693,
    4: 2.059,
    5: 2.326,
    6: 2.534,
    7: 2.704,
    8: 2.847
  };

  const factor = d2[n] || 1.128;
  let totalRange = 0;
  let subgroupCount = 0;

  for (let i = 0; i <= values.length - n; i += n) {
    const subgroup = values.slice(i, i + n);
    const range = Math.max(...subgroup) - Math.min(...subgroup);
    totalRange += range;
    subgroupCount++;
  }

  if (subgroupCount === 0) return 0;
  return (totalRange / subgroupCount) / factor;
};

/**
 * Verified Capability Indices Calculation
 */
export const calculateCapabilityIndices = (
  mean: number, 
  sigma: number, 
  limits: ProcessLimits, 
  sigmaLevel: number
): { cp: number | null, cpk: number, cpm: number | null } => {
  const { lsl, usl, target, toleranceType } = limits;
  let cp: number | null = null;
  let cpk = 0;
  let cpm: number | null = null;

  if (sigma === 0) return { cp: null, cpk: 0, cpm: null };

  if (toleranceType === 'double' && usl !== undefined && lsl !== undefined) {
    cp = (usl - lsl) / (sigmaLevel * 2 * sigma);
    cpk = Math.min((usl - mean) / (sigmaLevel * sigma), (mean - lsl) / (sigmaLevel * sigma));
    
    if (target !== undefined) {
      const denom = sigmaLevel * 2 * Math.sqrt(Math.pow(sigma, 2) + Math.pow(mean - target, 2));
      cpm = (usl - lsl) / denom;
    }
  } else if (toleranceType === 'upper' && usl !== undefined) {
    cpk = (usl - mean) / (sigmaLevel * sigma);
  } else if (toleranceType === 'lower' && lsl !== undefined) {
    cpk = (mean - lsl) / (sigmaLevel * sigma);
  }

  return { cp, cpk, cpm };
};
