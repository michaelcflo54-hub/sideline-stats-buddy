/**
 * @fileoverview Play filtering utilities for situation-based analysis
 */

import type { PlayInput, FieldResolvers, SituationQuery } from './index';
import { getDistanceBand, getFieldZone } from './banding';

/**
 * Check if a play matches the situation query
 * @param play Play data
 * @param resolvers Field resolvers
 * @param situation Situation query
 * @returns True if play matches the situation
 */
export function matchesSituation<T extends PlayInput>(
  play: T,
  resolvers: FieldResolvers<T>,
  situation: SituationQuery
): boolean {
  // Check down
  if (situation.down !== undefined) {
    const playDown = resolvers.down(play);
    if (playDown !== situation.down) return false;
  }
  
  // Check distance band
  if (situation.distanceBand !== undefined) {
    const distance = resolvers.distance(play);
    if (distance === undefined) return false;
    if (getDistanceBand(distance) !== situation.distanceBand) return false;
  }
  
  // Check field zone
  if (situation.fieldZone !== undefined) {
    const yardLineStart = resolvers.yardLineStart(play);
    const distance = resolvers.distance(play);
    if (yardLineStart === undefined || distance === undefined) return false;
    if (getFieldZone(yardLineStart, distance) !== situation.fieldZone) return false;
  }
  
  // Check formation
  if (situation.formation !== undefined) {
    const playFormation = resolvers.formation?.(play);
    if (!playFormation || !playFormation.toLowerCase().includes(situation.formation.toLowerCase())) {
      return false;
    }
  }
  
  // Check play family
  if (situation.playFamily !== undefined) {
    const playFamily = resolvers.playFamily?.(play);
    if (!playFamily || !playFamily.toLowerCase().includes(situation.playFamily.toLowerCase())) {
      return false;
    }
  }
  
  // Check defensive front
  if (situation.defensiveFront !== undefined) {
    const defensiveFront = resolvers.defensiveFront?.(play);
    if (!defensiveFront || !defensiveFront.toLowerCase().includes(situation.defensiveFront.toLowerCase())) {
      return false;
    }
  }
  
  // Check penalty status
  if (situation.isPenalty !== undefined) {
    const isPenalty = resolvers.isPenalty?.(play) ?? false;
    if (isPenalty !== situation.isPenalty) {
      return false;
    }
  }
  
  return true;
}

/**
 * Filter plays by situation
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @param situation Situation query
 * @returns Filtered array of plays
 */
export function filterPlaysBySituation<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>,
  situation: SituationQuery
): T[] {
  return plays.filter(play => matchesSituation(play, resolvers, situation));
}

/**
 * Filter plays by team
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @param team Team name
 * @returns Filtered array of plays for the team
 */
export function filterPlaysByTeam<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>,
  team: string
): T[] {
  return plays.filter(play => {
    const offenseTeam = resolvers.offenseTeam(play);
    return offenseTeam.toLowerCase().includes(team.toLowerCase());
  });
}

/**
 * Filter plays by game
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @param gameId Game ID
 * @returns Filtered array of plays for the game
 */
export function filterPlaysByGame<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>,
  gameId: string
): T[] {
  return plays.filter(play => resolvers.gameId(play) === gameId);
}

/**
 * Filter plays by quarter
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @param quarter Quarter number (1-4)
 * @returns Filtered array of plays for the quarter
 */
export function filterPlaysByQuarter<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>,
  quarter: number
): T[] {
  return plays.filter(play => {
    const playQuarter = resolvers.quarter?.(play);
    return playQuarter === quarter;
  });
}

/**
 * Filter plays by down
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @param down Down number (1-4)
 * @returns Filtered array of plays for the down
 */
export function filterPlaysByDown<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>,
  down: number
): T[] {
  return plays.filter(play => resolvers.down(play) === down);
}

/**
 * Filter plays by distance range
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @param minDistance Minimum distance
 * @param maxDistance Maximum distance
 * @returns Filtered array of plays in distance range
 */
export function filterPlaysByDistanceRange<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>,
  minDistance: number,
  maxDistance: number
): T[] {
  return plays.filter(play => {
    const distance = resolvers.distance(play);
    return distance !== undefined && distance >= minDistance && distance <= maxDistance;
  });
}

/**
 * Filter plays by field position range
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @param minYardLine Minimum yard line
 * @param maxYardLine Maximum yard line
 * @returns Filtered array of plays in field position range
 */
export function filterPlaysByFieldPosition<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>,
  minYardLine: number,
  maxYardLine: number
): T[] {
  return plays.filter(play => {
    const yardLine = resolvers.yardLineStart(play);
    return yardLine !== undefined && yardLine >= minYardLine && yardLine <= maxYardLine;
  });
}

/**
 * Filter plays by play type
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @param playType Play type to filter by
 * @returns Filtered array of plays of the specified type
 */
export function filterPlaysByType<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>,
  playType: string
): T[] {
  return plays.filter(play => {
    const playFamily = resolvers.playFamily?.(play);
    return playFamily && playFamily.toLowerCase().includes(playType.toLowerCase());
  });
}

/**
 * Get unique values for a field across all plays
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @param fieldExtractor Function to extract field value
 * @returns Array of unique values
 */
export function getUniqueFieldValues<T extends PlayInput, U>(
  plays: T[],
  fieldExtractor: (play: T) => U | undefined
): U[] {
  const values = new Set<U>();
  
  for (const play of plays) {
    const value = fieldExtractor(play);
    if (value !== undefined) {
      values.add(value);
    }
  }
  
  return Array.from(values);
}

/**
 * Get available formations from plays
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @returns Array of unique formations
 */
export function getAvailableFormations<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>
): string[] {
  return getUniqueFieldValues(plays, play => resolvers.formation?.(play))
    .filter((formation): formation is string => typeof formation === 'string')
    .sort();
}

/**
 * Get available play families from plays
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @returns Array of unique play families
 */
export function getAvailablePlayFamilies<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>
): string[] {
  return getUniqueFieldValues(plays, play => resolvers.playFamily?.(play))
    .filter((family): family is string => typeof family === 'string')
    .sort();
}

/**
 * Get available defensive fronts from plays
 * @param plays Array of plays
 * @param resolvers Field resolvers
 * @returns Array of unique defensive fronts
 */
export function getAvailableDefensiveFronts<T extends PlayInput>(
  plays: T[],
  resolvers: FieldResolvers<T>
): string[] {
  return getUniqueFieldValues(plays, play => resolvers.defensiveFront?.(play))
    .filter((front): front is string => typeof front === 'string')
    .sort();
}
