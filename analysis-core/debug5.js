// Debug script to check very long distance plays
const { analyzePlays } = require('./dist/analyze.js');

const testPlays = [
  { id: '1', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 25, yardsGained: 5, playFamily: 'inside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: false, primaryBallCarrier: 'John Smith' },
  { id: '2', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 30, yardsGained: 12, playFamily: 'outside_run', formation: 'I-Form', isTouchdown: false, isTurnover: false, isFirstDown: true, primaryBallCarrier: 'Mike Johnson' },
  { id: '3', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 35, yardsGained: 8, playFamily: 'slant', formation: 'Trips Right', isTouchdown: false, isTurnover: false, isFirstDown: false, passer: 'Tom Wilson', targetedReceiver: 'Chris Davis' },
  { id: '4', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 5, yardLineStart: 40, yardsGained: 15, playFamily: 'slant', formation: 'Trips Right', isTouchdown: false, isTurnover: false, isFirstDown: true, passer: 'Tom Wilson', targetedReceiver: 'Chris Davis' },
  { id: '23', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 12, yardLineStart: 25, yardsGained: 2, playFamily: 'hail_mary', formation: 'Shotgun', isTouchdown: false, isTurnover: false, isFirstDown: false },
  { id: '24', gameId: 'game1', offenseTeam: 'Team A', defenseTeam: 'Team B', down: 1, distance: 15, yardLineStart: 30, yardsGained: 1, playFamily: 'hail_mary', formation: 'Shotgun', isTouchdown: false, isTurnover: false, isFirstDown: false }
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

const situation = { distanceBand: 'very_long' };

console.log('All plays with distance >= 10:');
testPlays.forEach(play => {
  if (play.distance >= 10) {
    console.log(`Play ${play.id}: distance=${play.distance}, playFamily=${play.playFamily}`);
  }
});

try {
  const report = analyzePlays(testPlays, resolvers, situation);
  console.log('Very long report total plays:', report.meta.totalPlays);
  console.log('Very long plays:', report.rankedPlays.map(p => ({ key: p.key, sampleSize: p.sampleSize })));
} catch (error) {
  console.error('Error:', error);
}
