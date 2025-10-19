// Debug script to check penalty filtering
const { analyzePlays } = require('./dist/analyze.js');

const testPlays = [
  { id: '1', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 25, yardsGained: 5, playFamily: 'inside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: false, primaryBallCarrier: 'John Smith' },
  { id: '21', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 25, yardsGained: 0, playFamily: 'inside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: false, isPenalty: true, penaltyYards: 5 },
  { id: '22', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 2, distance: 2, yardLineStart: 30, yardsGained: 0, playFamily: 'outside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: false, isPenalty: true, penaltyYards: 10 }
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

const situation = {};

console.log('All plays:');
testPlays.forEach(play => {
  console.log(`Play ${play.id}: isPenalty=${play.isPenalty}, yardsGained=${play.yardsGained}`);
});

try {
  const report = analyzePlays(testPlays, resolvers, situation, { dropPenaltyOnly: true });
  console.log('Report total plays:', report.meta.totalPlays);
  console.log('Report plays:', report.rankedPlays.map(p => ({ key: p.key, sampleSize: p.sampleSize })));
} catch (error) {
  console.error('Error:', error);
}
