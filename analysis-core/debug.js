// Debug script to test the analysis
const { analyzePlays } = require('./dist/index.js');

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
  playId: (play) => play.id
};

const situation = { down: 1, distanceBand: 'medium' };

console.log('Test plays:', testPlays);
console.log('Situation:', situation);

try {
  const report = analyzePlays(testPlays, resolvers, situation);
  console.log('Report:', JSON.stringify(report, null, 2));
} catch (error) {
  console.error('Error:', error);
}
