# Analysis Core

A pure TypeScript football play analysis library with no external dependencies. Provides schema-agnostic analysis of play effectiveness and player statistics for youth football.

## Features

- **Schema-agnostic**: Works with any data structure via field resolvers
- **Pure functions**: No side effects, deterministic results
- **Youth football metrics**: Success rates, explosive plays, composite scoring
- **Empirical Bayes smoothing**: Handles low sample sizes gracefully
- **Comprehensive analysis**: Play ranking, player stats, situation-based filtering

## Installation

```bash
npm install analysis-core
```

## Quick Start

```typescript
import { analyzePlays, recommendPlay } from 'analysis-core';

// Define field resolvers for your data structure
const resolvers = {
  gameId: (play) => play.game_id,
  offenseTeam: (play) => play.team_name,
  down: (play) => play.down,
  distance: (play) => play.distance,
  yardLineStart: (play) => play.yard_line,
  yardsGained: (play) => play.yards_gained,
  playFamily: (play) => play.play_type,
  formation: (play) => play.formation,
  isTouchdown: (play) => play.is_touchdown,
  isTurnover: (play) => play.is_turnover,
  // ... other required fields
};

// Analyze plays for a specific situation
const report = analyzePlays(plays, resolvers, {
  down: 3,
  distanceBand: 'long',
  fieldZone: 'opp_49_21'
});

console.log('Top plays:', report.rankedPlays.slice(0, 3));
console.log('Player leaders:', report.playerLeaders.slice(0, 5));

// Get a play recommendation
const { recommendation, message } = recommendPlay(plays, resolvers, {
  down: 2,
  distanceBand: 'short',
  fieldZone: 'red_zone'
});

console.log(message); // "On 2nd & short in the red zone, *I-Form | outside_run* shows 75% SR (n=8), 6.2 yds/play, 25% explosive, 0% TO."
```

## API Reference

### Core Functions

#### `analyzePlays<T>(plays, resolvers, situation, options?)`

Analyzes plays and returns comprehensive report.

**Parameters:**
- `plays: T[]` - Array of play data
- `resolvers: FieldResolvers<T>` - Field extraction functions
- `situation: SituationQuery` - Situation to analyze
- `options?: AnalysisOptions` - Analysis configuration

**Returns:** `AnalysisReport`

#### `recommendPlay<T>(plays, resolvers, situation, options?)`

Recommends best play for a situation.

**Parameters:** Same as `analyzePlays`

**Returns:** `{ recommendation: PlayEffectivenessSummary | null, message: string, warnings: string[] }`

### Types

#### `FieldResolvers<T>`

Functions to extract data from play objects:

```typescript
interface FieldResolvers<T> {
  gameId(p: T): string;
  offenseTeam(p: T): string;
  defenseTeam(p: T): string;
  down(p: T): 1 | 2 | 3 | 4 | undefined;
  distance(p: T): number | undefined;
  yardLineStart(p: T): number | undefined;
  yardsGained?(p: T): number | undefined;
  playFamily?(p: T): string | undefined;
  formation?(p: T): string | undefined;
  isTouchdown?(p: T): boolean | undefined;
  isTurnover?(p: T): boolean | undefined;
  // ... see full interface
}
```

#### `SituationQuery`

Filter criteria for analysis:

```typescript
interface SituationQuery {
  down?: 1 | 2 | 3 | 4;
  distanceBand?: 'short' | 'medium' | 'long' | 'very_long';
  fieldZone?: 'own_1_20' | 'own_21_50' | 'opp_49_21' | 'red_zone' | 'goal_to_go';
  formation?: string;
  playFamily?: string;
  defensiveFront?: string;
}
```

## Metrics

### Success Rate
- **1st down**: Gain ≥ 50% of distance
- **2nd down**: Gain ≥ 70% of distance  
- **3rd/4th down**: Gain ≥ 100% (conversion)
- **Touchdown**: Always success

### Distance Bands
- **Short**: 0-2 yards
- **Medium**: 3-6 yards
- **Long**: 7-9 yards
- **Very Long**: 10+ yards

### Field Zones
- **Own 1-20**: Own 1-20 yard line
- **Own 21-50**: Own 21-50 yard line
- **Opp 49-21**: Opponent 49-21 yard line
- **Red Zone**: 80-99 yard line
- **Goal to Go**: Distance ≤ 10 and start ≥ 90

### Composite Score
```
composite = 0.55 * successRate_adjusted
          + 0.20 * zScore_yards
          + 0.15 * (explosiveRate - 0.5 * turnoverRate)
          + 0.10 * touchdownRate
```

## Examples

### Basic Analysis

```typescript
const report = analyzePlays(plays, resolvers, { down: 3, distanceBand: 'long' });
```

### Player Statistics

```typescript
const report = analyzePlays(plays, resolvers, {});
console.log('Top rushers:', report.playerLeaders.filter(p => p.usageByPlayFamily.run > 0));
```

### Custom Options

```typescript
const report = analyzePlays(plays, resolvers, situation, {
  minSamplesPerBucket: 10,
  explosiveRunYds: 12,
  explosivePassYds: 18,
  smoothing: { enabled: true, priorSuccessRate: 0.4, weight: 8 }
});
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Type check
npm run type-check

# Build
npm run build
```

## License

MIT
