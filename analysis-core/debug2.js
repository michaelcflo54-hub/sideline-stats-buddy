// Debug script to test player extraction
const { calculatePlayerStats } = require('./dist/players.js');

const testPlays = [
  { id: '1', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 25, yardsGained: 5, playFamily: 'inside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: false, primaryBallCarrier: 'John Smith' }
];

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

console.log('Test plays:', testPlays);
console.log('Primary ball carrier:', resolvers.primaryBallCarrier(testPlays[0]));

try {
  const playerStats = calculatePlayerStats(testPlays, resolvers);
  console.log('Player stats:', JSON.stringify(playerStats, null, 2));
} catch (error) {
  console.error('Error:', error);
}
