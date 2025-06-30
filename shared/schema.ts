import { z, ZodObject, ZodType, ZodTypeAny } from "zod";

export interface MealItem {
  name: string;
  ingredients: string[];
  preparation_time: string;
  cooking_method: string;
  nutritional_focus: string[];
  health_benefits: string[];
  cultural_authenticity: string;
}

export interface DailyGuidelines {
  foods_to_emphasize: string[];
  foods_to_limit: string[];
  hydration_tips: string[];
  timing_recommendations: string[];
  cycle_support?: string[];
}

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

export interface CheckInResponse {
  message: string;
  followUpQuestions: string[];
  adaptiveRecommendations?: string[];
}

// Firestore용 타입 정의
export interface User {
  id: number;
  firebaseUid: string;
  email: string;
  name: string;
  profilePicture?: string;
  createdAt: Date;
}

export interface InsertUser {
  firebaseUid: string;
  email: string;
  name: string;
  profilePicture?: string;
}

export interface OnboardingData {
  id: number;
  userId: number;
  name?: string;
  age: string;
  height?: string;
  weight?: string;
  diet: string;
  symptoms: string[];
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
  completedAt: Date;
}

export interface InsertOnboardingData {
  userId: number;
  name?: string;
  age: string;
  height?: string;
  weight?: string;
  diet: string;
  symptoms: string[];
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
}

export interface ChatMessage {
  id: string;
  userId: number;
  message: string;
  response: string;
  ingredients?: RecommendationCard[];
  createdAt: Date;
}

export interface InsertChatMessage {
  userId: number;
  message: string;
  response: string;
  ingredients?: RecommendationCard[];
}

export interface DailyMealPlan {
  id: number;
  userId: number;
  date: string;
  menstrualPhase: string;
  breakfast: MealItem;
  lunch: MealItem;
  dinner: MealItem;
  snacks: MealItem[];
  dailyGuidelines: DailyGuidelines;
  shoppingList?: Record<string, string[]>;
  createdAt: Date;
}

export interface InsertDailyMealPlan {
  userId: number;
  date: string;
  menstrualPhase: string;
  breakfast: MealItem;
  lunch: MealItem;
  dinner: MealItem;
  snacks: MealItem[];
  dailyGuidelines: DailyGuidelines;
  shoppingList?: Record<string, string[]>;
}

export interface DailyFeedback {
  id: number;
  userId: number;
  mealPlanId: number;
  date: string;
  followedPlan?: boolean;
  enjoyedMeals?: string[];
  dislikedMeals?: string[];
  symptomsImprovement?: Record<string, number>;
  energyLevel?: number;
  digestiveHealth?: number;
  moodRating?: number;
  feedback?: string;
  createdAt: Date;
}

export interface InsertDailyFeedback {
  userId: number;
  mealPlanId: number;
  date: string;
  followedPlan?: boolean;
  enjoyedMeals?: string[];
  dislikedMeals?: string[];
  symptomsImprovement?: Record<string, number>;
  energyLevel?: number;
  digestiveHealth?: number;
  moodRating?: number;
  feedback?: string;
}

export interface ProgressTracking {
  id: number;
  userId: number;
  date: string;
  symptomsSeverity?: Record<string, number>;
  menstrualPhase: string;
  overallWellbeing?: number;
  notes?: string;
  createdAt: Date;
}

export interface InsertProgressTracking {
  userId: number;
  date: string;
  symptomsSeverity?: Record<string, number>;
  menstrualPhase: string;
  overallWellbeing?: number;
  notes?: string;
}

export interface AdminUser {
  id: number;
  username: string;
  passwordHash: string;
  email: string;
  createdAt: Date;
}

export interface InsertAdminUser {
  username: string;
  passwordHash: string;
  email: string;
}

export interface SystemMetrics {
  id: number;
  date: string;
  totalUsers: number;
  activeUsers: number;
  totalMealPlans: number;
  totalChatMessages: number;
  avgUserSatisfaction?: number;
  systemHealth?: Record<string, any>;
  createdAt: Date;
}

export interface InsertSystemMetrics {
  date: string;
  totalUsers: number;
  activeUsers: number;
  totalMealPlans: number;
  totalChatMessages: number;
  avgUserSatisfaction?: number;
  systemHealth?: Record<string, any>;
} 