
export interface MeasurementData {
  id: string;
  value: number;
  timestamp: number;
}

export type StandardType = 'IATF' | 'VDA' | 'SEMI';

export type DistributionType = 'Normal' | 'Folded' | 'LogNormal' | 'Rayleigh' | 'Weibull';

export interface ProcessLimits {
  lsl?: number; // Optional Lower Specification Limit
  usl?: number; // Optional Upper Specification Limit
  target?: number; // Target value
  standard: StandardType;
  toleranceType: 'double' | 'upper' | 'lower';
}

export interface Statistics {
  mean: number;
  stdDev: number; // Sample standard deviation (Sigma Total)
  sigmaWithin: number; // Sigma Within (Moving Range)
  min: number;
  max: number;
  cp: number | null; // Null if single-sided
  cpk: number;
  cpm: number | null; // Taguchi index, requires Target
  skewness: number; // Measure of asymmetry
  kurtosis: number; // Measure of tailedness (excess)
  sampleSize: number;
  sigmaLevel: number; // The sigma level used for calculation (e.g., 3, 4, 6)
  outOfSpecCount: number; // Number of values outside limits
  qLo?: number; // Lower quantile for non-normal reference interval
  qHi?: number; // Upper quantile for non-normal reference interval
  median?: number; // Median for non-normal central tendency
}

export interface HistogramBin {
  binStart: number;
  binEnd: number;
  count: number;
  midPoint: number;
  normalCurveVal?: number; // Scaled value for the curve
  isOutOfSpec?: boolean;
}

export interface Measure {
  id: string;
  name: string;
  data: MeasurementData[];
  limits: ProcessLimits;
  distribution: DistributionType;
  stats: Statistics | null;
  histogram: HistogramBin[];
  isAnalyzed: boolean;
  sigmaLevel?: number;
  calculationMethod?: 'serial' | 'within';
  subgroupSize?: number;
}

export interface StudyInfo {
  id: string;
  partNumber: string;
  revision: string;
  machineNumber: string;
  date: string;
  studyType: 'Process' | 'Machine' | 'Performance';
  studyPurpose: string;
  performedBy: string;
}

export type AppTheme = 'soft' | 'sharp';

// Global window extension
declare global {
  interface Window {
    isSecureContext: boolean;
    aistudio?: {
      hasSelectedApiKey(): Promise<boolean>;
      openSelectKey(): Promise<void>;
    };
  }
}
