
import { calculateStdDev, calculateSigmaWithin, calculateCapabilityIndices } from '../src/coreLogic';
import { ProcessLimits } from '../src/types';

/**
 * LOGIC VERIFICATION SUITE
 * Run this to ensure core statistical formulas remain accurate.
 */

const testLogic = () => {
  console.log("--- DIGICAP LOGIC VERIFICATION ---");

  // Test Data
  const data = [10.1, 9.9, 10.2, 10.0, 9.8];
  const mean = 10.0;
  const limits: ProcessLimits = {
    lsl: 9.5,
    usl: 10.5,
    target: 10.0,
    standard: 'IATF',
    toleranceType: 'double'
  };

  // 1. Standard Deviation
  const stdDev = calculateStdDev(data, mean);
  const expectedStdDev = 0.158113883;
  console.log(`StdDev: ${stdDev.toFixed(9)} (Expected: ${expectedStdDev}) - ${Math.abs(stdDev - expectedStdDev) < 0.000001 ? 'PASS' : 'FAIL'}`);

  // 2. Sigma Within (Moving Range)
  const sigmaWithin = calculateSigmaWithin(data);
  const expectedSigmaWithin = 0.177304964; // (0.2+0.3+0.2+0.2)/4 / 1.128
  console.log(`Sigma Within: ${sigmaWithin.toFixed(9)} (Expected: ${expectedSigmaWithin}) - ${Math.abs(sigmaWithin - expectedSigmaWithin) < 0.000001 ? 'PASS' : 'FAIL'}`);

  // 3. Capability Indices
  const indices = calculateCapabilityIndices(mean, stdDev, limits, 3);
  const expectedCpk = 1.05409; // (10.5 - 10.0) / (3 * 0.15811)
  console.log(`Cpk: ${indices.cpk.toFixed(5)} (Expected: ${expectedCpk}) - ${Math.abs(indices.cpk - expectedCpk) < 0.001 ? 'PASS' : 'FAIL'}`);

  console.log("----------------------------------");
};

testLogic();
