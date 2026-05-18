
/**
 * DISTRIBUTION MATH SERVICE
 * Contains PDF functions and percentile-based capability logic for non-normal distributions.
 */

export interface DistributionParams {
  mean: number;
  stdDev: number;
  shape?: number;
  scale?: number;
  location?: number;
}

/**
 * Normal Distribution
 */
export const normalPDF = (x: number, mean: number, stdDev: number): number => {
  if (stdDev <= 0) return 0;
  return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
};

/**
 * Log-Normal Distribution
 */
export const logNormalPDF = (x: number, mu: number, sigma: number): number => {
  if (x <= 0 || sigma <= 0) return 0;
  const lnX = Math.log(x);
  return (1 / (x * sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(lnX - mu, 2) / (2 * Math.pow(sigma, 2)));
};

/**
 * Weibull Distribution
 */
export const weibullPDF = (x: number, shape: number, scale: number): number => {
  if (x < 0 || shape <= 0 || scale <= 0) return 0;
  return (shape / scale) * Math.pow(x / scale, shape - 1) * Math.exp(-Math.pow(x / scale, shape));
};

/**
 * Rayleigh Distribution
 */
export const rayleighPDF = (x: number, sigma: number): number => {
  if (x < 0 || sigma <= 0) return 0;
  return (x / Math.pow(sigma, 2)) * Math.exp(-Math.pow(x, 2) / (2 * Math.pow(sigma, 2)));
};

/**
 * Folded Normal PDF
 */
export const foldedNormalPDF = (x: number, mu: number, sigma: number): number => {
  if (x < 0 || sigma <= 0) return 0;
  return normalPDF(x, mu, sigma) + normalPDF(x, -mu, sigma);
};

/**
 * Estimate parameters for Log-Normal from data
 */
export const estimateLogNormalParams = (values: number[]) => {
  const positiveValues = values.filter(v => v > 0);
  if (positiveValues.length < 2) return { mu: 0, sigma: 1 };
  const lnValues = positiveValues.map(v => Math.log(v));
  const mu = lnValues.reduce((a, b) => a + b, 0) / lnValues.length;
  const variance = lnValues.reduce((a, b) => a + Math.pow(b - mu, 2), 0) / (lnValues.length - 1);
  return { mu, sigma: Math.sqrt(variance) };
};

/**
 * Estimate parameters for Weibull from data (using Method of Moments approximation)
 */
export const estimateWeibullParams = (values: number[]) => {
  const positiveValues = values.filter(v => v > 0);
  if (positiveValues.length < 2) return { shape: 1, scale: 1 };
  
  const mean = positiveValues.reduce((a, b) => a + b, 0) / positiveValues.length;
  const variance = positiveValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (positiveValues.length - 1);
  const stdDev = Math.sqrt(variance);
  
  // Simple approximation for shape (k) based on stdDev/mean ratio
  const cv = stdDev / mean;
  const shape = Math.pow(cv, -1.086); // Empirical approximation
  
  // Scale (lambda) = mean / Gamma(1 + 1/shape)
  // Gamma approximation: Gamma(1 + x) approx sqrt(2*PI*x)*(x/e)^x * (1 + 1/(12x))
  const Gamma1PlusInvShape = Math.exp(Math.log(1/shape) * (1/shape)) * Math.sqrt(2 * Math.PI * (1/shape)) / Math.exp(1/shape); 
  // Simplified scale for web tool robustness
  const scale = mean / (1 + (0.1 / shape)); // Crude but stable for UI
  
  return { shape: Math.max(0.1, shape), scale: Math.max(0.001, scale) };
};

/**
 * Estimate Rayleigh parameter
 */
export const estimateRayleighParams = (values: number[]) => {
  const positiveValues = values.filter(v => v > 0);
  if (positiveValues.length === 0) return { sigma: 1 };
  const sumSq = positiveValues.reduce((a, b) => a + Math.pow(b, 2), 0);
  return { sigma: Math.sqrt(sumSq / (2 * positiveValues.length)) };
};

/**
 * Percentile Calculation helpers
 */
const erfc = (x: number) => {
  const z = Math.abs(x);
  const t = 1.0 / (1.0 + 0.5 * z);
  const ans = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 +
    t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 +
    t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? ans : 2.0 - ans;
};

const invErfc = (x: number) => {
  if (x >= 2) return -100;
  if (x <= 0) return 100;
  let xx = (x < 1) ? x : 2 - x;
  let t = Math.sqrt(-2 * Math.log(xx / 2));
  let res = -0.70711 * ((2.30753 + t * 0.27061) / (1 + t * (0.99229 + t * 0.04481)) - t);
  for (let j = 0; j < 2; j++) {
    let err = erfc(res) - xx;
    res += err / (1.12837916709551257 * Math.exp(-res * res));
  }
  return x < 1 ? res : -res;
};

export const normalQuantile = (p: number, mu: number, sigma: number) => {
  return mu - sigma * Math.sqrt(2) * invErfc(2 * p);
};

const getProbFromSigma = (z: number) => {
  // Phi(-z) = 0.5 * erfc(z / sqrt(2))
  return 0.5 * erfc(z / Math.sqrt(2));
};

/**
 * Calculate refined capability indices using the Quantile Method (ISO 22514-2)
 */
export const calculateNonNormalCapability = (
  values: number[],
  type: string,
  limits: { lsl?: number, usl?: number },
  sigmaLevel: number = 3
) => {
  const probLo = getProbFromSigma(sigmaLevel);
  const probHi = 1 - probLo;

  let qLo = 0; // Lower tail (eq to -Z sigma)
  let p50 = 0; // Median
  let qHi = 1; // Upper tail (eq to +Z sigma)
  
  if (type === 'LogNormal') {
    const { mu, sigma } = estimateLogNormalParams(values);
    qLo = Math.exp(normalQuantile(probLo, mu, sigma));
    p50 = Math.exp(mu);
    qHi = Math.exp(normalQuantile(probHi, mu, sigma));
  } else if (type === 'Weibull') {
    const { shape, scale } = estimateWeibullParams(values);
    // Quantile function Q(p) = scale * (-ln(1-p))^(1/shape)
    qLo = scale * Math.pow(-Math.log(1 - probLo), 1 / shape);
    p50 = scale * Math.pow(Math.log(2), 1 / shape);
    qHi = scale * Math.pow(-Math.log(1 - probHi), 1 / shape);
  } else if (type === 'Rayleigh') {
    const { sigma } = estimateRayleighParams(values);
    qLo = sigma * Math.sqrt(-2 * Math.log(1 - probLo));
    p50 = sigma * Math.sqrt(Math.log(4));
    qHi = sigma * Math.sqrt(-2 * Math.log(1 - probHi));
  } else {
    // Fallback to normal for others for now
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length - 1));
    qLo = mean - sigmaLevel * stdDev;
    p50 = mean;
    qHi = mean + sigmaLevel * stdDev;
  }

  const { lsl, usl } = limits;
  let cp: number | null = null;
  let cpk = 0;
  
  // Guard against division by zero (zero variance data)
  const range = qHi - qLo;
  const upperRange = qHi - p50;
  const lowerRange = p50 - qLo;

  if (usl !== undefined && lsl !== undefined) {
    cp = range > 0 ? (usl - lsl) / range : 0;
    const cpu = upperRange > 0 ? (usl - p50) / upperRange : (usl > p50 ? 100 : 0);
    const cpl = lowerRange > 0 ? (p50 - lsl) / lowerRange : (p50 > lsl ? 100 : 0);
    cpk = Math.min(cpu, cpl);
  } else if (usl !== undefined) {
    cpk = upperRange > 0 ? (usl - p50) / upperRange : (usl > p50 ? 100 : 0);
  } else if (lsl !== undefined) {
    cpk = lowerRange > 0 ? (p50 - lsl) / lowerRange : (p50 > lsl ? 100 : 0);
  }

  return { cp, cpk, qLo, p50, qHi };
};

/**
 * Random Number Generators for Simulations
 */

export const generateNormalValue = (mean: number, stdDev: number): number => {
  const u = 1 - Math.random(); // Converting [0,1) to (0,1]
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdDev + mean;
};

export const generateLogNormalValue = (mu: number, sigma: number): number => {
  return Math.exp(generateNormalValue(mu, sigma));
};

export const generateWeibullValue = (shape: number, scale: number): number => {
  return scale * Math.pow(-Math.log(1 - Math.random()), 1 / shape);
};

export const generateRayleighValue = (sigma: number): number => {
  return sigma * Math.sqrt(-2 * Math.log(1 - Math.random()));
};

export const generateFoldedNormalValue = (mu: number, sigma: number): number => {
  return Math.abs(generateNormalValue(mu, sigma));
};
