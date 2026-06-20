export interface UserProfile {
  name: string;
  purpose: 'saving' | 'diet' | 'convenience' | 'healthy' | 'other';
  purposeText: string;
  recipient: 'solo' | 'couple' | 'family' | 'kids' | 'elderly' | 'other';
  recipientText: string;
}

export interface Ingredient {
  name: string;
  amount: string; // e.g. "2개", "100g", "약간"
  condition: string; // e.g. "신선함", "유통기한 임박", "냉동"
  category: string; // e.g. "채소", "고기/해산물", "소스/양념", "해산물", "유제품", "기타"
  isExisting: boolean; // True if physically exists in fridge, false if must be bought
  estimatedCalories?: string; // e.g. "80 kcal", "240 kcal"
}

export interface Recipe {
  recommendNumber: number;
  menuName: string;
  imageUrl: string;
  cookingGuide: string[]; // Modular step-by-step
  costStats: {
    estimatedCostIfBought: number; // 원화
    actualCost: number; // 원화 (보통 0원이거나 아주 작음)
    savings: number; // estimated - actual
    costSavingNote: string;
  };
  nutrition: {
    calories: string;
    carbs: string;
    protein: string;
    fat: string;
    balanceScore: number; // 0-100
    nutritionNotes: string;
    ingredientCalories?: { name: string; calories: string }[]; // 각 핵심 식재료별 칼로리 분석 결과 추가
  };
  safetyMessage: string; // 안전 점검 모듈 메시지 (의심 식재료, 보관 팁, 유통기한 주의사항 등)
  imagePrompt?: string;
  ingredientCalories?: Array<{ name: string; calories: string; proportion?: string }>; // Detailed calorie analysis per food item
}

export interface DiaryEntry {
  id: string;
  date: string;
  userName: string;
  recipeName: string;
  savedCost: number;
  ingredientsUsed: string[];
  notes: string;
}

export type AppStep = 'landing' | 'profile' | 'ingredients' | 'recipe_matching' | 'rendering';

export interface AppState {
  step: AppStep;
  profile: UserProfile;
  ingredients: Ingredient[];
  recipes: Recipe[];
  currentRecipeIndex: number; // Index of recommended recipe currently displayed
  diaries: DiaryEntry[];
  isLoading: boolean;
  isImageLoading: boolean;
  statusMessage: string;
  error: string | null;
}
