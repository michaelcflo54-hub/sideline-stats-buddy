/**
 * @fileoverview Main exports for analysis-core package
 * Pure TypeScript football play analysis library with no external dependencies
 */

export interface PlayInput {
  [key: string]: any;
}

/**
 * Field resolvers to extract data from any play input shape
 * @template T The type of play input
 */
export interface FieldResolvers<T extends PlayInput> {
  gameId(p: T): string;
  offenseTeam(p: T): string;
  defenseTeam(p: T): string;
  quarter?(p: T): number | undefined;
  down(p: T): 1 | 2 | 3 | 4 | undefined;
  distance(p: T): number | undefined;          // yards to gain
  yardLineStart(p: T): number | undefined;     // 1–99 toward 100
  yardLineEnd?(p: T): number | undefined;
  yardsGained?(p: T): number | undefined;      // if absent, derive from yardlines
  playFamily?(p: T): string | undefined;       // e.g., "outside_run", "slant"
  formation?(p: T): string | undefined;        // e.g., "Trips Right"
  motionTag?(p: T): string | undefined;        // optional
  defensiveFront?(p: T): string | undefined;   // e.g., "6-2"
  passer?(p: T): string | undefined;
  primaryBallCarrier?(p: T): string | undefined;
  targetedReceiver?(p: T): string | undefined;
  isTouchdown?(p: T): boolean | undefined;
  isTurnover?(p: T): boolean | undefined;
  isPenalty?(p: T): boolean | undefined;
  penaltyYards?(p: T): number | undefined;
  notes?(p: T): string | undefined;
  playId?(p: T): string | undefined;
}

export type DistanceBand = "short" | "medium" | "long" | "very_long";
export type FieldZone = "own_1_20" | "own_21_50" | "opp_49_21" | "red_zone" | "goal_to_go";

export interface SituationQuery {
  down?: 1 | 2 | 3 | 4;
  distanceBand?: DistanceBand;
  fieldZone?: FieldZone;
  formation?: string;
  playFamily?: string;
  defensiveFront?: string;
  isPenalty?: boolean;
}

export interface AnalysisOptions {
  team?: string;                       // focus team
  minSamplesPerBucket?: number;        // default 6
  smoothing?: { enabled: boolean; priorSuccessRate: number; weight: number }; // default {true, 0.5, 5}
  explosiveRunYds?: number;            // default 10
  explosivePassYds?: number;           // default 15
  dropPenaltyOnly?: boolean;           // default true
  includeMotionInKey?: boolean;        // default false
  includeStrengthInKey?: boolean;      // default false
  keyFormat?(k: PlayKeyParts): string; // optional custom label
}

export interface PlayKeyParts {
  formation?: string;
  playFamily?: string;
  motionTag?: string;
}

export interface PlayEffectivenessSummary {
  key: string;
  sampleSize: number;
  raw: {
    successRate: number;
    avgYards: number;
    explosiveRate: number;
    tdRate: number;
    turnoverRate: number;
  };
  adjusted: {
    successRate: number;      // EB-smoothed
    compositeScore: number;   // used for ranking
    lowSample: boolean;
  };
  topPlayers: string[];
  representativePlays: string[]; // best examples by yards/score
}

export interface PlayerStatLine {
  player: string;
  touches: number;
  yards: number;
  successRate: number;
  explosives: number;
  touchdowns: number;
  turnovers: number;
  avgYardsPerTouch: number;
  usageByPlayFamily: Record<string, number>;
}

export interface AnalysisReport {
  meta: { totalPlays: number; team: string };
  situation: SituationQuery;
  rankedPlays: PlayEffectivenessSummary[];
  playerLeaders: PlayerStatLine[];
  byDownDistanceTables: Record<string, PlayEffectivenessSummary[]>;
  warnings: string[];
}

// Re-export all internal modules
export * from './banding';
export * from './metrics';
export * from './grouping';
export * from './players';
export * from './filter';
export * from './analyze';
