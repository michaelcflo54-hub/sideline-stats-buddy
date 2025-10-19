/**
 * @fileoverview Core metrics calculations for play effectiveness
 */

/**
 * Calculate success rate based on down and distance
 * @param down Down number (1-4)
 * @param distance Yards to gain
 * @param yardsGained Actual yards gained
 * @param isTouchdown Whether play resulted in touchdown
 * @returns True if play was successful
 */
export function calculateSuccess(
  down: number,
  distance: number,
  yardsGained: number,
  isTouchdown: boolean
): boolean {
  // Touchdown is always success
  if (isTouchdown) return true;
  
  // Success thresholds by down
  switch (down) {
    case 1:
      return yardsGained >= distance * 0.5; // 50% of distance
    case 2:
      return yardsGained >= distance * 0.7; // 70% of distance
    case 3:
    case 4:
      return yardsGained >= distance; // 100% conversion
    default:
      return false;
  }
}

/**
 * Check if play was explosive
 * @param playType Type of play (run/pass)
 * @param yardsGained Yards gained
 * @param explosiveRunYds Threshold for explosive runs (default 10)
 * @param explosivePassYds Threshold for explosive passes (default 15)
 * @returns True if play was explosive
 */
export function isExplosive(
  playType: string,
  yardsGained: number,
  explosiveRunYds: number = 10,
  explosivePassYds: number = 15
): boolean {
  const isRun = playType.toLowerCase().includes('run') || playType === 'run';
  const threshold = isRun ? explosiveRunYds : explosivePassYds;
  return yardsGained >= threshold;
}

/**
 * Calculate z-score for a value within a dataset
 * @param value The value to score
 * @param values Array of all values in the dataset
 * @returns Z-score (standard deviations from mean)
 */
export function calculateZScore(value: number, values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Apply empirical Bayes smoothing to success rate
 * @param rawSuccessRate Observed success rate
 * @param sampleSize Number of samples
 * @param priorSuccessRate Prior belief about success rate (default 0.5)
 * @param weight Weight of prior (default 5)
 * @returns Smoothed success rate
 */
export function smoothSuccessRate(
  rawSuccessRate: number,
  sampleSize: number,
  priorSuccessRate: number = 0.5,
  weight: number = 5
): number {
  const numerator = rawSuccessRate * sampleSize + priorSuccessRate * weight;
  const denominator = sampleSize + weight;
  return numerator / denominator;
}

/**
 * Calculate composite score for play ranking
 * @param adjustedSuccessRate EB-smoothed success rate
 * @param zScoreYards Z-score of average yards
 * @param explosiveRate Rate of explosive plays
 * @param turnoverRate Rate of turnovers
 * @param tdRate Rate of touchdowns
 * @returns Composite score for ranking
 */
export function calculateCompositeScore(
  adjustedSuccessRate: number,
  zScoreYards: number,
  explosiveRate: number,
  turnoverRate: number,
  tdRate: number
): number {
  return (
    0.55 * adjustedSuccessRate +
    0.20 * zScoreYards +
    0.15 * (explosiveRate - 0.5 * turnoverRate) +
    0.10 * tdRate
  );
}

/**
 * Calculate basic statistics for a set of values
 * @param values Array of numeric values
 * @returns Object with mean, variance, and standard deviation
 */
export function calculateBasicStats(values: number[]): {
  mean: number;
  variance: number;
  standardDeviation: number;
} {
  if (values.length === 0) {
    return { mean: 0, variance: 0, standardDeviation: 0 };
  }
  
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  
  return { mean, variance, standardDeviation };
}
