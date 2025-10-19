/**
 * @fileoverview Main analysis orchestration functions
 */

import type { 
  PlayInput, 
  FieldResolvers, 
  SituationQuery, 
  AnalysisOptions, 
  AnalysisReport, 
  PlayEffectivenessSummary 
} from './index';
import { groupPlaysByKey } from './grouping';
import { calculatePlayerStats } from './players';
import { filterPlaysBySituation, filterPlaysByTeam } from './filter';
import { getDistanceBand, getFieldZone } from './banding';

/**
 * Default analysis options
 */
const DEFAULT_OPTIONS: Required<AnalysisOptions> = {
  team: '',
  minSamplesPerBucket: 6,
  smoothing: { enabled: true, priorSuccessRate: 0.5, weight: 5 },
  explosiveRunYds: 10,
  explosivePassYds: 15,
  dropPenaltyOnly: true,
  includeMotionInKey: false,
  includeStrengthInKey: false,
  keyFormat: (k) => `${k.formation || '—'} | ${k.playFamily || '—'}`
};

/**
 * Merge user options with defaults
 * @param options User-provided options
 * @returns Merged options with defaults
 */
function mergeOptions(options: Partial<AnalysisOptions> = {}): Required<AnalysisOptions> {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    smoothing: {
      ...DEFAULT_OPTIONS.smoothing,
      ...options.smoothing
    }
  };
}

/**
 * Infer team from plays if not specified
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @returns Most common offense team
 */
function inferTeam<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>
): string {
  const teamCounts = new Map<string, number>();
  
  for (const play of plays) {
    const team = resolvers.offenseTeam(play);
    teamCounts.set(team, (teamCounts.get(team) || 0) + 1);
  }
  
  let mostCommonTeam = '';
  let maxCount = 0;
  
  for (const [team, count] of teamCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonTeam = team;
    }
  }
  
  return mostCommonTeam;
}

/**
 * Generate down-distance table key
 * @param down Down number
 * @param distance Distance to gain
 * @returns Table key string
 */
function generateDownDistanceKey(down: number, distance: number): string {
  const band = getDistanceBand(distance);
  return `${down}${band.charAt(0).toUpperCase() + band.slice(1)}`;
}

/**
 * Generate down-distance tables
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @param options Analysis options
 * @returns Map of down-distance keys to play summaries
 */
function generateDownDistanceTables<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>,
  options: Required<AnalysisOptions>
): Record<string, PlayEffectivenessSummary[]> {
  const tables: Record<string, PlayEffectivenessSummary[]> = {};
  
  // Group plays by down and distance band
  const downDistanceGroups = new Map<string, T[]>();
  
  for (const play of plays) {
    const down = resolvers.down(play);
    const distance = resolvers.distance(play);
    
    if (down !== undefined && distance !== undefined) {
      const key = generateDownDistanceKey(down, distance);
      if (!downDistanceGroups.has(key)) {
        downDistanceGroups.set(key, []);
      }
      downDistanceGroups.get(key)!.push(play);
    }
  }
  
  // Calculate effectiveness for each down-distance group
  for (const [key, groupPlays] of downDistanceGroups) {
    const effectivenessMap = groupPlaysByKey(groupPlays, resolvers, options);
    const summaries = Array.from(effectivenessMap.values())
      .sort((a, b) => {
        // Sort by composite score desc, then sample size desc, then avg yards desc
        if (b.adjusted.compositeScore !== a.adjusted.compositeScore) {
          return b.adjusted.compositeScore - a.adjusted.compositeScore;
        }
        if (b.sampleSize !== a.sampleSize) {
          return b.sampleSize - a.sampleSize;
        }
        return b.raw.avgYards - a.raw.avgYards;
      });
    
    tables[key] = summaries;
  }
  
  return tables;
}

/**
 * Analyze plays and generate comprehensive report
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @param situation Situation query
 * @param options Analysis options
 * @returns Complete analysis report
 */
export function analyzePlays<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>,
  situation: SituationQuery,
  options: Partial<AnalysisOptions> = {}
): AnalysisReport {
  const mergedOptions = mergeOptions(options);
  const warnings: string[] = [];
  
  // Infer team if not specified
  if (!mergedOptions.team) {
    mergedOptions.team = inferTeam(plays, resolvers);
  }
  
  // Filter plays by team
  const teamPlays = filterPlaysByTeam(plays, resolvers, mergedOptions.team);
  if (teamPlays.length === 0) {
    warnings.push(`No plays found for team: ${mergedOptions.team}`);
  }
  
  // Filter out penalty-only plays if option is enabled
  let filteredPlays = teamPlays;
  if (mergedOptions.dropPenaltyOnly) {
    filteredPlays = teamPlays.filter(play => {
      const isPenalty = resolvers.isPenalty?.(play) ?? false;
      const yardsGained = resolvers.yardsGained?.(play) ?? 0;
      return !(isPenalty && yardsGained === 0);
    });
  }
  
  // Filter plays by situation
  const situationPlays = filterPlaysBySituation(filteredPlays, resolvers, situation);
  if (situationPlays.length === 0) {
    warnings.push(`No plays found matching situation: ${JSON.stringify(situation)}`);
  }
  
  // Group plays and calculate effectiveness
  const effectivenessMap = groupPlaysByKey(situationPlays, resolvers, mergedOptions);
  const rankedPlays = Array.from(effectivenessMap.values())
    .sort((a, b) => {
      // Deterministic sort: composite score desc → sample size desc → avg yards desc
      if (b.adjusted.compositeScore !== a.adjusted.compositeScore) {
        return b.adjusted.compositeScore - a.adjusted.compositeScore;
      }
      if (b.sampleSize !== a.sampleSize) {
        return b.sampleSize - a.sampleSize;
      }
      return b.raw.avgYards - a.raw.avgYards;
    });
  
  // Calculate player statistics
  const playerLeaders = calculatePlayerStats(situationPlays, resolvers, mergedOptions);
  
  // Generate down-distance tables
  const byDownDistanceTables = generateDownDistanceTables(teamPlays, resolvers, mergedOptions);
  
  return {
    meta: {
      totalPlays: situationPlays.length,
      team: mergedOptions.team
    },
    situation,
    rankedPlays,
    playerLeaders,
    byDownDistanceTables,
    warnings
  };
}

/**
 * Recommend a play for a given situation
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @param situation Situation query
 * @param options Analysis options
 * @returns Play recommendation with message
 */
export function recommendPlay<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>,
  situation: SituationQuery,
  options: Partial<AnalysisOptions> = {}
): { recommendation: PlayEffectivenessSummary | null; message: string; warnings: string[] } {
  const report = analyzePlays(plays, resolvers, situation, options);
  const warnings = [...report.warnings];
  
  if (report.rankedPlays.length === 0) {
    return {
      recommendation: null,
      message: `No plays found for the specified situation.`,
      warnings
    };
  }
  
  const recommendation = report.rankedPlays[0];
  const { down, distanceBand, fieldZone } = situation;
  
  // Build descriptive message
  let situationDesc = '';
  if (down) situationDesc += `${down}${getOrdinalSuffix(down)} & `;
  if (distanceBand) situationDesc += distanceBand.replace('_', '-') + ' ';
  if (fieldZone) situationDesc += `in the ${fieldZone.replace('_', ' ')}`;
  
  const message = `On ${situationDesc.trim()}, *${recommendation.key}* shows ${Math.round(recommendation.adjusted.successRate * 100)}% SR (n=${recommendation.sampleSize}), ${recommendation.raw.avgYards.toFixed(1)} yds/play, ${Math.round(recommendation.raw.explosiveRate * 100)}% explosive, ${Math.round(recommendation.raw.turnoverRate * 100)}% TO.`;
  
  return {
    recommendation,
    message,
    warnings
  };
}

/**
 * Get ordinal suffix for numbers (1st, 2nd, 3rd, 4th)
 * @param num Number
 * @returns Ordinal suffix
 */
function getOrdinalSuffix(num: number): string {
  const lastDigit = num % 10;
  const lastTwoDigits = num % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return 'th';
  }
  
  switch (lastDigit) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
