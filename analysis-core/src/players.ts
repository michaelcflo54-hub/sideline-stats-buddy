/**
 * @fileoverview Player statistics calculation and aggregation
 */

import type { PlayInput, FieldResolvers, PlayerStatLine } from './index';
import { calculateSuccess, isExplosive } from './metrics';

/**
 * Player touch statistics for aggregation
 */
interface PlayerTouchStats {
  touches: number;
  yards: number;
  successes: number;
  explosives: number;
  touchdowns: number;
  turnovers: number;
  usageByPlayFamily: Record<string, number>;
}

/**
 * Normalize player name for consistent grouping
 * @param name Player name
 * @returns Normalized player name
 */
export function normalizePlayerName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Determine if a player had a touch on this play
 * @param play Play data
 * @param resolvers Field resolvers
 * @param playerName Player name to check
 * @returns True if player had a touch
 */
export function playerHadTouch<T extends PlayInput>(
  play: T,
  resolvers: FieldResolvers<T>,
  playerName: string
): boolean {
  const normalizedName = normalizePlayerName(playerName);
  
  const ballCarrier = resolvers.primaryBallCarrier?.(play);
  const passer = resolvers.passer?.(play);
  const receiver = resolvers.targetedReceiver?.(play);
  
  return (
    (typeof ballCarrier === 'string' && normalizePlayerName(ballCarrier) === normalizedName) ||
    (typeof passer === 'string' && normalizePlayerName(passer) === normalizedName) ||
    (typeof receiver === 'string' && normalizePlayerName(receiver) === normalizedName)
  );
}

/**
 * Get all players who had touches on a play
 * @param play Play data
 * @param resolvers Field resolvers
 * @returns Array of player names who had touches
 */
export function getTouchingPlayers<T extends PlayInput>(
  play: T,
  resolvers: FieldResolvers<T>
): string[] {
  const players: string[] = [];
  
  const ballCarrier = resolvers.primaryBallCarrier?.(play);
  const passer = resolvers.passer?.(play);
  const receiver = resolvers.targetedReceiver?.(play);
  
  if (ballCarrier) players.push(ballCarrier);
  if (passer) players.push(passer);
  if (receiver) players.push(receiver);
  
  return players;
}

/**
 * Aggregate player statistics from plays
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @param options Analysis options
 * @returns Map of player name to statistics
 */
export function aggregatePlayerStats<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>,
  options: {
    explosiveRunYds?: number;
    explosivePassYds?: number;
    dropPenaltyOnly?: boolean;
  }
): Map<string, PlayerTouchStats> {
  const playerStats = new Map<string, PlayerTouchStats>();
  
  for (const play of plays) {
    // Skip penalty-only plays if option is enabled
    if (options.dropPenaltyOnly && resolvers.isPenalty?.(play) && !resolvers.yardsGained?.(play)) {
      continue;
    }
    
    const down = resolvers.down(play);
    const distance = resolvers.distance(play);
    const yards = resolvers.yardsGained?.(play) ?? 0;
    const touchdown = resolvers.isTouchdown?.(play) ?? false;
    const turnover = resolvers.isTurnover?.(play) ?? false;
    const playFamily = resolvers.playFamily?.(play) || 'unknown';
    const playType = playFamily;
    
    // Calculate derived values
    const success = down && distance ? calculateSuccess(down, distance, yards, touchdown) : false;
    const explosive = isExplosive(playType, yards, options.explosiveRunYds, options.explosivePassYds);
    
    // Get all players who had touches
    const touchingPlayers = getTouchingPlayers(play, resolvers);
    
    for (const playerName of touchingPlayers) {
      const normalizedName = normalizePlayerName(playerName);
      
      if (!playerStats.has(normalizedName)) {
        playerStats.set(normalizedName, {
          touches: 0,
          yards: 0,
          successes: 0,
          explosives: 0,
          touchdowns: 0,
          turnovers: 0,
          usageByPlayFamily: {}
        });
      }
      
      const stats = playerStats.get(normalizedName)!;
      
      // Update statistics
      stats.touches += 1;
      stats.yards += yards;
      if (success) stats.successes += 1;
      if (explosive) stats.explosives += 1;
      if (touchdown) stats.touchdowns += 1;
      if (turnover) stats.turnovers += 1;
      
      // Update usage by play family
      stats.usageByPlayFamily[playFamily] = (stats.usageByPlayFamily[playFamily] || 0) + 1;
    }
  }
  
  return playerStats;
}

/**
 * Convert aggregated player stats to PlayerStatLine format
 * @param playerStats Map of player statistics
 * @returns Array of player stat lines
 */
export function convertToPlayerStatLines(playerStats: Map<string, PlayerTouchStats>): PlayerStatLine[] {
  const statLines: PlayerStatLine[] = [];
  
  for (const [player, stats] of playerStats) {
    const successRate = stats.touches > 0 ? stats.successes / stats.touches : 0;
    const avgYardsPerTouch = stats.touches > 0 ? stats.yards / stats.touches : 0;
    
    statLines.push({
      player,
      touches: stats.touches,
      yards: stats.yards,
      successRate,
      explosives: stats.explosives,
      touchdowns: stats.touchdowns,
      turnovers: stats.turnovers,
      avgYardsPerTouch,
      usageByPlayFamily: { ...stats.usageByPlayFamily }
    });
  }
  
  return statLines;
}

/**
 * Get player leaders sorted by various criteria
 * @param statLines Array of player stat lines
 * @param sortBy Sorting criteria
 * @param limit Maximum number of players to return
 * @returns Sorted array of player stat lines
 */
export function getPlayerLeaders(
  statLines: PlayerStatLine[],
  sortBy: 'touches' | 'yards' | 'successRate' | 'avgYardsPerTouch' | 'touchdowns' = 'yards',
  limit: number = 10
): PlayerStatLine[] {
  return statLines
    .sort((a, b) => {
      switch (sortBy) {
        case 'touches':
          return b.touches - a.touches;
        case 'yards':
          return b.yards - a.yards;
        case 'successRate':
          return b.successRate - a.successRate;
        case 'avgYardsPerTouch':
          return b.avgYardsPerTouch - a.avgYardsPerTouch;
        case 'touchdowns':
          return b.touchdowns - a.touchdowns;
        default:
          return b.yards - a.yards;
      }
    })
    .slice(0, limit);
}

/**
 * Calculate comprehensive player statistics from plays
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @param options Analysis options
 * @returns Array of player stat lines sorted by yards
 */
export function calculatePlayerStats<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>,
  options: {
    explosiveRunYds?: number;
    explosivePassYds?: number;
    dropPenaltyOnly?: boolean;
  } = {}
): PlayerStatLine[] {
  const playerStats = aggregatePlayerStats(plays, resolvers, options);
  const statLines = convertToPlayerStatLines(playerStats);
  return getPlayerLeaders(statLines, 'yards', 20); // Top 20 by yards
}
