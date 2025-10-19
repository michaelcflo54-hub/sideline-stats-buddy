/**
 * @fileoverview Play grouping and aggregation utilities
 */

import type { PlayInput, FieldResolvers, PlayKeyParts, PlayEffectivenessSummary } from './index';
import { calculateSuccess, isExplosive, calculateZScore, smoothSuccessRate, calculateCompositeScore } from './metrics';

/**
 * Generate play key from play data
 * @param play Play data
 * @param resolvers Field resolvers
 * @param options Analysis options
 * @returns Play key string
 */
export function generatePlayKey<T extends PlayInput>(
  play: T,
  resolvers: FieldResolvers<T>,
  options: { includeMotionInKey?: boolean; keyFormat?: (k: PlayKeyParts) => string }
): string {
  const formation = resolvers.formation?.(play) || '—';
  const playFamily = resolvers.playFamily?.(play) || '—';
  const motionTag = options.includeMotionInKey ? (resolvers.motionTag?.(play) || '') : '';
  
  const keyParts: PlayKeyParts = {
    formation,
    playFamily,
    motionTag: options.includeMotionInKey ? motionTag : undefined
  };
  
  if (options.keyFormat) {
    return options.keyFormat(keyParts);
  }
  
  // Default format: "Formation | PlayFamily | MotionTag" (if motion included)
  if (options.includeMotionInKey && motionTag) {
    return `${formation} | ${playFamily} | ${motionTag}`;
  }
  
  return `${formation} | ${playFamily}`;
}

/**
 * Raw play statistics for aggregation
 */
export interface RawPlayStats {
  yardsGained: number[];
  isSuccess: boolean[];
  explosivePlays: boolean[];
  isTouchdown: boolean[];
  isTurnover: boolean[];
  players: string[];
  playIds: string[];
}

/**
 * Aggregate raw statistics for a group of plays
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @param options Analysis options
 * @returns Raw aggregated statistics
 */
export function aggregateRawStats<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>,
  options: {
    explosiveRunYds?: number;
    explosivePassYds?: number;
    dropPenaltyOnly?: boolean;
  }
): RawPlayStats {
  const yardsGained: number[] = [];
  const isSuccess: boolean[] = [];
  const explosivePlays: boolean[] = [];
  const isTouchdown: boolean[] = [];
  const isTurnover: boolean[] = [];
  const players: string[] = [];
  const playIds: string[] = [];
  
  for (const play of plays) {
    // Skip penalty-only plays if option is enabled
    if (options.dropPenaltyOnly && resolvers.isPenalty?.(play) && (resolvers.yardsGained?.(play) ?? 0) === 0) {
      continue;
    }
    
    const down = resolvers.down(play);
    const distance = resolvers.distance(play);
    const yards = resolvers.yardsGained?.(play) ?? 0;
    const touchdown = resolvers.isTouchdown?.(play) ?? false;
    const turnover = resolvers.isTurnover?.(play) ?? false;
    const playType = resolvers.playFamily?.(play) || 'run';
    
    // Calculate derived values
    const success = down && distance ? calculateSuccess(down, distance, yards, touchdown) : false;
    const explosive = isExplosive(playType || 'run', yards, options.explosiveRunYds, options.explosivePassYds);
    
    // Collect player names
    const ballCarrier = resolvers.primaryBallCarrier?.(play);
    const passer = resolvers.passer?.(play);
    const receiver = resolvers.targetedReceiver?.(play);
    
    if (ballCarrier) players.push(ballCarrier);
    if (passer) players.push(passer);
    if (receiver) players.push(receiver);
    
    // Collect play ID
    const playId = resolvers.playId?.(play);
    if (playId) playIds.push(playId);
    
    // Store statistics
    yardsGained.push(yards);
    isSuccess.push(success);
    explosivePlays.push(explosive);
    isTouchdown.push(touchdown);
    isTurnover.push(turnover);
  }
  
  return {
    yardsGained,
    isSuccess,
    explosivePlays,
    isTouchdown,
    isTurnover,
    players,
    playIds
  };
}

/**
 * Calculate effectiveness summary from raw stats
 * @param key Play key
 * @param rawStats Raw aggregated statistics
 * @param allYardsGained All yards gained in dataset (for z-score)
 * @param options Analysis options
 * @returns Play effectiveness summary
 */
export function calculateEffectivenessSummary(
  key: string,
  rawStats: RawPlayStats,
  allYardsGained: number[],
  options: {
    minSamplesPerBucket?: number;
    smoothing?: { enabled: boolean; priorSuccessRate: number; weight: number };
  }
): PlayEffectivenessSummary {
  const sampleSize = rawStats.yardsGained.length;
  const minSamples = options.minSamplesPerBucket ?? 6;
  
  // Calculate raw rates
  const successRate = sampleSize > 0 ? rawStats.isSuccess.filter(Boolean).length / sampleSize : 0;
  const avgYards = sampleSize > 0 ? rawStats.yardsGained.reduce((sum, y) => sum + y, 0) / sampleSize : 0;
  const explosiveRate = sampleSize > 0 ? rawStats.explosivePlays.filter(Boolean).length / sampleSize : 0;
  const tdRate = sampleSize > 0 ? rawStats.isTouchdown.filter(Boolean).length / sampleSize : 0;
  const turnoverRate = sampleSize > 0 ? rawStats.isTurnover.filter(Boolean).length / sampleSize : 0;
  
  // Apply smoothing
  const smoothing = options.smoothing ?? { enabled: true, priorSuccessRate: 0.5, weight: 5 };
  const adjustedSuccessRate = smoothing.enabled 
    ? smoothSuccessRate(successRate, sampleSize, smoothing.priorSuccessRate, smoothing.weight)
    : successRate;
  
  // Calculate z-score for yards
  const zScoreYards = calculateZScore(avgYards, allYardsGained);
  
  // Calculate composite score
  const compositeScore = calculateCompositeScore(
    adjustedSuccessRate,
    zScoreYards,
    explosiveRate,
    turnoverRate,
    tdRate
  );
  
  // Get top players (most frequent)
  const playerCounts = rawStats.players.reduce((acc, player) => {
    acc[player] = (acc[player] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topPlayers = Object.entries(playerCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([player]) => player);
  
  // Get representative plays (best by yards)
  const playYardsPairs = rawStats.yardsGained.map((yards, i) => ({ yards, playId: rawStats.playIds[i] }))
    .filter(pair => pair.playId)
    .sort((a, b) => b.yards - a.yards)
    .slice(0, 3);
  
  const representativePlays = playYardsPairs.map(pair => pair.playId!);
  
  return {
    key,
    sampleSize,
    raw: {
      successRate,
      avgYards,
      explosiveRate,
      tdRate,
      turnoverRate
    },
    adjusted: {
      successRate: adjustedSuccessRate,
      compositeScore,
      lowSample: sampleSize < minSamples
    },
    topPlayers,
    representativePlays
  };
}

/**
 * Group plays by key and calculate effectiveness
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @param options Analysis options
 * @returns Map of play key to effectiveness summary
 */
export function groupPlaysByKey<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>,
  options: {
    explosiveRunYds?: number;
    explosivePassYds?: number;
    dropPenaltyOnly?: boolean;
    minSamplesPerBucket?: number;
    smoothing?: { enabled: boolean; priorSuccessRate: number; weight: number };
    includeMotionInKey?: boolean;
    keyFormat?: (k: PlayKeyParts) => string;
  }
): Map<string, PlayEffectivenessSummary> {
  // Group plays by key
  const playGroups = new Map<string, T[]>();
  
  for (const play of plays) {
    const key = generatePlayKey(play, resolvers, options);
    if (!playGroups.has(key)) {
      playGroups.set(key, []);
    }
    playGroups.get(key)!.push(play);
  }
  
  // Calculate all yards for z-score
  const allYardsGained = plays
    .map(play => resolvers.yardsGained?.(play) ?? 0)
    .filter(yards => !isNaN(yards));
  
  // Calculate effectiveness for each group
  const effectivenessMap = new Map<string, PlayEffectivenessSummary>();
  
  for (const [key, groupPlays] of playGroups) {
    const rawStats = aggregateRawStats(groupPlays, resolvers, options);
    const summary = calculateEffectivenessSummary(key, rawStats, allYardsGained, options);
    effectivenessMap.set(key, summary);
  }
  
  return effectivenessMap;
}
