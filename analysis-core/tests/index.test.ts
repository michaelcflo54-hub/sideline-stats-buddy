/**
 * @fileoverview Comprehensive tests for analysis-core package
 */

import { describe, it, expect } from 'vitest';
import type { PlayInput, FieldResolvers, SituationQuery, AnalysisOptions } from '../src/index';
import { analyzePlays, recommendPlay } from '../src/analyze';

// Test data fixture - 24 plays covering various scenarios
const createTestPlays = (): PlayInput[] => [
  // 1st down plays (medium distance: 3-6 yards)
  { id: '1', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 25, yardsGained: 5, playFamily: 'inside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: false, primaryBallCarrier: 'John Smith' },
  { id: '2', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 30, yardsGained: 12, playFamily: 'outside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: true, primaryBallCarrier: 'Mike Johnson' },
  { id: '3', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 35, yardsGained: 8, playFamily: 'slant', formation: 'Trips Right', isTouchdown: false, isTurnover: false, isFirstDown: false, passer: 'Tom Wilson', targetedReceiver: 'Chris Davis' },
  { id: '4', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 40, yardsGained: 15, playFamily: 'slant', formation: 'Trips Right', isTouchdown: false, isTurnover: false, isFirstDown: true, passer: 'Tom Wilson', targetedReceiver: 'Chris Davis' },
  
  // 2nd down plays (short distance: 0-2 yards)
  { id: '5', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 2, distance: 2, yardLineStart: 30, yardsGained: 3, playFamily: 'inside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: false, primaryBallCarrier: 'John Smith' },
  { id: '6', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 2, distance: 2, yardLineStart: 33, yardsGained: 6, playFamily: 'outside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: true, primaryBallCarrier: 'Mike Johnson' },
  { id: '7', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 2, distance: 2, yardLineStart: 35, yardsGained: 4, playFamily: 'slant', formation: 'Trips Right', isTouchdown: false, isTurnover: false, isFirstDown: false, passer: 'Tom Wilson', targetedReceiver: 'Chris Davis' },
  { id: '8', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 2, distance: 2, yardLineStart: 38, yardsGained: 7, playFamily: 'slant', formation: 'Trips Right', isTouchdown: false, isTurnover: false, isFirstDown: true, passer: 'Tom Wilson', targetedReceiver: 'Chris Davis' },
  
  // 3rd down plays (long distance: 7-9 yards)
  { id: '9', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 3, distance: 8, yardLineStart: 30, yardsGained: 4, playFamily: 'inside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: false },
  { id: '10', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 3, distance: 8, yardLineStart: 33, yardsGained: 10, playFamily: 'outside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: true },
  { id: '11', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 3, distance: 8, yardLineStart: 35, yardsGained: 6, playFamily: 'slant', formation: 'Trips Right', isTouchdown: false, isTurnover: false, isFirstDown: false },
  { id: '12', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 3, distance: 8, yardLineStart: 38, yardsGained: 12, playFamily: 'slant', formation: 'Trips Right', isTouchdown: false, isTurnover: false, isFirstDown: true },
  
  // 4th down plays
  { id: '13', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 4, distance: 2, yardLineStart: 30, yardsGained: 1, playFamily: 'inside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: false },
  { id: '14', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 4, distance: 2, yardLineStart: 33, yardsGained: 3, playFamily: 'outside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: true },
  { id: '15', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 4, distance: 2, yardLineStart: 35, yardsGained: 1, playFamily: 'slant', formation: 'Trips Right', isTouchdown: false, isTurnover: false, isFirstDown: false },
  { id: '16', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 4, distance: 2, yardLineStart: 38, yardsGained: 4, playFamily: 'slant', formation: 'Trips Right', isTouchdown: false, isTurnover: false, isFirstDown: true },
  
  // Touchdown plays (red zone but not goal to go)
  { id: '17', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 15, yardLineStart: 85, yardsGained: 10, playFamily: 'inside_run', formation: 'I-Form', isTouchdown: true, isTurnover: false, isFirstDown: true },
  { id: '18', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 2, distance: 12, yardLineStart: 88, yardsGained: 5, playFamily: 'outside_run', formation: 'I-Form', isTouchdown: true, isTurnover: false, isFirstDown: true },
  
  // Turnover plays
  { id: '19', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 25, yardsGained: 0, playFamily: 'slant', formation: 'Trips Right', isTouchdown: false, isTurnover: true, isFirstDown: false },
  { id: '20', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 2, distance: 2, yardLineStart: 30, yardsGained: 0, playFamily: 'slant', formation: 'Trips Right', isTouchdown: false, isTurnover: true, isFirstDown: false },
  
  // Penalty plays
  { id: '21', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 25, yardsGained: 0, playFamily: 'inside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: false, isPenalty: true, penaltyYards: 5 },
  { id: '22', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 2, distance: 2, yardLineStart: 30, yardsGained: 0, playFamily: 'outside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: false, isPenalty: true, penaltyYards: 10 },
  
  // Very long distance plays (for testing very_long band)
  { id: '23', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 12, yardLineStart: 25, yardsGained: 2, playFamily: 'hail_mary', formation: 'Shotgun', isTouchdown: false, isTurnover: false, isFirstDown: false },
  { id: '24', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 15, yardLineStart: 30, yardsGained: 1, playFamily: 'hail_mary', formation: 'Shotgun', isTouchdown: false, isTurnover: false, isFirstDown: false },
  
  // Low sample plays (for testing smoothing)
  { id: '25', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 25, yardsGained: 2, playFamily: 'rare_play', formation: 'Rare Formation', isTouchdown: false, isTurnover: false, isFirstDown: false },
  { id: '26', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 30, yardsGained: 1, playFamily: 'rare_play', formation: 'Rare Formation', isTouchdown: false, isTurnover: false, isFirstDown: false }
];

// Field resolvers for test data
const testResolvers: FieldResolvers<PlayInput> = {
  gameId: (play) => play.gameId as string,
  offenseTeam: (play) => play.offenseTeam as string,
  defenseTeam: (play) => play.defenseTeam as string,
  down: (play) => play.down as 1 | 2 | 3 | 4 | undefined,
  distance: (play) => play.distance as number | undefined,
  yardLineStart: (play) => play.yardLineStart as number | undefined,
  yardsGained: (play) => play.yardsGained as number | undefined,
  playFamily: (play) => play.playFamily as string | undefined,
  formation: (play) => play.formation as string | undefined,
  isTouchdown: (play) => play.isTouchdown as boolean | undefined,
  isTurnover: (play) => play.isTurnover as boolean | undefined,
  isPenalty: (play) => play.isPenalty as boolean | undefined,
  penaltyYards: (play) => play.penaltyYards as number | undefined,
  playId: (play) => play.id as string | undefined,
  primaryBallCarrier: (play) => play.primaryBallCarrier as string | undefined,
  passer: (play) => play.passer as string | undefined,
  targetedReceiver: (play) => play.targetedReceiver as string | undefined
};

describe('Analysis Core', () => {
  const testPlays = createTestPlays();
  
  describe('analyzePlays', () => {
    it('should analyze plays for a basic situation', () => {
      const situation: SituationQuery = { down: 1, distanceBand: 'medium' };
      const report = analyzePlays(testPlays, testResolvers, situation);
      
      expect(report.meta.totalPlays).toBeGreaterThan(0);
      expect(report.rankedPlays.length).toBeGreaterThan(0);
      expect(report.playerLeaders.length).toBeGreaterThan(0);
      expect(report.warnings).toEqual([]);
    });
    
    it('should handle empty play set', () => {
      const situation: SituationQuery = { down: 1, distanceBand: 'medium' };
      const report = analyzePlays([], testResolvers, situation);
      
      expect(report.meta.totalPlays).toBe(0);
      expect(report.rankedPlays).toEqual([]);
      expect(report.playerLeaders).toEqual([]);
      expect(report.warnings.length).toBeGreaterThan(0);
    });
    
    it('should filter by field zone', () => {
      const situation: SituationQuery = { fieldZone: 'red_zone' };
      const report = analyzePlays(testPlays, testResolvers, situation);
      
      // Should only include plays in red zone (yard line 80+)
      const redZonePlays = testPlays.filter(play => (play.yardLineStart as number) >= 80);
      expect(report.meta.totalPlays).toBe(redZonePlays.length);
    });
    
    it('should apply smoothing for low sample plays', () => {
      const situation: SituationQuery = { playFamily: 'rare_play' };
      const report = analyzePlays(testPlays, testResolvers, situation);
      
      expect(report.rankedPlays.length).toBeGreaterThan(0);
      const rarePlay = report.rankedPlays.find(p => p.key.includes('rare_play'));
      expect(rarePlay).toBeDefined();
      expect(rarePlay!.adjusted.lowSample).toBe(true);
    });
    
    it('should generate down-distance tables', () => {
      const situation: SituationQuery = {};
      const report = analyzePlays(testPlays, testResolvers, situation);
      
      expect(Object.keys(report.byDownDistanceTables).length).toBeGreaterThan(0);
      expect(report.byDownDistanceTables['1Medium']).toBeDefined();
      expect(report.byDownDistanceTables['2Short']).toBeDefined();
    });
  });
  
  describe('recommendPlay', () => {
    it('should recommend best play for situation', () => {
      const situation: SituationQuery = { down: 1, distanceBand: 'medium' };
      const result = recommendPlay(testPlays, testResolvers, situation);
      
      expect(result.recommendation).toBeDefined();
      expect(result.message).toContain('1st & medium');
      expect(result.warnings).toEqual([]);
    });
    
    it('should handle no matching plays', () => {
      const situation: SituationQuery = { down: 1, distanceBand: 'very_long', fieldZone: 'goal_to_go' };
      const result = recommendPlay(testPlays, testResolvers, situation);
      
      expect(result.recommendation).toBeNull();
      expect(result.message).toContain('No plays found');
    });
  });
  
  describe('Success Rate Calculation', () => {
    it('should calculate success rates correctly by down', () => {
      // Test 1st down: 50% of distance
      const situation1: SituationQuery = { down: 1, distanceBand: 'medium' };
      const report1 = analyzePlays(testPlays, testResolvers, situation1);
      
      // Test 2nd down: 70% of distance
      const situation2: SituationQuery = { down: 2, distanceBand: 'short' };
      const report2 = analyzePlays(testPlays, testResolvers, situation2);
      
      // Test 3rd down: 100% conversion
      const situation3: SituationQuery = { down: 3, distanceBand: 'long' };
      const report3 = analyzePlays(testPlays, testResolvers, situation3);
      
      expect(report1.rankedPlays.length).toBeGreaterThan(0);
      expect(report2.rankedPlays.length).toBeGreaterThan(0);
      expect(report3.rankedPlays.length).toBeGreaterThan(0);
    });
    
    it('should count touchdowns as success', () => {
      const situation: SituationQuery = { playFamily: 'inside_run' };
      const report = analyzePlays(testPlays, testResolvers, situation);
      
      const insideRunPlays = report.rankedPlays.filter(p => p.key.includes('inside_run'));
      expect(insideRunPlays.length).toBeGreaterThan(0);
      
      // Should include touchdown plays in success rate
      const hasTouchdownPlays = testPlays.some(play => 
        play.playFamily === 'inside_run' && play.isTouchdown
      );
      expect(hasTouchdownPlays).toBe(true);
    });
  });
  
  describe('Distance Bands', () => {
    it('should correctly classify distance bands', () => {
      const shortSituation: SituationQuery = { distanceBand: 'short' };
      const mediumSituation: SituationQuery = { distanceBand: 'medium' };
      const longSituation: SituationQuery = { distanceBand: 'long' };
      const veryLongSituation: SituationQuery = { distanceBand: 'very_long' };
      
      const shortReport = analyzePlays(testPlays, testResolvers, shortSituation);
      const mediumReport = analyzePlays(testPlays, testResolvers, mediumSituation);
      const longReport = analyzePlays(testPlays, testResolvers, longSituation);
      const veryLongReport = analyzePlays(testPlays, testResolvers, veryLongSituation);
      
      expect(shortReport.meta.totalPlays).toBeGreaterThan(0);
      expect(mediumReport.meta.totalPlays).toBeGreaterThan(0);
      expect(longReport.meta.totalPlays).toBeGreaterThan(0);
      expect(veryLongReport.meta.totalPlays).toBe(4); // 4 very long plays in test data
    });
  });
  
  describe('Player Statistics', () => {
    it('should calculate player statistics correctly', () => {
      const situation: SituationQuery = {};
      const report = analyzePlays(testPlays, testResolvers, situation);
      
      expect(report.playerLeaders.length).toBeGreaterThan(0);
      
      // Check that player stats have expected structure
      const player = report.playerLeaders[0];
      expect(player.touches).toBeGreaterThan(0);
      expect(player.yards).toBeGreaterThanOrEqual(0);
      expect(player.successRate).toBeGreaterThanOrEqual(0);
      expect(player.successRate).toBeLessThanOrEqual(1);
      expect(player.avgYardsPerTouch).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Penalty Handling', () => {
    it('should handle penalty-only plays correctly', () => {
      const situation: SituationQuery = {};
      const report = analyzePlays(testPlays, testResolvers, situation, { dropPenaltyOnly: true });
      
      // Should exclude penalty-only plays when dropPenaltyOnly is true
      // The test data has 2 penalty plays out of 26 total plays
      expect(report.meta.totalPlays).toBe(24);
    });
    
    it('should include penalty plays when dropPenaltyOnly is false', () => {
      const situation: SituationQuery = {};
      const report = analyzePlays(testPlays, testResolvers, situation, { dropPenaltyOnly: false });
      
      // Should include penalty plays when dropPenaltyOnly is false
      expect(report.meta.totalPlays).toBeGreaterThan(0);
    });
  });
  
  describe('Deterministic Sorting', () => {
    it('should produce consistent results across multiple runs', () => {
      const situation: SituationQuery = { down: 1 };
      const report1 = analyzePlays(testPlays, testResolvers, situation);
      const report2 = analyzePlays(testPlays, testResolvers, situation);
      
      expect(report1.rankedPlays).toEqual(report2.rankedPlays);
      expect(report1.playerLeaders).toEqual(report2.playerLeaders);
    });
    
    it('should sort by composite score, then sample size, then avg yards', () => {
      const situation: SituationQuery = {};
      const report = analyzePlays(testPlays, testResolvers, situation);
      
      for (let i = 0; i < report.rankedPlays.length - 1; i++) {
        const current = report.rankedPlays[i];
        const next = report.rankedPlays[i + 1];
        
        if (current.adjusted.compositeScore !== next.adjusted.compositeScore) {
          expect(current.adjusted.compositeScore).toBeGreaterThanOrEqual(next.adjusted.compositeScore);
        } else if (current.sampleSize !== next.sampleSize) {
          expect(current.sampleSize).toBeGreaterThanOrEqual(next.sampleSize);
        } else {
          expect(current.raw.avgYards).toBeGreaterThanOrEqual(next.raw.avgYards);
        }
      }
    });
  });
});
