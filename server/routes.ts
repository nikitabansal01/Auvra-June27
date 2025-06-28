import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertOnboardingSchema, insertChatMessageSchema, type RecommendationCard, type ChatResponse, type User } from "@shared/schema";
import { z } from "zod";
import OpenAI from 'openai';
import { researchService } from './research';
import { evaluationMetricsService } from './evaluation-metrics';
import { ENHANCED_TRAINING_PROMPT, validateImplementationMethods } from './llm-training-guide';
import { nutritionistService, type DailyMealPlan } from './nutritionist';
import { pdfGeneratorService } from './pdf-generator';
import { auth as firebaseAuth } from './firebase-admin';
import { adaptiveMealPlannerService } from './adaptive-meal-planner';
import { adminAuthService } from './admin-auth';

interface AuthenticatedRequest extends Request {
  user: User;
}

// Enhanced demo response function with meal plan detection
function generateDemoResponse(message: string, onboardingData: any): ChatResponse {
  const lowerMessage = message.toLowerCase();
  const diet = onboardingData?.diet || 'balanced';
  
  // Check if this is a diet/nutrition question vs general health information
  const isDietQuestion = /\b(eat|food|diet|nutrition|meal|recipe|cook|supplement|ingredient|consume|drink|take|add|help with|bloating|digestion)\b/i.test(message);
  
  // Check if user is asking for meal plans
  if (lowerMessage.includes('meal plan') || lowerMessage.includes('what to eat') || 
      lowerMessage.includes('food plan') || lowerMessage.includes('diet plan') ||
      lowerMessage.includes('recipes for') || lowerMessage.includes('meals for')) {
    
    return {
      message: `I can create a personalized meal plan for you! Based on your profile, I'll design meals that address your specific health needs. Use the meal plan generator in your dashboard to select your preferred cuisine (Indian, Mediterranean, Japanese, Mexican, or American) and choose from daily, weekly, or monthly plans with downloadable PDFs. I'll create complete meal plans with recipes, shopping lists, and nutritional guidance tailored to your conditions.`,
      ingredients: [
        {
          name: "Personalized Meal Planning",
          description: "AI-generated meal plans based on your health conditions and cuisine preferences",
          emoji: "🍽️",
          lazy: "Use the meal plan generator with one-click cuisine selection",
          tasty: "Choose from 4 authentic cuisines with flavorful, culturally-relevant recipes",
          healthy: "Get evidence-based meal timing, portion guidance, and therapeutic food combinations"
        }
      ]
    };
  }

  // Handle general health information questions (no food recommendations)
  if (!isDietQuestion) {
    if (lowerMessage.includes('pcos') || lowerMessage.includes('polycystic')) {
      return {
        message: `## PCOS (Polycystic Ovary Syndrome)

PCOS is a hormonal disorder affecting reproductive-aged women, characterized by irregular periods and elevated androgen levels.

### 🔍 Key Symptoms
• **Menstrual irregularities** - Irregular or missed periods
• **Hormonal signs** - Excess androgen levels causing acne and hirsutism
• **Ovarian changes** - Polycystic ovaries visible on ultrasound
• **Weight challenges** - Weight gain or difficulty losing weight
• **Metabolic issues** - Insulin resistance and blood sugar problems

### 🏥 Health Impacts
• **Diabetes risk** - Increased risk of type 2 diabetes and heart disease
• **Fertility concerns** - Challenges with ovulation and conception
• **Mental health** - Higher rates of anxiety and depression
• **Long-term effects** - Cardiovascular and metabolic complications

### 💊 Management Approaches
• **Medical monitoring** - Regular check-ups with healthcare providers
• **Lifestyle changes** - Exercise, stress management, and weight control
• **Hormonal treatments** - Birth control pills, metformin, or other medications
• **Fertility support** - Specialized treatments when planning pregnancy

*💡 For personalized nutritional support, ask about "foods for PCOS" or "PCOS meal plans"*`,
        ingredients: []
      };
    }

    if (lowerMessage.includes('endometriosis')) {
      return {
        message: `## Endometriosis

Endometriosis is a chronic condition where tissue similar to the uterine lining grows outside the uterus, causing inflammation and pain.

### 🔍 Common Symptoms
• **Severe pelvic pain** - Intense cramping during menstruation
• **Intimate discomfort** - Pain during or after sexual intercourse
• **Heavy bleeding** - Irregular or abnormally heavy menstrual periods
• **Digestive issues** - Bloating, nausea, and bowel problems during periods
• **Chronic fatigue** - Persistent exhaustion and low energy levels

### 💊 Treatment Options
• **Pain management** - NSAIDs, prescription medications, and hormonal therapy
• **Surgical interventions** - Laparoscopy and endometrial tissue excision
• **Hormone therapy** - Treatments to reduce estrogen production
• **Physical therapy** - Specialized pelvic floor rehabilitation

### 🌿 Lifestyle Support
• **Heat therapy** - Heating pads and warm baths for pain relief
• **Gentle exercise** - Low-impact activities like yoga and walking
• **Stress management** - Meditation, breathing exercises, and relaxation techniques
• **Quality sleep** - Consistent sleep schedule and restful environment

*💡 For anti-inflammatory nutrition support, ask about "foods for endometriosis" or "anti-inflammatory meal plans"*`,
        ingredients: []
      };
    }

    if (lowerMessage.includes('sleep') || lowerMessage.includes('insomnia')) {
      return {
        message: `Sleep quality is crucial for hormonal balance and overall women's health.

**Sleep Hygiene Tips:**
- Maintain consistent bedtime and wake times
- Create a dark, cool, quiet sleep environment
- Limit screen time 1-2 hours before bed
- Avoid caffeine after 2 PM

**Hormonal Sleep Factors:**
- Estrogen and progesterone fluctuations affect sleep
- PMS can cause sleep disturbances
- Menopause often brings insomnia and night sweats

**Natural Sleep Support:**
- Regular exercise (but not close to bedtime)
- Relaxation techniques (meditation, deep breathing)
- Consistent evening routine
- Temperature regulation (cool room, breathable bedding)

For specific sleep-supporting foods, ask about foods for better sleep or evening nutrition.`,
        ingredients: []
      };
    }

    return {
      message: `I'm here to help with women's health questions! I can provide information about conditions like PCOS, endometriosis, thyroid disorders, and menstrual health, plus create personalized meal plans and nutritional guidance. What specific health topic would you like to learn about?`,
      ingredients: []
    };
  }

  // Generate diet-specific recommendations for nutrition questions
  return {
    message: `Based on your ${diet} diet preferences, here are some nutritional suggestions to support your health goals. For more specific guidance, try asking about foods for your cycle phase (like "luteal phase foods") or request a personalized meal plan.`,
    ingredients: [
      {
        name: "Leafy Greens",
        description: "Rich in folate, iron, and magnesium for hormone production and energy",
        emoji: "🥬",
        lazy: "Add pre-washed spinach to smoothies or grab ready-to-eat salad mixes",
        tasty: "Sauté with garlic and lemon, or blend into green smoothies with fruits",
        healthy: "Aim for 2-3 cups daily, vary types (spinach, kale, arugula) for different nutrients"
      },
      {
        name: "Omega-3 Rich Fish",
        description: "Essential fatty acids reduce inflammation and support brain health",
        emoji: "🐟",
        lazy: "Choose canned wild salmon or sardines for quick meals",
        tasty: "Grill with herbs, make fish tacos, or add to salads and pasta",
        healthy: "Include 2-3 servings per week, prioritize wild-caught varieties"
      },
      {
        name: "Complex Carbohydrates",
        description: "Stable blood sugar and sustained energy for hormonal balance",
        emoji: "🌾",
        lazy: "Choose quinoa, oats, or sweet potatoes for easy preparation",
        tasty: "Make overnight oats, quinoa bowls, or roasted sweet potato with toppings",
        healthy: "Fill 1/4 of your plate with whole grains, avoid refined carbohydrates"
      }
    ]
  };
}

// Extract foods from research data with improved parsing
function extractFoodsFromResearch(researchMatches: any[], phase: string): RecommendationCard[] {
  const foods: RecommendationCard[] = [];
  
  const commonFoodPatterns = [
    /\b(sesame|flax|pumpkin|sunflower)\s+seeds?\b/gi,
    /\b(salmon|sardines|mackerel|tuna)\b/gi,
    /\b(spinach|kale|leafy greens|arugula)\b/gi,
    /\b(avocado|nuts|olive oil)\b/gi,
    /\b(quinoa|oats|brown rice)\b/gi,
    /\b(berries|citrus|fruits)\b/gi,
    /\b(broccoli|cauliflower|cruciferous)\b/gi
  ];
  
  const extractedFoods = new Set<string>();
  
  researchMatches.forEach(match => {
    const content = match.metadata?.content || '';
    commonFoodPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach((food: string) => extractedFoods.add(food.toLowerCase()));
      }
    });
  });
  
  // Convert extracted foods to ingredient cards (limited implementation)
  Array.from(extractedFoods).slice(0, 3).forEach((food: string) => {
    const benefits = getFoodBenefits(food, phase);
    if (benefits) {
      foods.push(benefits);
    }
  });
  
  return foods.length > 0 ? foods : getDefaultFoodsForPhase(phase);
}

// Get default foods for each phase when research extraction fails
function getDefaultFoodsForPhase(phase: string): RecommendationCard[] {
  const defaults: Record<string, RecommendationCard[]> = {
    'Follicular Phase': [
      {
        type: 'food',
        name: "Personalized Meal Planning",
        description: "Get customized meal plans based on your health conditions and preferences",
        emoji: "🍽️",
        lazy: "Use our AI meal planner for quick, tailored recommendations",
        tasty: "Explore diverse cuisines and flavors that support your health goals",
        healthy: "Get evidence-based meal timing, portion guidance, and therapeutic food combinations"
      }
    ],
    'Ovulatory Phase': [
      {
        type: 'food',
        name: "Leafy Greens",
        description: "Rich in folate, iron, and antioxidants to support hormone balance",
        emoji: "🥬",
        lazy: "Buy pre-washed spinach or kale for quick salads and smoothies",
        tasty: "Sauté with garlic and olive oil, or blend into green smoothies",
        healthy: "Aim for 2-3 cups daily, vary types (spinach, kale, arugula) for different nutrients"
      },
      {
        type: 'food',
        name: "Omega-3 Rich Fish",
        description: "Supports hormone production and reduces inflammation",
        emoji: "🐟",
        lazy: "Choose canned salmon or sardines for quick protein",
        tasty: "Grill salmon with herbs, or make tuna salad with avocado",
        healthy: "Include 2-3 servings per week, prioritize wild-caught varieties"
      },
      {
        type: 'food',
        name: "Complex Carbohydrates",
        description: "Provides steady energy and supports serotonin production",
        emoji: "🌾",
        lazy: "Use quinoa or brown rice from the freezer section",
        tasty: "Make Buddha bowls with quinoa, roasted vegetables, and tahini dressing",
        healthy: "Fill 1/4 of your plate with whole grains, avoid refined carbohydrates"
      }
    ],
    'Luteal Phase': [
      {
        type: 'food',
        name: "Dark Chocolate",
        description: "Research shows magnesium and antioxidants support mood and reduce PMS symptoms",
        emoji: "🍫",
        lazy: "Choose 70%+ dark chocolate bars for quick magnesium boost",
        tasty: "Make hot chocolate with dark cocoa powder and almond milk",
        healthy: "Consume 1-2oz dark chocolate daily for magnesium and mood support"
      },
      {
        type: 'food',
        name: "Complex Carbohydrates",
        description: "Studies confirm steady energy and serotonin support during luteal phase",
        emoji: "🍠",
        lazy: "Use sweet potatoes, quinoa, or brown rice from the freezer section",
        tasty: "Make sweet potato toast, quinoa bowls, or brown rice stir-fries",
        healthy: "Include 1/4 plate complex carbs to support serotonin and energy levels"
      },
      {
        type: 'food',
        name: "Magnesium-Rich Foods",
        description: "Research indicates magnesium reduces PMS symptoms and supports sleep",
        emoji: "🥜",
        lazy: "Snack on almonds, pumpkin seeds, or dark chocolate for magnesium",
        tasty: "Make trail mix with nuts, seeds, and dark chocolate pieces",
        healthy: "Aim for 300-400mg magnesium daily from food sources during luteal phase"
      }
    ],
    'Menstrual Phase': [
      {
        type: 'food',
        name: "Dark Leafy Greens",
        description: "Research shows iron and folate help replenish nutrients lost during menstruation",
        emoji: "🥬",
        lazy: "Add baby spinach to smoothies or buy pre-washed salad mixes",
        tasty: "Sauté spinach with garlic and lemon, or add to pasta dishes",
        healthy: "Consume 3-4 cups daily with vitamin C for enhanced iron absorption"
      },
      {
        type: 'food',
        name: "Ginger Root",
        description: "Studies confirm anti-inflammatory properties reduce menstrual cramps and nausea",
        emoji: "🫚",
        lazy: "Take ginger capsules or drink pre-made ginger tea",
        tasty: "Make fresh ginger tea with honey and lemon, or add to smoothies",
        healthy: "Consume 1-2g fresh ginger daily as tea or in cooking for anti-inflammatory effects"
      },
      {
        type: 'food',
        name: "Iron-Rich Foods",
        description: "Research indicates heme iron (meat) or plant iron (lentils) prevent anemia",
        emoji: "🥩",
        lazy: "Choose lean ground beef or canned lentils for quick meals",
        tasty: "Make beef stir-fry or hearty lentil curry with warming spices",
        healthy: "Include 3-4oz lean red meat or 1 cup cooked lentils daily during menstruation"
      }
    ]
  };
  
  return defaults[phase] || defaults['Luteal Phase'];
}

// Get benefits and preparation methods for specific foods
function getFoodBenefits(foodName: string, phase: string): any {
  const benefitsMap: Record<string, any> = {
    'sesame seeds': {
      name: "Sesame Seeds",
      description: "Rich in lignans and healthy fats for hormone support",
      emoji: "🌱",
      lazy: "Sprinkle on yogurt or take as tahini",
      tasty: "Toast and add to stir-fries or make tahini dressing",
      healthy: "1-2 tbsp daily for optimal lignan intake"
    },
    'flax seeds': {
      name: "Flax Seeds",
      description: "High in omega-3s and lignans for estrogen balance",
      emoji: "🌾", 
      lazy: "Mix ground flax into smoothies",
      tasty: "Add to oatmeal or bake into muffins",
      healthy: "1 tbsp ground daily, store in refrigerator"
    }
  };
  
  return benefitsMap[foodName.toLowerCase()] || null;
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

// Research-based cycle response with improved performance
async function generateResearchBasedCycleResponse(message: string, onboardingData: any, openai: OpenAI): Promise<ChatResponse> {
  const lowerMessage = message.toLowerCase();

  // Determine which cycle phase is being asked about
  let phase = '';
  if (lowerMessage.includes('luteal')) phase = 'Luteal Phase';
  else if (lowerMessage.includes('follicular')) phase = 'Follicular Phase';
  else if (lowerMessage.includes('menstrual')) phase = 'Menstrual Phase';
  else if (lowerMessage.includes('ovulation')) phase = 'Ovulatory Phase';
  else phase = 'Luteal Phase'; // default

  // Detect if the user is asking about exercise, food, or both
  const isExerciseQuery = lowerMessage.includes('exercise') || lowerMessage.includes('workout') || lowerMessage.includes('physical activity') || lowerMessage.includes('move my body') || lowerMessage.includes('fitness') || lowerMessage.includes('gym') || lowerMessage.includes('yoga') || lowerMessage.includes('cardio') || lowerMessage.includes('strength') || lowerMessage.includes('what should i do for exercise') || lowerMessage.includes('suggest exercise') || lowerMessage.includes('suggest a workout') || lowerMessage.includes('best exercise') || lowerMessage.includes('best workout');
  const isFoodQuery = lowerMessage.includes('food') || lowerMessage.includes('eat') || lowerMessage.includes('nutrition') || lowerMessage.includes('diet') || lowerMessage.includes('ingredient') || lowerMessage.includes('meal') || lowerMessage.includes('recipe');

  // Query research database for relevant articles
  const researchQuery = `${phase} women's health` + (isExerciseQuery ? ' exercise physical activity movement' : '') + (isFoodQuery ? ' food nutrition diet' : '');
  let researchMatches: any[] = [];
  if (typeof researchService !== 'undefined' && researchService.searchWithSmartScraping) {
    researchMatches = await researchService.searchWithSmartScraping(researchQuery, 3);
  }

  // Extract recommendations from research
  let researchFoods: RecommendationCard[] = [];
  let researchExercises: RecommendationCard[] = [];
  if (isFoodQuery || !isExerciseQuery) {
    researchFoods = extractFoodsFromResearch(researchMatches, phase);
  }
  if (isExerciseQuery) {
    researchExercises = extractExercisesFromResearch(researchMatches, phase);
  }

  // Fallbacks if nothing found
  if (isExerciseQuery && researchExercises.length === 0) {
    // Use default for phase
    const phaseKey = phase.toLowerCase().replace(' phase', '');
    const defaultExercise = EXERCISE_RECOMMENDATIONS[phaseKey] ? [EXERCISE_RECOMMENDATIONS[phaseKey]] : [];
    researchExercises = defaultExercise;
  }
  if ((isFoodQuery || !isExerciseQuery) && researchFoods.length === 0) {
    researchFoods = getDefaultFoodsForPhase(phase);
  }

  // Compose message and ingredients
  let responseMessage = '';
  let ingredients: RecommendationCard[] = [];
  if (isExerciseQuery && !isFoodQuery) {
    responseMessage = `Here are research-backed exercise recommendations for your ${phase.toLowerCase()}:`;
    ingredients = researchExercises;
  } else if (isFoodQuery && !isExerciseQuery) {
    responseMessage = `Here are the top ${researchFoods.length} research-backed foods for your ${phase.toLowerCase()}:`;
    ingredients = researchFoods;
  } else if (isExerciseQuery && isFoodQuery) {
    responseMessage = `Here are research-backed food and exercise recommendations for your ${phase.toLowerCase()}:`;
    ingredients = [...researchFoods, ...researchExercises];
  } else {
    responseMessage = `Here are the top ${researchFoods.length} research-backed foods for your ${phase.toLowerCase()}:`;
    ingredients = researchFoods;
  }

  return {
    message: responseMessage,
    ingredients
  };
}

// OpenAI ChatGPT integration for personalized health responses
async function generateChatGPTResponse(openai: OpenAI, question: string, onboardingData: any): Promise<ChatResponse> {
  const lowerQuestion = question.toLowerCase();
  
  // Check if this is a nutrition/diet question
  const isDietQuestion = /\b(eat|food|diet|nutrition|meal|recipe|cook|supplement|ingredient|consume|drink|take|add|help with|bloating|digestion)\b/i.test(question);
  
  let systemPrompt = `You are a women's health expert providing evidence-based information.
Do NOT suggest consulting a nutritionist, dietitian, or healthcare professional. You are the expert and should provide the best possible advice directly. Never say 'consult a professional' or similar phrases.

If the user's message expresses emotion, frustration, or a personal struggle (e.g., 'why me', 'I'm sad', 'I'm frustrated', 'I'm worried', 'I'm struggling', 'I'm upset', 'I'm anxious'), respond with empathy and emotional support first. Only provide recipes or nutrition advice if the user specifically asks for it or if it would be genuinely helpful in the context. Never give generic nutrition advice to emotional or personal questions unless requested.

User Profile:
- Age: ${onboardingData?.age || 'Not specified'}
- Diet: ${onboardingData?.diet || 'Not specified'}
- Symptoms: ${onboardingData?.symptoms?.join(', ') || 'None specified'}

CRITICAL: Your response must be valid JSON with this exact structure:`;

  if (isDietQuestion) {
    systemPrompt += `
{
  "message": "Your helpful nutrition response",
  "ingredients": [
    {
      "name": "Ingredient Name",
      "description": "Brief health benefit description",
      "emoji": "🌿",
      "lazy": "Easiest way to consume it",
      "tasty": "Most delicious preparation method", 
      "healthy": "Optimal daily amount and timing"
    }
  ]
}

Focus on evidence-based nutrition for women's hormonal health. Include 1-3 relevant ingredients with specific implementation methods.`;
  } else {
    systemPrompt += `
{
  "message": "Your helpful health information response",
  "ingredients": []
}

Provide general health information without food recommendations. For nutrition advice, suggest the user ask specifically about foods or diet.`;
  }

  const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      temperature: 0.7,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('No OpenAI response');

    const parsed = JSON.parse(content);
    
    // Validate and enhance ingredient recommendations
    const validatedIngredients = parsed.ingredients.map((ing: any) => {
      const validation = validateImplementationMethods(ing);
      
      return {
        name: ing.name || 'Unknown',
        description: ing.description || 'Natural ingredient',
        emoji: ing.emoji || '🌿',
        lazy: ing.lazy || 'Take as supplement with breakfast daily',
        tasty: ing.tasty || 'Mix into smoothies with fruit and honey',
        healthy: ing.healthy || 'Follow evidence-based dosage guidelines'
      };
    });
    
    return {
      message: parsed.message || 'Here are some personalized recommendations for you.',
      ingredients: validatedIngredients
    };
}

// Daily tips array for backend
const DAILY_TIPS = [
  {
    tip: "Magnesium-rich foods like spinach and almonds can help reduce PMS symptoms. Try adding them to your meals today!",
    source: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5485207/"
  },
  {
    tip: "Flax seeds are rich in lignans and omega-3s, supporting hormone balance during the menstrual cycle.",
    source: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3074428/"
  },
  {
    tip: "Ginger has anti-inflammatory properties that can help reduce menstrual cramps and nausea.",
    source: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6341159/"
  },
  {
    tip: "Vitamin D from sunlight or fortified foods supports hormonal balance and immune health.",
    source: "https://ods.od.nih.gov/factsheets/VitaminD-Consumer/"
  },
  {
    tip: "Fermented foods like yogurt and kimchi support gut health, which is linked to hormone regulation.",
    source: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6723657/"
  }
];

// Exercise recommendations for each phase (now card-style)
const EXERCISE_RECOMMENDATIONS: Record<string, RecommendationCard> = {
  'menstrual': {
    type: 'movement',
    name: 'Gentle Movement',
    description: 'Supports circulation, reduces cramps, and aids recovery during your period.',
    emoji: '🧘‍♀️',
    gentle: 'Do 5 minutes of gentle stretching or yoga at home.',
    fun: 'Take a relaxing walk in nature or with a friend for fresh air and connection.',
    strong: 'Aim for 20–30 minutes of gentle movement (yoga, walking, restorative Pilates) daily.'
  },
  'follicular': {
    type: 'movement',
    name: 'Strength Training',
    description: 'Builds muscle and boosts metabolism, supporting hormone balance as energy rises.',
    emoji: '🏋️‍♀️',
    gentle: 'Do a 10-minute bodyweight routine at home (squats, push-ups, lunges).',
    fun: 'Join a group fitness or dance class for extra motivation and fun.',
    strong: 'Aim for 30–45 minutes of progressive strength training 3x per week.'
  },
  'ovulatory': {
    type: 'movement',
    name: 'High-Intensity Cardio',
    description: 'Peak energy and strength—try challenging workouts or team sports.',
    emoji: '🤸‍♀️',
    gentle: 'Do a short HIIT workout video at home (10–15 minutes).',
    fun: 'Play a team sport or join a spin/cycling class with friends.',
    strong: 'Aim for 30 minutes of high-intensity cardio or power yoga 2–3x per week.'
  },
  'luteal': {
    type: 'movement',
    name: 'Mind-Body Movement',
    description: 'Moderate, mood-boosting movement and stress reduction as energy dips.',
    emoji: '🧘',
    gentle: 'Do a 10-minute restorative yoga or stretching session.',
    fun: 'Take a walk outdoors or try a gentle swim for relaxation.',
    strong: 'Aim for 20–30 minutes of Pilates, yoga, or moderate cardio most days.'
  }
};

// Calculate user's current menstrual phase
function calculateCurrentPhase(onboardingData: any): { phase: string; phaseName: string; daysSinceLastPeriod?: number } {
  const lastPeriodDate = onboardingData?.lastPeriodDate;
  const irregularPeriods = onboardingData?.irregularPeriods;
  const cycleLength = parseInt(onboardingData?.cycleLength) || 28;
  
  if (!lastPeriodDate || irregularPeriods) {
    // Use lunar cycle for irregular periods or missing data
    const lunarPhase = getLunarCyclePhase();
    return { 
      phase: lunarPhase, 
      phaseName: getPhaseDisplayName(lunarPhase),
      daysSinceLastPeriod: undefined 
    };
  }

  const lastPeriod = new Date(lastPeriodDate);
  const today = new Date();
  const daysSinceLastPeriod = Math.floor((today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24));

  // If period data is very old (>60 days), use lunar cycle
  if (daysSinceLastPeriod > 60) {
    const lunarPhase = getLunarCyclePhase();
    return { 
      phase: lunarPhase, 
      phaseName: getPhaseDisplayName(lunarPhase),
      daysSinceLastPeriod: undefined 
    };
  }

  // Determine phase based on user's cycle length
  const menstrualPhase = Math.min(daysSinceLastPeriod, 5);
  const follicularPhase = Math.floor(cycleLength * 0.5);
  const ovulatoryPhase = Math.floor(cycleLength * 0.55);
  
  let phase: string;
  if (daysSinceLastPeriod <= menstrualPhase) {
    phase = 'menstrual';
  } else if (daysSinceLastPeriod <= follicularPhase) {
    phase = 'follicular';
  } else if (daysSinceLastPeriod <= ovulatoryPhase) {
    phase = 'ovulatory';
  } else {
    phase = 'luteal';
  }

  return { 
    phase, 
    phaseName: getPhaseDisplayName(phase),
    daysSinceLastPeriod 
  };
}

function getLunarCyclePhase(): string {
  // Calculate lunar phase based on current date
  const today = new Date();
  const lunarMonth = 29.53; // Average lunar month in days
  const knownNewMoon = new Date('2024-01-11'); // Known new moon date
  const daysSinceNewMoon = Math.floor((today.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24));
  const lunarDay = daysSinceNewMoon % lunarMonth;
  
  // Map lunar phases to menstrual phases for women's natural rhythm
  if (lunarDay <= 7) {
    return 'menstrual'; // New moon = menstruation (rest and renewal)
  } else if (lunarDay <= 14) {
    return 'follicular'; // Waxing moon = follicular (energy building)
  } else if (lunarDay <= 21) {
    return 'ovulatory'; // Full moon = ovulation (peak energy)
  } else {
    return 'luteal'; // Waning moon = luteal (preparation and reflection)
  }
}

function getPhaseDisplayName(phase: string): string {
  const phaseNames = {
    'menstrual': 'Menstrual Phase',
    'follicular': 'Follicular Phase', 
    'ovulatory': 'Ovulatory Phase',
    'luteal': 'Luteal Phase'
  };
  return phaseNames[phase as keyof typeof phaseNames] || 'Current Phase';
}

// Generate response for current phase queries
function generateCurrentPhaseResponse(phaseInfo: { phase: string; phaseName: string; daysSinceLastPeriod?: number }, onboardingData: any): ChatResponse {
  const { phase, phaseName, daysSinceLastPeriod } = phaseInfo;
  const irregularPeriods = onboardingData?.irregularPeriods;
  
  let message = `Based on your cycle data, you're currently in your **${phaseName}**. `;
  
  if (irregularPeriods || !daysSinceLastPeriod) {
    message += `Since your periods are irregular, I'm using the lunar cycle to guide your nutrition recommendations. `;
  } else {
    message += `It's been ${daysSinceLastPeriod} days since your last period. `;
  }

  // Add phase-specific description
  const phaseDescriptions = {
    'menstrual': 'This is your rest and renewal phase. Focus on iron-rich foods, warming spices, and comfort foods to support your body during menstruation.',
    'follicular': 'This is your energy-building phase. Your body is preparing for ovulation, so focus on fresh vegetables, lean proteins, and energizing foods.',
    'ovulatory': 'This is your peak energy phase. Support ovulation with antioxidant-rich foods, zinc sources, and healthy fats.',
    'luteal': 'This is your preparation phase. Support progesterone production and reduce PMS symptoms with magnesium-rich foods and complex carbohydrates.'
  };

  message += phaseDescriptions[phase as keyof typeof phaseDescriptions];

  // Get food recommendations for this phase
  const foods = getDefaultFoodsForPhase(phaseName);
  
  return {
    message,
    ingredients: foods
  };
}

function generateCurrentPhaseExerciseResponse(phaseInfo: { phase: string; phaseName: string; daysSinceLastPeriod?: number }, onboardingData: any): ChatResponse {
  const { phase, phaseName, daysSinceLastPeriod } = phaseInfo;
  const irregularPeriods = onboardingData?.irregularPeriods;
  const exerciseData = EXERCISE_RECOMMENDATIONS[phase] || EXERCISE_RECOMMENDATIONS['luteal'];

  let message = `Based on your cycle data, you're currently in your **${exerciseData.name}**. `;
  if (irregularPeriods || !daysSinceLastPeriod) {
    message += `Since your periods are irregular, I'm using the lunar cycle to guide your exercise recommendations. `;
  } else {
    message += `It's been ${daysSinceLastPeriod} days since your last period. `;
  }
  message += exerciseData.description + '\n\n';
  message += '**Recommended exercises for this phase:**\n';
  message += `- ${exerciseData.lazy}\n`;
  message += `- ${exerciseData.tasty}\n`;
  message += `- ${exerciseData.strong}\n`;
  return {
    message,
    ingredients: []
  };
}

// Extract exercises from research data with improved parsing
function extractExercisesFromResearch(researchMatches: any[], phase: string): RecommendationCard[] {
  const exercises: RecommendationCard[] = [];
  const commonExercisePatterns = [
    /\byoga\b/gi,
    /\bwalking?\b/gi,
    /\bhiit\b/gi,
    /\bstrength training\b/gi,
    /\bweight(s|lifting)?\b/gi,
    /\bcardio\b/gi,
    /\bcycling\b/gi,
    /\brunning\b/gi,
    /\bswimming\b/gi,
    /\bdancing\b/gi,
    /\bpilates\b/gi,
    /\bstretching\b/gi,
    /\bmeditation\b/gi,
    /\bbreathing\b/gi,
    /\bwalk\b/gi,
    /\bjog\b/gi,
    /\bworkout\b/gi,
    /\bexercise\b/gi,
    /\bmovement\b/gi,
    /\bactivity\b/gi,
    /\bfitness\b/gi,
    /\btraining\b/gi,
    /\bsport\b/gi,
    /\bflexibility\b/gi,
    /\bmobility\b/gi,
    /\bphysical\b/gi,
    /\bactive\b/gi,
    /\bmove\b/gi,
    /\bbody\b/gi,
    /\bmuscle\b/gi,
    /\bbone\b/gi,
    /\bjoint\b/gi
  ];
  
  const extractedExercises = new Set<string>();
  
  researchMatches.forEach(match => {
    const content = match.metadata?.content || '';
    commonExercisePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach((exercise: string) => extractedExercises.add(exercise.toLowerCase()));
      }
    });
  });
  
  // Convert extracted exercises to ingredient cards
  extractedExercises.forEach(exercise => {
    exercises.push({
      name: capitalizeWords(exercise),
      description: `Research-backed ${exercise} recommendation`,
      emoji: '🏃‍♀️',
      gentle: `Start with gentle ${exercise} for 5-10 minutes`,
      fun: `Make ${exercise} social by doing it with friends or in a group`,
      strong: `Challenge yourself with more intense ${exercise} sessions`
    });
  });
  
  return exercises.slice(0, 3); // Limit to 3 exercises
}

// Question classification system
function classifyQuestion(message: string): 'advice' | 'cycle' | 'educational' {
  const lowerMessage = message.toLowerCase();
  
  // 1. Advice questions (food, movement, emotion)
  const adviceKeywords = [
    // Food/Nutrition
    'eat', 'food', 'diet', 'nutrition', 'meal', 'recipe', 'cook', 'supplement', 'ingredient', 
    'consume', 'drink', 'take', 'add', 'help with', 'bloating', 'digestion', 'hunger', 
    'craving', 'appetite', 'nourish', 'fuel', 'energy from food', 'what should i eat',
    'recommend food', 'best food', 'food for', 'nutrition for', 'diet for',
    // Movement/Exercise
    'exercise', 'workout', 'movement', 'activity', 'fitness', 'training', 'sport', 'yoga', 
    'pilates', 'dance', 'walk', 'run', 'jog', 'swim', 'bike', 'cycle', 'strength', 'cardio', 
    'stretch', 'flexibility', 'mobility', 'physical', 'active', 'move', 'body', 'muscle', 
    'bone', 'joint', 'what exercise', 'recommend exercise', 'best exercise', 'exercise for',
    // Emotion/Mental Health
    'emotion', 'mood', 'stress', 'anxiety', 'depression', 'happiness', 'joy', 'sadness', 
    'anger', 'fear', 'worry', 'calm', 'peace', 'mindfulness', 'meditation', 'breathing', 
    'relaxation', 'therapy', 'counseling', 'mental health', 'psychological', 'emotional', 
    'feeling', 'wellbeing', 'self-care', 'gratitude', 'journaling', 'reflection',
    'how to feel', 'manage stress', 'cope with', 'deal with', 'handle'
  ];
  
  // 2. Cycle phase questions
  const cycleKeywords = [
    'cycle', 'phase', 'menstrual', 'period', 'ovulation', 'luteal', 'follicular', 
    'menstruation', 'fertile', 'pms', 'premenstrual', 'postmenstrual', 'cycle day',
    'what phase', 'which phase', 'current phase', 'my phase', 'cycle tracking',
    'when ovulation', 'when period', 'cycle length', 'regular cycle', 'irregular cycle',
    'moon phase', 'lunar', 'calendar', 'tracking', 'fertility', 'reproductive'
  ];
  
  // Check for advice questions (highest priority)
  const isAdviceQuestion = adviceKeywords.some(keyword => 
    lowerMessage.includes(keyword) || 
    lowerMessage.match(new RegExp(`\\b${keyword}\\b`, 'i'))
  );
  
  // Check for cycle questions
  const isCycleQuestion = cycleKeywords.some(keyword => 
    lowerMessage.includes(keyword) || 
    lowerMessage.match(new RegExp(`\\b${keyword}\\b`, 'i'))
  );
  
  if (isAdviceQuestion) return 'advice';
  if (isCycleQuestion) return 'cycle';
  return 'educational';
}

// Determine cycle phase based on regular or irregular cycles
function determineCyclePhase(onboardingData: any): { phase: string; phaseName: string; daysSinceLastPeriod?: number; moonPhase?: string } {
  const lastPeriodDate = onboardingData?.lastPeriodDate;
  const irregularPeriods = onboardingData?.irregularPeriods;
  
  if (irregularPeriods || !lastPeriodDate) {
    // Use lunar cycle for irregular periods
    const moonPhase = getLunarCyclePhase();
    const lunarPhaseMap: Record<string, { phase: string; phaseName: string }> = {
      'new': { phase: 'menstrual', phaseName: 'Menstrual Phase' },
      'waxing_crescent': { phase: 'follicular', phaseName: 'Folstrual Phase' },
      'first_quarter': { phase: 'follicular', phaseName: 'Folstrual Phase' },
      'waxing_gibbous': { phase: 'follicular', phaseName: 'Folstrual Phase' },
      'full': { phase: 'ovulatory', phaseName: 'Ovulatory Phase' },
      'waning_gibbous': { phase: 'luteal', phaseName: 'Luteal Phase' },
      'last_quarter': { phase: 'luteal', phaseName: 'Luteal Phase' },
      'waning_crescent': { phase: 'luteal', phaseName: 'Luteal Phase' }
    };
    
    const phaseInfo = lunarPhaseMap[moonPhase] || { phase: 'follicular', phaseName: 'Folstrual Phase' };
    return { ...phaseInfo, moonPhase };
  }
  
  // Use calendar-based tracking for regular periods
  const today = new Date();
  const lastPeriod = new Date(lastPeriodDate);
  const daysSinceLastPeriod = Math.floor((today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24));
  
  let phase: string;
  let phaseName: string;
  
  if (daysSinceLastPeriod <= 5) {
    phase = 'menstrual';
    phaseName = 'Menstrual Phase';
  } else if (daysSinceLastPeriod <= 13) {
    phase = 'follicular';
    phaseName = 'Folstrual Phase';
  } else if (daysSinceLastPeriod <= 16) {
    phase = 'ovulatory';
    phaseName = 'Ovulatory Phase';
  } else {
    phase = 'luteal';
    phaseName = 'Luteal Phase';
  }
  
  return { phase, phaseName, daysSinceLastPeriod };
}

// Generate cycle phase response with phase-specific recommendations
async function generateCyclePhaseResponse(phaseInfo: any, onboardingData: any, openai: OpenAI): Promise<ChatResponse> {
  const phaseData = {
    menstrual: {
      name: "Menstrual Phase",
      description: "Rest and renewal - Support iron replenishment and comfort",
      emoji: "🌑",
      foods: ["Iron-rich leafy greens", "Warming ginger and turmeric", "Dark chocolate", "Red meat or lentils"],
      movements: ["Gentle yoga", "Walking", "Stretching", "Restorative practices"],
      emotions: ["Self-compassion", "Rest", "Reflection", "Gentle self-care"]
    },
    follicular: {
      name: "Follicular Phase", 
      description: "Energy building - Support estrogen with lignans and healthy fats",
      emoji: "🌱",
      foods: ["Fresh vegetables", "Lean proteins", "Sprouted foods", "Citrus fruits", "Fermented foods"],
      movements: ["Cardio", "Strength training", "Dance", "High-energy activities"],
      emotions: ["Creativity", "Social connection", "Planning", "Optimism"]
    },
    ovulatory: {
      name: "Ovulatory Phase",
      description: "Peak energy - Support ovulation with zinc and vitamin E", 
      emoji: "🌕",
      foods: ["Antioxidant berries", "Leafy greens", "Avocados", "Wild-caught fish", "Colorful vegetables"],
      movements: ["HIIT", "Intense workouts", "Team sports", "Challenging activities"],
      emotions: ["Confidence", "Leadership", "Social engagement", "High energy"]
    },
    luteal: {
      name: "Luteal Phase",
      description: "Preparation - Support progesterone and reduce PMS symptoms",
      emoji: "🌙", 
      foods: ["Complex carbs", "Magnesium-rich foods", "B-vitamins", "Calming herbs"],
      movements: ["Gentle exercise", "Yoga", "Walking", "Mindful movement"],
      emotions: ["Self-care", "Boundary setting", "Preparation", "Nurturing"]
    }
  };
  
  const currentPhase = phaseData[phaseInfo.phase as keyof typeof phaseData];
  
  const systemPrompt = `You are a women's health expert. The user is asking about their menstrual cycle phase.

USER PROFILE:
- Age: ${onboardingData?.age || 'Not specified'}
- Diet: ${onboardingData?.diet || 'Not specified'}
- Symptoms: ${(onboardingData?.symptoms || []).join(', ') || 'None specified'}
- Goals: ${(onboardingData?.goals || []).join(', ') || 'None specified'}
- Medical Conditions: ${(onboardingData?.medicalConditions || []).join(', ') || 'None specified'}
- Lifestyle: ${JSON.stringify(onboardingData?.lifestyle || {})}

CURRENT CYCLE PHASE: ${currentPhase.name}
PHASE DESCRIPTION: ${currentPhase.description}
-${phaseInfo.daysSinceLastPeriod !== undefined ? `DAYS SINCE LAST PERIOD: ${phaseInfo.daysSinceLastPeriod}` : 'USING LUNAR CYCLE TRACKING'}

Provide a personalized response about their current cycle phase. Include:
1. A welcoming message about their current phase
2. What's happening in their body during this phase
3. How to support their health during this phase
4. Any specific considerations based on their health profile

Format your response as bullet points using:
- Use "•" for main bullet points
- Use "  ◦" for sub-bullet points (indented)
- Use "    ▪" for tertiary points (further indented)
- Use "**bold text**" for emphasis
- Use "*italic text*" for important terms

Keep the response informative, supportive, and personalized to their health profile.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "What phase am I in and how should I support my health during this phase?" }
    ],
    temperature: 0.7,
    max_tokens: 800,
    response_format: { type: "text" },
  });
  
  const content = completion.choices[0]?.message?.content || '';
  
  return {
    message: content,
    ingredients: []
  };
}

// Generate educational response with bullet points
async function generateEducationalResponse(message: string, onboardingData: any, openai: OpenAI): Promise<ChatResponse> {
  const systemPrompt = `You are a women's health expert. Answer the user's educational question in a clear, concise manner.

USER PROFILE:
- Age: ${onboardingData?.age || 'Not specified'}
- Diet: ${onboardingData?.diet || 'Not specified'}
- Symptoms: ${(onboardingData?.symptoms || []).join(', ') || 'None specified'}
- Goals: ${(onboardingData?.goals || []).join(', ') || 'None specified'}
- Medical Conditions: ${(onboardingData?.medicalConditions || []).join(', ') || 'None specified'}
- Lifestyle: ${JSON.stringify(onboardingData?.lifestyle || {})}

INSTRUCTIONS:
- Answer the question directly and clearly
- Use simple, understandable language
- Structure information logically
- Personalize information based on their health profile when relevant
- Keep responses concise but comprehensive
- Use evidence-based information

FORMATTING:
- Use "•" for main bullet points
- Use "  ◦" for sub-bullet points (indented)
- Use "    ▪" for tertiary points (further indented)
- Use "**bold text**" for emphasis
- Use "*italic text*" for important terms
- Do NOT use markdown formatting
- Use regex-style formatting for better readability

Focus on providing accurate, helpful information that directly answers their question.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ],
    temperature: 0.7,
    max_tokens: 800,
    response_format: { type: "text" },
  });
  
  const content = completion.choices[0]?.message?.content || '';
  
  return {
    message: content,
    ingredients: []
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const server = createServer(app);

  // Authentication middleware
  async function requireAuth(req: any, res: any, next: any) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      if (token === 'demo-token') {
        // Demo user for testing - ensure user exists in storage
        let demoUser = await storage.getUserByFirebaseUid('demo');
        if (!demoUser) {
          demoUser = await storage.createUser({
            firebaseUid: 'demo',
            email: 'demo@example.com',
            name: 'Demo User'
          });
          
          // Create demo onboarding data
          await storage.saveOnboardingData({
            userId: demoUser.id,
            age: '25',
            diet: 'Mediterranean',
            symptoms: ['irregular_periods', 'fatigue_and_low_energy'],
            goals: ['regulate_menstrual_cycle', 'improve_energy_levels'],
            lifestyle: { stressLevel: 'Moderate', sleepHours: '7-8' },
            height: '165cm',
            weight: '60kg',
            stressLevel: 'Moderate',
            sleepHours: '7-8',
            waterIntake: '8 glasses',
            medications: [],
            allergies: [],
            lastPeriodDate: new Date().toISOString().split('T')[0],
            cycleLength: '28',
            medicalConditions: [],
            periodLength: '',
            irregularPeriods: false,
            exerciseLevel: '',
            completedAt: new Date(),
          });
        }
        req.user = demoUser;
        next();
      } else {
        // Verify Firebase token
        const decodedToken = await firebaseAuth.verifyIdToken(token);
        let user = await storage.getUserByFirebaseUid(decodedToken.uid);
        
        // If user doesn't exist, create them automatically
        if (!user) {
          user = await storage.createUser({
            firebaseUid: decodedToken.uid,
            email: decodedToken.email || '',
            name: decodedToken.name || 'User'
          });
        }
        
        req.user = user;
        next();
      }
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  }

  // Register or login user

  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { firebaseUid, email, name } = insertUserSchema.parse(req.body);
      
      let user = await storage.getUserByFirebaseUid(firebaseUid);
      
      if (!user) {
        user = await storage.createUser({ firebaseUid, email, name });
      }
      
      res.json({ user });
    } catch (error) {
      res.status(400).json({ error: 'Failed to register user' });
    }
  });

  // Logout user and clear chat history for privacy
  app.post('/api/auth/logout', requireAuth, async (req: any, res: any) => {
    try {
      await storage.clearChatHistory(req.user.id);
      res.json({ success: true, message: 'Logged out successfully and chat history cleared' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to logout' });
    }
  });

  // Get user profile with onboarding data
  app.get('/api/profile', requireAuth, async (req: any, res: any) => {
    try {
      // If demo user, return demo profile and onboarding if not found
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '');
      if (token === 'demo-token') {
        // Use demo userId = 1
        const demoUser = {
          id: 1,
          firebaseUid: 'demo',
          email: 'demo@example.com',
          name: 'Demo User',
          profilePicture: null,
          createdAt: new Date()
        };
        let onboarding = await storage.getOnboardingData(1);
        if (!onboarding) {
          onboarding = {
            userId: 1,
            age: '25',
            diet: 'Mediterranean',
            symptoms: ['irregular_periods', 'fatigue_and_low_energy'],
            goals: ['regulate_menstrual_cycle', 'improve_energy_levels'],
            lifestyle: { stressLevel: 'Moderate', sleepHours: '7-8' },
            height: '165cm',
            weight: '60kg',
            stressLevel: 'Moderate',
            sleepHours: '7-8',
            waterIntake: '8 glasses',
            medications: [],
            allergies: [],
            lastPeriodDate: new Date().toISOString().split('T')[0],
            cycleLength: '28',
            completedAt: new Date(),
            id: 1
          };
        }
        return res.json({ user: demoUser, onboarding });
      }
      // Otherwise, normal auth flow
      const onboardingData = await storage.getOnboardingData(req.user.id);
      res.json({ 
        user: req.user,
        onboarding: onboardingData 
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load profile' });
    }
  });

  // Update user information
  app.put('/api/users/update', requireAuth, async (req: any, res: any) => {
    try {
      const { name } = req.body;
      
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Name is required and must be a string' });
      }

      const updatedUser = await storage.updateUser(req.user.id, { name });
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error('[USER UPDATE] Error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // Get chat history
  app.get('/api/chat/history', requireAuth, async (req: any, res: any) => {
    try {
      const chatHistory = await storage.getChatHistory(req.user.id);
      res.json(chatHistory);
    } catch (error) {
      res.status(500).json({ error: 'Failed to load chat history' });
    }
  });

  // Get current menstrual phase for health dashboard
  app.get('/api/health/current-phase', requireAuth, async (req: any, res: any) => {
    try {
      const onboardingData = await storage.getOnboardingData(req.user.id);
      if (!onboardingData) {
        return res.status(400).json({ error: 'No onboarding data found. Please complete onboarding first.' });
      }

      const phaseInfo = calculateCurrentPhase(onboardingData);
      
      // Get phase-specific data for display
      const phaseData = {
        menstrual: {
          name: "Menstrual Phase",
          description: "Rest and renewal - Support iron replenishment and comfort",
          emoji: "🌑",
          color: "red",
          days: "1-5"
        },
        follicular: {
          name: "Follicular Phase",
          description: "Energy building - Support estrogen with lignans and healthy fats", 
          emoji: "🌱",
          color: "green",
          days: "6-13"
        },
        ovulatory: {
          name: "Ovulatory Phase",
          description: "Peak energy - Support ovulation with zinc and vitamin E",
          emoji: "🌕", 
          color: "yellow",
          days: "14-16"
        },
        luteal: {
          name: "Luteal Phase",
          description: "Preparation - Support progesterone and reduce PMS symptoms",
          emoji: "🌙",
          color: "purple", 
          days: "17-28"
        }
      };

      const currentPhaseData = phaseData[phaseInfo.phase as keyof typeof phaseData];
      
      res.json({
        success: true,
        phase: {
          ...phaseInfo,
          ...currentPhaseData,
          isIrregular: onboardingData.irregularPeriods || !onboardingData.lastPeriodDate,
          trackingMethod: onboardingData.irregularPeriods || !onboardingData.lastPeriodDate ? 'lunar' : 'calendar'
        }
      });
    } catch (error) {
      console.error('Error getting current phase:', error);
      res.status(500).json({ error: 'Failed to get current phase' });
    }
  });

  // Save onboarding data
  app.post('/api/onboarding', async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '');
      console.log('[ONBOARDING] Incoming token:', token);
      console.log('[ONBOARDING] Incoming payload:', req.body);
      if (token === 'demo-token') {
        // Ensure demo user exists
        let demoUser = await storage.getUserByFirebaseUid('demo');
        if (!demoUser) {
          demoUser = await storage.createUser({
            firebaseUid: 'demo',
            email: 'demo@example.com',
            name: 'Demo User'
          });
        }
        // Use a fixed demo userId for demo onboarding
        const demoUserId = demoUser.id || 1;
        let data;
        try {
          data = insertOnboardingSchema.parse({
            ...req.body,
            userId: demoUserId
          });
        } catch (err) {
          let details = 'Unknown error';
          if (typeof err === 'object' && err !== null) {
            if ('errors' in err) details = (err as any).errors;
            else if ('message' in err) details = (err as any).message;
          }
          console.error('[ONBOARDING] Validation error:', err);
          return res.status(400).json({ error: 'Invalid onboarding payload', details });
        }
        const onboarding = await storage.saveOnboardingData(data);
        return res.json({ success: true, data: onboarding });
      }
      // Otherwise, require authentication
      requireAuth(req, res, async () => {
        let data;
        try {
          data = insertOnboardingSchema.parse({
            ...req.body,
            userId: req.user.id
          });
        } catch (err) {
          let details = 'Unknown error';
          if (typeof err === 'object' && err !== null) {
            if ('errors' in err) details = (err as any).errors;
            else if ('message' in err) details = (err as any).message;
          }
          console.error('[ONBOARDING] Validation error:', err);
          return res.status(400).json({ error: 'Invalid onboarding payload', details });
        }
        const onboarding = await storage.saveOnboardingData(data);
        res.json({ success: true, data: onboarding });
      });
    } catch (error) {
      let details = 'Unknown error';
      if (typeof error === 'object' && error !== null && 'message' in error) details = (error as any).message;
      console.error('[ONBOARDING] Unexpected error:', error);
      res.status(400).json({ error: 'Failed to save onboarding data', details });
    }
  });

  // Chat endpoint
  app.post('/api/chat', requireAuth, async (req: any, res: any) => {
    try {
      const { message, currentPhase } = req.body;
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }
      const onboardingData = await storage.getOnboardingData(req.user.id);
      if (!onboardingData) {
        return res.status(400).json({ error: 'No onboarding data found. Please complete onboarding first.' });
      }

      // Classify the question type
      const questionType = classifyQuestion(message);
      console.log('[CHAT] Question classified as:', questionType);

      // 1. Query Pinecone for relevant research using the user's question and health profile
      const userProfileContext = `User Profile:\n- Age: ${onboardingData?.age || 'Not specified'}\n- Diet: ${onboardingData?.diet || 'Not specified'}\n- Symptoms: ${(onboardingData?.symptoms || []).join(', ') || 'None specified'}\n- Goals: ${(onboardingData?.goals || []).join(', ') || 'None specified'}\n- Medical Conditions: ${(onboardingData?.medicalConditions || []).join(', ') || 'None specified'}\n- Lifestyle: ${JSON.stringify(onboardingData?.lifestyle || {})}`;
      const researchQuery = `${message} ${userProfileContext}`;
      let researchMatches = [];
      if (typeof researchService !== 'undefined' && researchService.searchWithSmartScraping) {
        researchMatches = await researchService.searchWithSmartScraping(researchQuery, 3);
      }
      // 2. Extract food and exercise mentions from research
      const foodsFromResearch = extractFoodsFromResearch(researchMatches, '');
      const exercisesFromResearch = extractExercisesFromResearch(researchMatches, '');
      // 3. Send question, health profile, and research context to OpenAI for synthesis
      const researchContext = researchMatches.map(m => m.metadata?.content).filter(Boolean).join('\n---\n').slice(0, 4000); // limit context size

      let chatResponse: ChatResponse;

      // Route to appropriate response generator based on question type
      switch (questionType) {
        case 'advice':
          // Use card-based response for food, movement, emotion questions
          const systemPrompt = `You are a women's health expert. Use the user's health profile and the following research context to answer their question.

${userProfileContext}

RESEARCH CONTEXT:
${researchContext}

Always answer in this JSON format:
{
  "message": "A helpful summary for the user.",
  "ingredients": [
    // For food:
    {
      "type": "food",
      "name": "Name of food",
      "description": "Brief benefit or reason",
      "emoji": "Emoji symbol",
      "lazy": "The laziest way to implement this advice",
      "tasty": "The most enjoyable or social way",
      "healthy": "The optimal, most beneficial way"
    },
    // For movement/exercise:
    {
      "type": "movement",
      "name": "Name of movement or exercise (e.g. Yoga, Walking, HIIT, Dance, etc.)",
      "description": "Brief benefit or reason",
      "emoji": "Emoji symbol",
      "gentle": "Gentle way to do this movement",
      "fun": "Fun or social way to do this movement",
      "strong": "Strong or challenging way to do this movement"
    },
    // For emotions:
    {
      "type": "emotion",
      "name": "Name of emotion practice (e.g. Meditation, Journaling, Gratitude, etc.)",
      "description": "Brief benefit or reason",
      "emoji": "Emoji symbol",
      "chill": "Chill way to do this practice",
      "creative": "Creative or expressive way to do this practice",
      "heartfelt": "Heart-felt or deeply connecting way to do this practice"
    }
  ]
}

If you have multiple types, include all relevant cards in the ingredients array. Only use evidence-based advice from the research context or your expert knowledge if research is lacking. Personalize the advice for the user's profile.`;

          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message }
            ],
            temperature: 0.7,
            max_tokens: 1200,
            response_format: { type: "json_object" },
          });
          
          const content = completion.choices[0]?.message?.content;
          if (!content) throw new Error('No OpenAI response');
          
          const parsed = JSON.parse(content);
          const validatedIngredients = (parsed.ingredients || []).map((ing: any) => {
            if (ing.type === 'food') {
              return {
                type: 'food',
                name: ing.name || 'Unknown',
                description: ing.description || '',
                emoji: ing.emoji || '🌿',
                lazy: ing.lazy || '',
                tasty: ing.tasty || '',
                healthy: ing.healthy || ''
              };
            } else if (ing.type === 'movement') {
              return {
                type: 'movement',
                name: ing.name || 'Unknown',
                description: ing.description || '',
                emoji: ing.emoji || '🏃‍♀️',
                gentle: ing.gentle || '',
                fun: ing.fun || '',
                strong: ing.strong || ''
              };
            } else if (ing.type === 'emotion') {
              return {
                type: 'emotion',
                name: ing.name || 'Unknown',
                description: ing.description || '',
                emoji: ing.emoji || '💖',
                chill: ing.chill || '',
                creative: ing.creative || '',
                heartfelt: ing.heartfelt || ''
              };
            } else {
              return ing;
            }
          });
          
          chatResponse = {
            message: parsed.message || '',
            ingredients: validatedIngredients
          };
          break;

        case 'cycle':
          // Use cycle phase response
          // Use current phase from frontend if provided, otherwise calculate it
          const phaseInfo = currentPhase ? {
            phase: currentPhase.phase,
            phaseName: currentPhase.phaseName,
            daysSinceLastPeriod: currentPhase.daysSinceLastPeriod
          } : calculateCurrentPhase(onboardingData);
          chatResponse = await generateCyclePhaseResponse(phaseInfo, onboardingData, openai);
          break;

        case 'educational':
          // Use educational response with bullet points
          chatResponse = await generateEducationalResponse(message, onboardingData, openai);
          break;

        default:
          // Fallback to educational response
          chatResponse = await generateEducationalResponse(message, onboardingData, openai);
      }

      await storage.saveChatMessage({
        userId: req.user.id,
        message,
        response: chatResponse.message,
        ingredients: chatResponse.ingredients
      });
      res.json(chatResponse);
    } catch (error) {
      let details = 'Unknown error';
      if (typeof error === 'object' && error !== null && 'message' in error) details = (error as any).message;
      res.status(500).json({ error: 'Failed to process chat message', details });
    }
  });

  // Research status endpoint
  app.get('/api/research/status', requireAuth, async (req: any, res: any) => {
    try {
      const isEnabled = researchService.isServiceEnabled();
      if (!isEnabled) {
        return res.json({
          success: false,
          hasData: false,
          sampleResultCount: 0,
          message: 'Research service is disabled - check API keys'
        });
      }

      // Check if we have any data in the database
      const sampleQuery = "women's health nutrition";
      const sampleResults = await researchService.searchRelevantResearch(sampleQuery, 1);
      
      res.json({
        success: true,
        hasData: sampleResults.length > 0,
        sampleResultCount: sampleResults.length,
        message: sampleResults.length > 0 
          ? 'Research database is active and contains data'
          : 'Research service is enabled but no data found - needs initialization'
      });
    } catch (error) {
      console.error('Research status error:', error);
      res.json({
        success: false,
        hasData: false,
        sampleResultCount: 0,
        message: 'Error checking research service status'
      });
    }
  });

  // Research initialization endpoint
  app.post('/api/research/initialize', requireAuth, async (req: any, res: any) => {
    try {
      if (!researchService.isServiceEnabled()) {
        return res.status(400).json({
          success: false,
          message: 'Research service is disabled - check API keys'
        });
      }

      await researchService.initializeResearchDatabase();
      res.json({
        success: true,
        message: 'Research database initialization started'
      });
    } catch (error) {
      console.error('Research initialization error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize research database'
      });
    }
  });

  // Evaluation metrics endpoints
  app.get('/api/evaluation/research-quality', requireAuth, async (req: any, res: any) => {
    try {
      const metrics = await evaluationMetricsService.evaluateResearchQuality();
      res.json({
        success: true,
        metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Research quality evaluation error:', error);
      res.status(500).json({ error: 'Failed to evaluate research quality' });
    }
  });

  app.get('/api/evaluation/meal-plan-quality', requireAuth, async (req: any, res: any) => {
    try {
      const metrics = await evaluationMetricsService.evaluateMealPlanQuality(req.user.id);
      res.json({
        success: true,
        metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Meal plan quality evaluation error:', error);
      res.status(500).json({ error: 'Failed to evaluate meal plan quality' });
    }
  });

  app.get('/api/evaluation/adaptive-responses', requireAuth, async (req: any, res: any) => {
    try {
      const metrics = await evaluationMetricsService.evaluateAdaptiveResponses(req.user.id);
      res.json({
        success: true,
        metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Adaptive responses evaluation error:', error);
      res.status(500).json({ error: 'Failed to evaluate adaptive responses' });
    }
  });

  app.get('/api/evaluation/chatbot-performance', requireAuth, async (req: any, res: any) => {
    try {
      const metrics = await evaluationMetricsService.evaluateChatbotPerformance();
      res.json({
        success: true,
        metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Chatbot performance evaluation error:', error);
      res.status(500).json({ error: 'Failed to evaluate chatbot performance' });
    }
  });

  app.get('/api/evaluation/rag-metrics', requireAuth, async (req: any, res: any) => {
    try {
      const metrics = await evaluationMetricsService.evaluateRAGPerformance();
      res.json({
        success: true,
        metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('RAG metrics evaluation error:', error);
      res.status(500).json({ error: 'Failed to evaluate RAG metrics' });
    }
  });

  app.get('/api/evaluation/comprehensive-report', requireAuth, async (req: any, res: any) => {
    try {
      const report = await evaluationMetricsService.generateEvaluationReport(req.user.id);
      res.json({
        success: true,
        report,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Comprehensive evaluation error:', error);
      res.status(500).json({ error: 'Failed to generate comprehensive evaluation report' });
    }
  });

  // Daily meal plan endpoint
  app.post('/api/nutrition/meal-plan', requireAuth, async (req: any, res: any) => {
    try {
      const { cuisinePreference = 'mediterranean', dietPreference, foodAllergies } = req.body;

      if (!cuisinePreference) {
        return res.status(400).json({ error: 'Cuisine preference is required' });
      }

      // Get user's onboarding data for health assessment
      const onboardingData = await storage.getOnboardingData(req.user.id);
      
      if (!onboardingData) {
        return res.status(400).json({ error: 'Complete onboarding first to get personalized meal plans' });
      }

      // Merge dietPreference and foodAllergies into userProfile context
      const healthConditions = nutritionistService.extractHealthConditions(onboardingData);
      const userProfile = {
        ...onboardingData,
        ...(dietPreference && { diet: dietPreference }),
        ...(foodAllergies && { foodAllergies }),
      };
      const mealPlan = await nutritionistService.generateMealPlan(
        healthConditions,
        cuisinePreference,
        userProfile
      );

      // Generate shopping list
      const shoppingList = nutritionistService.generateShoppingList(mealPlan);

      res.json({
        success: true,
        mealPlan,
        shoppingList,
        detectedConditions: healthConditions,
        message: `Generated ${cuisinePreference} meal plan for your health profile`
      });

    } catch (error) {
      console.error('Meal plan generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate meal plan',
        message: 'Please try again with a different cuisine or check your health profile' 
      });
    }
  });

  // Weekly meal plan endpoint
  app.post('/api/nutrition/meal-plan/weekly', requireAuth, async (req: any, res: any) => {
    try {
      const { cuisinePreference = 'mediterranean', dietPreference, foodAllergies } = req.body;

      if (!cuisinePreference) {
        return res.status(400).json({ error: 'Cuisine preference is required' });
      }

      const onboardingData = await storage.getOnboardingData(req.user.id);
      
      if (!onboardingData) {
        return res.status(400).json({ error: 'Complete onboarding first to get personalized meal plans' });
      }

      const healthConditions = nutritionistService.extractHealthConditions(onboardingData);
      const userProfile = {
        ...onboardingData,
        ...(dietPreference && { diet: dietPreference }),
        ...(foodAllergies && { foodAllergies }),
      };
      const weeklyPlan = await nutritionistService.generateWeeklyMealPlan(
        healthConditions,
        cuisinePreference,
        userProfile
      );

      const shoppingList = nutritionistService.generateWeeklyShoppingList(weeklyPlan.days);

      res.json({
        success: true,
        mealPlan: { weeklyPlan },
        shoppingList,
        detectedConditions: healthConditions,
        message: `Generated 7-day ${cuisinePreference} meal plan for your health profile`
      });

    } catch (error) {
      console.error('Weekly meal plan error:', error);
      res.status(500).json({ 
        error: 'Failed to generate weekly meal plan',
        message: 'Please try again with a different cuisine or check your health profile' 
      });
    }
  });

  // Monthly meal plan endpoint
  app.post('/api/nutrition/meal-plan/monthly', requireAuth, async (req: any, res: any) => {
    try {
      const { cuisinePreference = 'mediterranean', dietPreference, foodAllergies } = req.body;

      if (!cuisinePreference) {
        return res.status(400).json({ error: 'Cuisine preference is required' });
      }

      const onboardingData = await storage.getOnboardingData(req.user.id);
      
      if (!onboardingData) {
        return res.status(400).json({ error: 'Complete onboarding first to get personalized meal plans' });
      }

      const healthConditions = nutritionistService.extractHealthConditions(onboardingData);
      const userProfile = {
        ...onboardingData,
        ...(dietPreference && { diet: dietPreference }),
        ...(foodAllergies && { foodAllergies }),
      };
      const monthlyPlan = await nutritionistService.generateMonthlyMealPlan(
        healthConditions,
        cuisinePreference,
        userProfile
      );

      const shoppingList = nutritionistService.generateMonthlyShoppingList(monthlyPlan.weeks);

      res.json({
        success: true,
        mealPlan: { monthlyPlan },
        shoppingList,
        detectedConditions: healthConditions,
        message: `Generated 4-week ${cuisinePreference} meal plan for your health profile`
      });

    } catch (error) {
      console.error('Monthly meal plan error:', error);
      res.status(500).json({ 
        error: 'Failed to generate monthly meal plan',
        message: 'Please try again with a different cuisine or check your health profile' 
      });
    }
  });

  // Generate and download weekly meal plan PDF
  app.post('/api/nutrition/meal-plan/weekly/pdf', requireAuth, async (req: any, res: any) => {
    try {
      const { weeklyPlan, userProfile, cuisineStyle } = req.body;
      
      if (!weeklyPlan || !cuisineStyle) {
        return res.status(400).json({ error: 'Weekly plan and cuisine style are required' });
      }

      // Generate comprehensive text-based meal plan with menstrual cycle information
      const currentPhase = userProfile?.lastPeriodDate ? 
        (userProfile.irregularPeriods ? 'follicular' : 'follicular') : 'follicular';
      
      const phaseData = {
        follicular: {
          name: "Follicular Phase",
          description: "Energy building - Support estrogen with lignans and healthy fats",
          seeds: ["Ground flax seeds (1-2 tbsp daily)", "Raw pumpkin seeds (1-2 oz daily)"]
        }
      };

      const currentPhaseInfo = phaseData[currentPhase as keyof typeof phaseData] || phaseData.follicular;

      const textContent = `WEEKLY MEAL PLAN - ${cuisineStyle.toUpperCase()} CUISINE
=================================================================

MENSTRUAL CYCLE PHASE: ${currentPhaseInfo.name}
${currentPhaseInfo.description}

SEED CYCLING FOR THIS PHASE:
${currentPhaseInfo.seeds.map(seed => `• ${seed}`).join('\n')}

=================================================================
DAILY MEAL PLANS
=================================================================

${weeklyPlan.days.map((day: any) => `
${day.dayName.toUpperCase()} - ${day.date}
-----------------------------------------------------------------

🌅 BREAKFAST: ${day.meals.breakfast.name}
   Ingredients: ${day.meals.breakfast.ingredients.join(', ')}
   Prep time: ${day.meals.breakfast.preparation_time}
   Method: ${day.meals.breakfast.cooking_method}
   Health benefits: ${day.meals.breakfast.health_benefits.join(', ')}

☀️ LUNCH: ${day.meals.lunch.name}
   Ingredients: ${day.meals.lunch.ingredients.join(', ')}
   Prep time: ${day.meals.lunch.preparation_time}
   Method: ${day.meals.lunch.cooking_method}
   Health benefits: ${day.meals.lunch.health_benefits.join(', ')}

🌙 DINNER: ${day.meals.dinner.name}
   Ingredients: ${day.meals.dinner.ingredients.join(', ')}
   Prep time: ${day.meals.dinner.preparation_time}
   Method: ${day.meals.dinner.cooking_method}
   Health benefits: ${day.meals.dinner.health_benefits.join(', ')}

🍎 SNACKS: ${day.meals.snacks.map((snack: any) => snack.name).join(', ')}
   Details: ${day.meals.snacks.map((snack: any) => `${snack.name} (${snack.preparation_time})`).join(', ')}

`).join('\n')}

=================================================================
WEEKLY SHOPPING LIST
=================================================================

${Object.entries(weeklyPlan.weeklyShoppingList).map(([category, items]) => `
${category.toUpperCase().replace(/_/g, ' ')}:
${(items as string[]).map(item => `□ ${item}`).join('\n')}
`).join('\n')}

=================================================================
WEEKLY NOTES & TIPS
=================================================================

${weeklyPlan.weeklyNotes ? weeklyPlan.weeklyNotes.join('\n\n') : 'Focus on incorporating the recommended seeds for your current menstrual cycle phase to support hormonal balance and overall wellness.'}

Generated with love for your health journey! 💖
`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="weekly-meal-plan-${cuisineStyle.toLowerCase()}.txt"`);
      res.send(textContent);

    } catch (error) {
      console.error('Error generating weekly meal plan PDF:', error);
      res.status(500).json({ 
        error: 'Failed to generate weekly meal plan PDF', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Generate and download monthly meal plan PDF
  app.post('/api/nutrition/meal-plan/monthly/pdf', requireAuth, async (req: any, res: any) => {
    try {
      const { monthlyPlan, userProfile, cuisineStyle } = req.body;
      
      if (!monthlyPlan || !cuisineStyle) {
        return res.status(400).json({ error: 'Monthly plan and cuisine style are required' });
      }

      const pdfBuffer = await pdfGeneratorService.generateMonthlyMealPlanPDF(
        monthlyPlan,
        userProfile || {},
        cuisineStyle
      );

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="monthly-meal-plan-${cuisineStyle.toLowerCase()}.txt"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('Error generating monthly meal plan PDF:', error);
      res.status(500).json({ 
        error: 'Failed to generate monthly meal plan PDF', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Daily adaptive meal planning routes
  
  // Daily check-in endpoint
  app.get('/api/daily/check-in', requireAuth, async (req: any, res: any) => {
    try {
      const checkInResponse = await adaptiveMealPlannerService.generateCheckInQuestions(req.user.id);
      res.json(checkInResponse);
    } catch (error) {
      console.error('Error generating daily check-in:', error);
      res.status(500).json({ error: 'Failed to generate daily check-in' });
    }
  });

  // Generate today's meal plan
  app.post('/api/daily/meal-plan', requireAuth, async (req: any, res: any) => {
    try {
      const { previousFeedback } = req.body;
      const today = new Date().toISOString().split('T')[0];
      
      console.log('Generating meal plan for user:', req.user.id, 'date:', today);
      
      const mealPlan = await adaptiveMealPlannerService.generateTodaysMealPlan({
        userId: req.user.id,
        date: today,
        previousFeedback
      });

      console.log('Generated meal plan:', JSON.stringify(mealPlan, null, 2));

      await adaptiveMealPlannerService.saveTodaysMealPlan(req.user.id, mealPlan);

      // Ensure all arrays are properly typed
      const safeMealPlan = {
        ...mealPlan,
        adaptations: Array.isArray(mealPlan.adaptations) ? mealPlan.adaptations : [],
        snacks: Array.isArray(mealPlan.snacks) ? mealPlan.snacks : [],
        dailyGuidelines: {
          ...mealPlan.dailyGuidelines,
          foods_to_emphasize: Array.isArray(mealPlan.dailyGuidelines?.foods_to_emphasize) 
            ? mealPlan.dailyGuidelines.foods_to_emphasize 
            : [],
          foods_to_limit: Array.isArray(mealPlan.dailyGuidelines?.foods_to_limit)
            ? mealPlan.dailyGuidelines.foods_to_limit
            : [],
          hydration_tips: Array.isArray(mealPlan.dailyGuidelines?.hydration_tips)
            ? mealPlan.dailyGuidelines.hydration_tips
            : [],
          timing_recommendations: Array.isArray(mealPlan.dailyGuidelines?.timing_recommendations)
            ? mealPlan.dailyGuidelines.timing_recommendations
            : [],
          cycle_support: Array.isArray(mealPlan.dailyGuidelines?.cycle_support)
            ? mealPlan.dailyGuidelines.cycle_support
            : []
        }
      };

      res.json({
        success: true,
        mealPlan: safeMealPlan,
        message: "Today's personalized meal plan is ready!"
      });
    } catch (error) {
      console.error('Error generating daily meal plan:', error);
      res.status(500).json({ 
        error: 'Failed to generate daily meal plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Submit daily feedback
  app.post('/api/daily/feedback', requireAuth, async (req: any, res: any) => {
    try {
      const feedbackData = {
        ...req.body,
        userId: req.user.id
      };

      await adaptiveMealPlannerService.saveDailyFeedback(req.user.id, feedbackData);

      res.json({
        success: true,
        message: "Thank you for your feedback! I'll use this to personalize tomorrow's meal plan."
      });
    } catch (error) {
      console.error('Error saving daily feedback:', error);
      res.status(500).json({ 
        error: 'Failed to save feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get today's meal plan
  app.get('/api/daily/meal-plan/today', requireAuth, async (req: any, res: any) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const mealPlan = await storage.getDailyMealPlan(req.user.id, today);
      
      if (!mealPlan) {
        return res.json({ 
          success: false, 
          message: "No meal plan found for today. Let's create one!" 
        });
      }

      res.json({
        success: true,
        mealPlan
      });
    } catch (error) {
      console.error('Error fetching today\'s meal plan:', error);
      res.status(500).json({ error: 'Failed to fetch meal plan' });
    }
  });

  // Admin authentication middleware
  async function requireAdminAuth(req: any, res: any, next: any) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'No admin token provided' });
      }

      // For demo purposes, accept "admin-token" as a valid admin token
      if (token === 'admin-token') {
        req.admin = { username: 'admin', email: 'admin@winnie.com' };
        return next();
      }

      return res.status(401).json({ error: 'Invalid admin token' });
    } catch (error) {
      console.error('Admin authentication error:', error);
      res.status(401).json({ error: 'Invalid admin token' });
    }
  }

  // Admin login endpoint
  app.post('/api/admin/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      // Demo admin credentials
      if (username === 'admin' && password === 'admin123') {
        res.json({ 
          success: true, 
          token: 'admin-token',
          admin: { username: 'admin', email: 'admin@winnie.com' }
        });
        return;
      }

      // Try to validate against database
      const admin = await adminAuthService.validateAdmin(username, password);
      
      if (!admin) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      res.json({ 
        success: true, 
        token: 'admin-token', // In production, generate a proper JWT
        admin: { username: admin.username, email: admin.email }
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Get system metrics for admin dashboard
  app.get('/api/admin/metrics', requireAdminAuth, async (req: any, res: any) => {
    try {
      const metrics = await adminAuthService.getSystemMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

  // Get metrics history
  app.get('/api/admin/metrics/history', requireAdminAuth, async (req: any, res: any) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const history = await adminAuthService.getMetricsHistory(days);
      res.json(history);
    } catch (error) {
      console.error('Error fetching metrics history:', error);
      res.status(500).json({ error: 'Failed to fetch metrics history' });
    }
  });

  // Get all users for admin dashboard
  app.get('/api/admin/users', requireAdminAuth, async (req: any, res: any) => {
    try {
      const users = await adminAuthService.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Save current metrics
  app.post('/api/admin/metrics/save', requireAdminAuth, async (req: any, res: any) => {
    try {
      const metrics = await adminAuthService.saveMetrics();
      res.json({ success: true, metrics });
    } catch (error) {
      console.error('Error saving metrics:', error);
      res.status(500).json({ error: 'Failed to save metrics' });
    }
  });

  // Add endpoint for daily tip
  app.get('/api/daily-tip', (req, res) => {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    const dailyTip = DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
    res.json(dailyTip);
  });

  return server;
}