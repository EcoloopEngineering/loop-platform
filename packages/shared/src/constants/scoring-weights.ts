export const SCORING_WEIGHTS = {
  roof: 0.25,
  energy: 0.30,
  contact: 0.20,
  property: 0.25,
} as const;

export const ROOF_SCORE_MAP = {
  GOOD: 100,
  FAIR: 65,
  POOR: 25,
  UNKNOWN: 40,
} as const;

export const ENERGY_SCORE_THRESHOLDS = [
  { min: 200, score: 100 },
  { min: 150, score: 80 },
  { min: 100, score: 60 },
  { min: 50, score: 35 },
  { min: 1, score: 15 },
] as const;
