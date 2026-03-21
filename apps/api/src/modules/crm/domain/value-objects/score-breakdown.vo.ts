export class ScoreBreakdown {
  readonly totalScore: number;
  readonly roofScore: number;
  readonly energyScore: number;
  readonly contactScore: number;
  readonly propertyScore: number;

  constructor(props: {
    totalScore: number;
    roofScore: number;
    energyScore: number;
    contactScore: number;
    propertyScore: number;
  }) {
    this.totalScore = props.totalScore;
    this.roofScore = props.roofScore;
    this.energyScore = props.energyScore;
    this.contactScore = props.contactScore;
    this.propertyScore = props.propertyScore;
  }

  get isHighQuality(): boolean {
    return this.totalScore >= 70;
  }

  get isMediumQuality(): boolean {
    return this.totalScore >= 40 && this.totalScore < 70;
  }

  get isLowQuality(): boolean {
    return this.totalScore < 40;
  }

  equals(other: ScoreBreakdown): boolean {
    return (
      this.totalScore === other.totalScore &&
      this.roofScore === other.roofScore &&
      this.energyScore === other.energyScore &&
      this.contactScore === other.contactScore &&
      this.propertyScore === other.propertyScore
    );
  }
}
