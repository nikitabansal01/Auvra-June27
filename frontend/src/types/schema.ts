export interface FoodRecommendation {
  type: 'food';
  name: string;
  description: string;
  emoji: string;
  lazy: string;
  tasty: string;
  healthy: string;
}

export interface MovementRecommendation {
  type: 'movement';
  name: string;
  description: string;
  emoji: string;
  gentle: string;
  fun: string;
  strong: string;
}

export interface EmotionRecommendation {
  type: 'emotion';
  name: string;
  description: string;
  emoji: string;
  chill: string;
  creative: string;
  heartfelt: string;
}

export type RecommendationCard = FoodRecommendation | MovementRecommendation | EmotionRecommendation;

export interface ChatResponse {
  message: string;
  ingredients: RecommendationCard[];
}

export interface OnboardingData {
  id?: number;
  userId?: number;
  name?: string;
  age?: string;
  height?: string;
  weight?: string;
  diet?: string;
  symptoms?: string[];
  goals?: string[];
  lifestyle?: Record<string, any>;
  medicalConditions?: string[];
  medications?: string[];
  allergies?: string[];
  lastPeriodDate?: string;
  cycleLength?: string;
  periodLength?: string;
  periodDescription?: string;
  irregularPeriods?: boolean;
  stressLevel?: string;
  sleepHours?: string;
  exerciseLevel?: string;
  waterIntake?: string;
  completedAt?: string;
} 