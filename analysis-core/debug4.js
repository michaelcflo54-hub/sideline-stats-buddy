// Debug script to test penalty filtering
const { analyzePlays } = require('./dist/analyze.js');

const testPlays = [
  { id: '21', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 25, yardsGained: 0, playFamily: 'inside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: false, isPenalty: true, penaltyYards: 5 }
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

const situation = { isPenalty: true };

console.log('Test play:', testPlays[0]);
console.log('Is penalty:', resolvers.isPenalty(testPlays[0]));
console.log('Yards gained:', resolvers.yardsGained(testPlays[0]));

try {
  const report = analyzePlays(testPlays, resolvers, situation, { dropPenaltyOnly: true });
  console.log('Report total plays:', report.meta.totalPlays);
  console.log('Report:', JSON.stringify(report, null, 2));
} catch (error) {
  console.error('Error:', error);
}
