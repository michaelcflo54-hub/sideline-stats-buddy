/**
 * @fileoverview Distance band and field zone classification utilities
 */

import type { DistanceBand, FieldZone } from './index';

/**
 * Classify distance into bands based on youth football conventions
 * @param distance Yards to gain
 * @returns Distance band classification
 */
export function getDistanceBand(distance: number): DistanceBand {
  if (distance <= 2) return "short";
  if (distance <= 6) return "medium";
  if (distance <= 9) return "long";
  return "very_long";
}

/**
 * Classify field position into zones (offense perspective, moving toward 100)
 * @param yardLineStart Starting yard line (1-99)
 * @param distance Yards to gain
 * @returns Field zone classification
 */
export function getFieldZone(yardLineStart: number, distance: number): FieldZone {
  // Goal to go: distance <= 10 and start >= 90
  if (distance <= 10 && yardLineStart >= 90) {
    return "goal_to_go";
  }
  
  // Red zone: 80-99
  if (yardLineStart >= 80) {
    return "red_zone";
  }
  
  // Opponent territory: 51-79
  if (yardLineStart >= 51) {
    return "opp_49_21";
  }
  
  // Own territory: 21-50
  if (yardLineStart >= 21) {
    return "own_21_50";
  }
  
  // Own 1-20
  return "own_1_20";
}

/**
 * Check if a play matches the specified distance band
 * @param distance Yards to gain
 * @param targetBand Target distance band
 * @returns True if play matches the band
 */
export function matchesDistanceBand(distance: number, targetBand: DistanceBand): boolean {
  return getDistanceBand(distance) === targetBand;
}

/**
 * Check if a play matches the specified field zone
 * @param yardLineStart Starting yard line
 * @param distance Yards to gain
 * @param targetZone Target field zone
 * @returns True if play matches the zone
 */
export function matchesFieldZone(yardLineStart: number, distance: number, targetZone: FieldZone): boolean {
  return getFieldZone(yardLineStart, distance) === targetZone;
}

/**
 * Get all distance bands for iteration
 * @returns Array of all distance bands
 */
export function getAllDistanceBands(): DistanceBand[] {
  return ["short", "medium", "long", "very_long"];
}

/**
 * Get all field zones for iteration
 * @returns Array of all field zones
 */
export function getAllFieldZones(): FieldZone[] {
  return ["own_1_20", "own_21_50", "opp_49_21", "red_zone", "goal_to_go"];
}
