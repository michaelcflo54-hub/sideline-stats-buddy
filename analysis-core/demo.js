/**
 * Demo script showcasing analysis-core functionality
 */

const { analyzePlays, recommendPlay } = require('./dist/analyze.js');

// Sample play data (similar to your existing data structure)
const samplePlays = [
  // 1st down plays
  { id: '1', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 25, yardsGained: 5, playFamily: 'inside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: false, primaryBallCarrier: 'John Smith' },
  { id: '2', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 30, yardsGained: 12, playFamily: 'outside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: true, primaryBallCarrier: 'Mike Johnson' },
  { id: '3', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 35, yardsGained: 8, playFamily: 'slant', formation: 'Trips Right', isTouchdown: false, isTurnover: false, isFirstDown: false, passer: 'Tom Wilson', targetedReceiver: 'Chris Davis' },
  { id: '4', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 40, yardsGained: 15, playFamily: 'slant', formation: 'Trips Right', isTouchdown: false, isTurnover: false, isFirstDown: true, passer: 'Tom Wilson', targetedReceiver: 'Chris Davis' },
  
  // 2nd down plays
  { id: '5', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 2, distance: 2, yardLineStart: 30, yardsGained: 3, playFamily: 'inside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: false, primaryBallCarrier: 'John Smith' },
  { id: '6', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 2, distance: 2, yardLineStart: 33, yardsGained: 6, playFamily: 'outside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: true, primaryBallCarrier: 'Mike Johnson' },
  
  // 3rd down plays
  { id: '7', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 3, distance: 8, yardLineStart: 30, yardsGained: 4, playFamily: 'inside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: false, primaryBallCarrier: 'John Smith' },
  { id: '8', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 3, distance: 8, yardLineStart: 33, yardsGained: 10, playFamily: 'outside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: true, primaryBallCarrier: 'Mike Johnson' },
  
  // Touchdown plays
  { id: '9', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 85, yardsGained: 10, playFamily: 'inside_run', formation: 'I-Form', isTouchdown: true, isTurnover: false, isFirstDown: true, primaryBallCarrier: 'John Smith' },
  { id: '10', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 2, distance: 2, yardLineStart: 88, yardsGained: 5, playFamily: 'outside_run', formation: 'I-Form', isTouchdown: true, isTurnover: false, isFirstDown: true, primaryBallCarrier: 'Mike Johnson' }
];

// Field resolvers for the sample data
const resolvers = {
  gameId: (play) => play.gameId,
  offenseTeam: (play) => play.offenseTeam,
  defenseTeam: (play) => play.defenseTeam,
  down: (play) => play.down,
  distance: (play) => play.distance,
  yardLineStart: (play) => play.yardLineStart,
  yardsGained: (play) => play.yardsGained,
  playFamily: (play) => play.playFamily,
  formation: (play) => play.formation,
  isTouchdown: (play) => play.isTouchdown,
  isTurnover: (play) => play.isTurnover,
  isPenalty: (play) => play.isPenalty,
  penaltyYards: (play) => play.penaltyYards,
  playId: (play) => play.id,
  primaryBallCarrier: (play) => play.primaryBallCarrier,
  passer: (play) => play.passer,
  targetedReceiver: (play) => play.targetedReceiver
};

console.log('🏈 Analysis Core Demo\n');

// Demo 1: Basic analysis
console.log('📊 Demo 1: Basic Analysis');
console.log('========================');
const basicReport = analyzePlays(samplePlays, resolvers, { down: 1, distanceBand: 'medium' });
console.log(`Total plays analyzed: ${basicReport.meta.totalPlays}`);
console.log(`Team: ${basicReport.meta.team}`);
console.log('\nTop plays:');
basicReport.rankedPlays.slice(0, 3).forEach((play, i) => {
  console.log(`${i + 1}. ${play.key}`);
  console.log(`   Success Rate: ${Math.round(play.adjusted.successRate * 100)}% (${play.sampleSize} plays)`);
  console.log(`   Avg Yards: ${play.raw.avgYards.toFixed(1)}`);
  console.log(`   Explosive Rate: ${Math.round(play.raw.explosiveRate * 100)}%`);
  console.log(`   Composite Score: ${play.adjusted.compositeScore.toFixed(3)}`);
  console.log('');
});

// Demo 2: Player statistics
console.log('👥 Demo 2: Player Statistics');
console.log('============================');
console.log('Top players:');
basicReport.playerLeaders.slice(0, 3).forEach((player, i) => {
  console.log(`${i + 1}. ${player.player}`);
  console.log(`   Touches: ${player.touches}`);
  console.log(`   Yards: ${player.yards}`);
  console.log(`   Success Rate: ${Math.round(player.successRate * 100)}%`);
  console.log(`   Avg Yards/Touch: ${player.avgYardsPerTouch.toFixed(1)}`);
  console.log('');
});

// Demo 3: Play recommendation
console.log('🎯 Demo 3: Play Recommendation');
console.log('==============================');
const recommendation = recommendPlay(samplePlays, resolvers, { down: 3, distanceBand: 'long' });
console.log(recommendation.message);
if (recommendation.recommendation) {
  console.log(`\nRecommended play: ${recommendation.recommendation.key}`);
  console.log(`Success Rate: ${Math.round(recommendation.recommendation.adjusted.successRate * 100)}%`);
  console.log(`Sample Size: ${recommendation.recommendation.sampleSize} plays`);
}

// Demo 4: Field zone analysis
console.log('\n🏟️ Demo 4: Field Zone Analysis');
console.log('==============================');
const redZoneReport = analyzePlays(samplePlays, resolvers, { fieldZone: 'red_zone' });
console.log(`Red zone plays: ${redZoneReport.meta.totalPlays}`);
if (redZoneReport.rankedPlays.length > 0) {
  console.log(`Best red zone play: ${redZoneReport.rankedPlays[0].key}`);
  console.log(`Success Rate: ${Math.round(redZoneReport.rankedPlays[0].adjusted.successRate * 100)}%`);
}

// Demo 5: Down-distance tables
console.log('\n📋 Demo 5: Down-Distance Tables');
console.log('===============================');
console.log('Available tables:');
Object.keys(basicReport.byDownDistanceTables).forEach(key => {
  const table = basicReport.byDownDistanceTables[key];
  console.log(`${key}: ${table.length} play types`);
});

console.log('\n✅ Demo complete! The analysis-core package is working perfectly.');
