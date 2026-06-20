import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Recipe, UserProfile, DiaryEntry, Ingredient } from '../types';
import { ArrowLeft, Sparkles, AlertTriangle, Check, BookOpen, Loader2, Coins, Dumbbell, ShieldCheck, Trash2, ArrowUpRight } from 'lucide-react';

interface RecipeViewProps {
  profile: UserProfile;
  recipes: Recipe[];
  onBackToIngredients: () => void;
  onResetAll: () => void;
  ingredients: Ingredient[];
}

export default function RecipeView({ profile, recipes, onBackToIngredients, onResetAll, ingredients }: RecipeViewProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [diaryNotes, setDiaryNotes] = useState<string>('');
  const [hasSavedToday, setHasSavedToday] = useState<boolean>(false);
  
  // Custom states for images
  const [recipeImages, setRecipeImages] = useState<Record<number, string>>({});
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});

  // Tracks user-edited custom cost metrics per recipe
  const [customCosts, setCustomCosts] = useState<Record<number, { estimatedCostIfBought: number; actualCost: number }>>({});
  const [isEditingCosts, setIsEditingCosts] = useState<boolean>(false);
  const [editEstimated, setEditEstimated] = useState<number>(0);
  const [editActual, setEditActual] = useState<number>(0);

  const currentRecipe = recipes[currentIndex];

  // Derive dynamic cost figures based on user edits
  const custom = currentRecipe ? customCosts[currentRecipe.recommendNumber] : undefined;
  const derivedEstimated = custom ? custom.estimatedCostIfBought : (currentRecipe?.costStats.estimatedCostIfBought || 0);
  const derivedActual = custom ? custom.actualCost : (currentRecipe?.costStats.actualCost || 0);
  const derivedSavings = derivedEstimated - derivedActual;

  // Reset/populate cost fields when current recipe changes
  useEffect(() => {
    if (currentRecipe) {
      const customVal = customCosts[currentRecipe.recommendNumber];
      setEditEstimated(customVal ? customVal.estimatedCostIfBought : currentRecipe.costStats.estimatedCostIfBought);
      setEditActual(customVal ? customVal.actualCost : currentRecipe.costStats.actualCost);
      setIsEditingCosts(false);
    }
  }, [currentIndex, currentRecipe]);

  // Load diaries from persistent storage (localStorage)
  useEffect(() => {
    const stored = localStorage.getItem('refrigerator_eating_diary');
    if (stored) {
      try {
        setDiaries(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse diaries from localStorage', e);
      }
    }
  }, []);

  // Set initial image or generate one dynamically with the API
  useEffect(() => {
    if (recipes.length > 0) {
      recipes.forEach(recipe => {
        if (!recipeImages[recipe.recommendNumber]) {
          fetchRecipeImage(recipe);
        }
      });
    }
  }, [recipes]);

  const fetchRecipeImage = async (recipe: Recipe) => {
    setImageLoading(prev => ({ ...prev, [recipe.recommendNumber]: true }));
    try {
      const userKey = localStorage.getItem('custom_gemini_api_key');
      const fetchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (userKey) {
        fetchHeaders['x-gemini-api-key'] = userKey;
      }

      const resp = await fetch('/api/generate-image', {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify({
          prompt: recipe.imagePrompt || recipe.menuName,
          menuName: recipe.menuName,
          recommendNumber: recipe.recommendNumber,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.imageUrl) {
          setRecipeImages(prev => ({ ...prev, [recipe.recommendNumber]: data.imageUrl }));
        }
      }
    } catch (e) {
      console.error('Image generation error', e);
    } finally {
      setImageLoading(prev => ({ ...prev, [recipe.recommendNumber]: false }));
    }
  };

  const handleSaveToDiary = () => {
    if (!currentRecipe) return;

    // Create persistent diary entry
    const newEntry: DiaryEntry = {
      id: `diary_${Date.now()}`,
      date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
      userName: profile.name,
      recipeName: currentRecipe.menuName,
      savedCost: derivedSavings,
      ingredientsUsed: ingredients.filter(i => i.isExisting).map(i => i.name),
      notes: diaryNotes || `${profile.name} 님이 직접 냉장고 속 식재료들을 매칭하여 식비를 절감했습니다!`,
    };

    const updatedDiaries = [newEntry, ...diaries];
    setDiaries(updatedDiaries);
    localStorage.setItem('refrigerator_eating_diary', JSON.stringify(updatedDiaries));
    setDiaryNotes('');
    setHasSavedToday(true);
  };

  const handleDeleteDiary = (id: string) => {
    const updated = diaries.filter(d => d.id !== id);
    setDiaries(updated);
    localStorage.setItem('refrigerator_eating_diary', JSON.stringify(updated));
  };

  const totalAllTimeSavings = diaries.reduce((sum, d) => sum + d.savedCost, 0);

  return (
    <div className="w-full flex flex-col gap-6" id="recipe-rendering-view-container">
      
      {/* 1. SELECTION & ACTIONS NAV */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#e1ded7] p-4.5 rounded-[20px] shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <BookOpen className="text-brand-green" size={16} />
          <span className="text-xs font-extrabold text-[#0f4c3a] tracking-wider uppercase">Recommend Sequence:</span>
          <div className="flex flex-wrap gap-2 ml-1">
            {recipes.map((r, idx) => (
              <button
                key={r.recommendNumber}
                onClick={() => {
                  setCurrentIndex(idx);
                  setHasSavedToday(false);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer font-serif ${
                  currentIndex === idx 
                    ? 'bg-brand-green text-brand-sand shadow-sm' 
                    : 'bg-[#f5f2eb] text-[#344e41] hover:bg-[#ebdcc8] border border-[#e1ded7]/50'
                }`}
              >
                #{r.recommendNumber} - {r.menuName}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onBackToIngredients}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-brand-green hover:border-brand-green font-bold px-3 py-2 border border-[#e1ded7] rounded-all rounded-lg hover:bg-[#fafaf9] transition-all cursor-pointer bg-white shadow-sm font-serif"
          >
            <ArrowLeft size={13} /> 식재료 목록 편집
          </button>
          <button
            onClick={onResetAll}
            className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-bold px-3 py-2 border border-red-100 hover:bg-red-50/40 rounded-all rounded-lg transition-all cursor-pointer bg-white shadow-sm font-serif"
          >
            처음으로 가기
          </button>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="bg-white border border-[#e1ded7] p-12 text-center rounded-[32px] flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="animate-spin text-brand-green mb-4" size={32} />
          <p className="text-slate-700 font-bold font-serif">안전하고 정밀하게 최적의 파먹기 레시피를 매칭 중입니다...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT OUTLET SYSTEM MODULE (7/12 layout) */}
          <section className="lg:col-span-7 flex flex-col gap-6" id="recipe-main-display">
            <div className="bg-white rounded-[24px] shadow-sm border border-[#e1ded7] overflow-hidden flex flex-col">
              
              {/* Card Header (Luxury branding) */}
              <div className="p-6 border-b border-[#faf2eb] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#f5f2eb]/40">
                <div>
                  <h2 className="text-lg md:text-xl font-bold font-serif text-brand-green tracking-tight flex items-center gap-2">
                    🍳 {profile.name} 님 전용 파먹기 설계도
                  </h2>
                  <p className="text-[9px] text-brand-gold font-bold font-serif uppercase tracking-widest mt-1">
                    Module: Recipe Matching Engine v2.1
                  </p>
                </div>
                <span className="text-[10px] font-serif bg-brand-green text-brand-sand border border-brand-green px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
                  최고의 경제식 매치 성공
                </span>
              </div>

              {/* Card Content body */}
              <div className="p-6 md:p-8 flex flex-col gap-6">
                
                {/* Title block */}
                <div>
                  <span className="inline-block bg-[#ebf3ee] text-brand-green text-[9px] font-bold font-serif uppercase tracking-widest px-2.5 py-1 rounded-md mb-2">
                    추천 순위 #{currentRecipe.recommendNumber}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-bold font-serif text-brand-green tracking-tight leading-tight mt-1">
                    {currentRecipe.menuName}
                  </h3>
                </div>

                {/* AI generated image component matching high-end vibe */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">
                    완성 요리 시각화 (AI Image Scan)
                  </span>
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-[#e1ded7] flex items-center justify-center bg-[#faf8f5] shadow-inner">
                    {imageLoading[currentRecipe.recommendNumber] ? (
                      <div className="flex flex-col items-center gap-2 text-slate-400 p-4">
                        <Loader2 className="animate-spin text-brand-green" size={28} />
                        <span className="text-xs font-bold font-sans">Gemini가 고급 파먹기 이미지를 요리하는 중...</span>
                      </div>
                    ) : recipeImages[currentRecipe.recommendNumber] ? (
                      <img 
                        src={recipeImages[currentRecipe.recommendNumber]} 
                        alt={currentRecipe.menuName} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 gap-1.5">
                        <span className="text-3xl">🍲</span>
                        <span className="text-xs font-bold font-serif">완성 시각화 준비 완료</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-brand-green/80 backdrop-blur-md text-[8px] tracking-wider text-brand-sand px-2.5 py-1 rounded-full font-bold uppercase font-serif">
                      AI Generated
                    </div>
                  </div>
                </div>

                {/* Structured Cooking steps */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">
                    완벽 레시피 핵심 조리순서 (Modular Steps)
                  </span>
                  <div className="flex flex-col gap-3">
                    {currentRecipe.cookingGuide.map((step, sIdx) => (
                      <div key={sIdx} className="flex gap-4 items-start bg-[#faf8f5]/55 border border-[#e1ded7]/50 p-4 rounded-xl hover:bg-white hover:border-[#cfc6b8] transition-all duration-200">
                        <span className="w-6 h-6 rounded-full bg-brand-green text-brand-sand flex-shrink-0 flex items-center justify-center font-bold text-xs font-serif shadow-sm">
                          {sIdx + 1}
                        </span>
                        <p className="text-xs md:text-sm text-brand-dark leading-relaxed font-semibold">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Budget metrics and nutritions */}
                <div className="border-t border-[#faf2eb] pt-6 flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-[#b38a5f] font-serif uppercase tracking-widest">
                    📊 가계부 식비 절감 및 정량 영양 성분표
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Cost savings cards themed warm green/herbal */}
                    <div className="bg-[#ebf3ee]/55 border border-brand-green/30 p-5 rounded-2xl flex flex-col justify-between hover:border-brand-green transition-all shadow-sm">
                      {isEditingCosts ? (
                        <div className="flex flex-col gap-3 w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-[#0f4c3a] uppercase tracking-wider flex items-center gap-1">
                              <Coins size={14} className="text-[#8f5c2d]" />
                              <span>금액 직접 수정</span>
                            </span>
                            <span className="text-[9px] bg-brand-green text-brand-sand px-1.5 py-0.5 rounded font-extrabold font-serif">
                              실시간 계산
                            </span>
                          </div>
                          
                          <div className="flex flex-col gap-2 mt-1">
                            <div>
                              <label className="text-[10px] text-slate-600 font-extrabold block mb-0.5">
                                🛒 외부 식당가 / 마트 신선 구매가 (₩)
                              </label>
                              <input
                                type="number"
                                value={editEstimated}
                                onChange={(e) => setEditEstimated(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full bg-white border border-[#e1ded7] px-2.5 py-1 text-xs rounded-lg font-bold text-slate-800 focus:outline-[#0f4c3a]"
                                placeholder="예: 12000"
                              />
                            </div>
                            
                            <div>
                              <label className="text-[10px] text-slate-600 font-extrabold block mb-0.5">
                                🔌 직접 만들며 추가 지출한 소비액 (₩)
                              </label>
                              <input
                                type="number"
                                value={editActual}
                                onChange={(e) => setEditActual(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full bg-white border border-[#e1ded7] px-2.5 py-1 text-xs rounded-lg font-bold text-slate-800 focus:outline-[#0f4c3a]"
                                placeholder="예: 0"
                              />
                            </div>
                          </div>

                          <div className="text-xs font-extrabold text-[#0f4c3a] mt-1 bg-white/80 p-2 rounded-lg border border-brand-green/20 flex justify-between items-center">
                            <span>최종 절감액:</span>
                            <span className="text-brand-green font-serif text-sm">₩{(editEstimated - editActual).toLocaleString()}</span>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setCustomCosts(prev => ({
                                  ...prev,
                                  [currentRecipe.recommendNumber]: {
                                    estimatedCostIfBought: editEstimated,
                                    actualCost: editActual
                                  }
                                }));
                                setIsEditingCosts(false);
                              }}
                              className="flex-1 bg-brand-green text-brand-sand font-bold text-[10px] py-1.5 rounded-lg hover:bg-[#0c3c2e] transition-all cursor-pointer"
                            >
                              반영하기
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingCosts(false)}
                              className="flex-1 bg-white border border-[#e1ded7] text-slate-600 font-bold text-[10px] py-1.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col justify-between h-full w-full">
                          <div>
                            <div className="flex items-center justify-between text-brand-green font-extrabold text-xs uppercase tracking-wider">
                              <span className="flex items-center gap-1.5">
                                <Coins size={14} className="text-[#8f5c2d]" />
                                <span>Est. Cost Savings metrics</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditEstimated(derivedEstimated);
                                  setEditActual(derivedActual);
                                  setIsEditingCosts(true);
                                }}
                                className="text-[10px] bg-white border border-brand-green/30 text-brand-green px-1.5 py-0.5 rounded hover:bg-brand-green hover:text-white transition-all font-serif font-bold cursor-pointer inline-flex items-center gap-0.5"
                              >
                                직접 기입 ✏️
                              </button>
                            </div>
                            <div className="text-xl md:text-2xl font-extrabold text-brand-green mt-2 tracking-tight">
                              ₩{derivedSavings.toLocaleString()} <span className="text-xs font-extrabold">식비 절감</span>
                            </div>
                            <p className="text-xs text-slate-800 mt-2.5 leading-relaxed font-bold">
                              {currentRecipe.costStats.costSavingNote}
                            </p>
                          </div>
                          
                          <div className="mt-4 pt-3 border-t border-brand-green/10 flex justify-between text-[9px] text-[#b38a5f] font-serif font-bold">
                            <span>사먹을 때: ₩{derivedEstimated.toLocaleString()}</span>
                            <span>추가 지출: ₩{derivedActual.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Nutrition detail card */}
                    <div className="bg-[#faf8f5] border border-[#e1ded7] p-5 rounded-2xl flex flex-col justify-between hover:border-brand-gold transition-all">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-bold text-[#b38a5f] uppercase tracking-wider font-serif flex items-center gap-1">
                            <Dumbbell size={12} /> Nutrition Scale
                          </span>
                          <span className="text-[9px] font-serif text-brand-green bg-[#ebf3ee] border border-brand-green/20 px-2 py-0.5 rounded-full font-bold">
                            밸런스 점수 {currentRecipe.nutrition.balanceScore} / 100
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 text-center my-3 bg-white p-2 rounded-xl border border-[#e1ded7]/50 shadow-sm">
                          <div>
                            <span className="text-xs text-slate-700 font-extrabold block">열량</span>
                            <span className="text-xs font-extrabold text-brand-dark">{currentRecipe.nutrition.calories}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-700 font-extrabold block">탄수</span>
                            <span className="text-xs font-extrabold text-brand-dark">{currentRecipe.nutrition.carbs}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-700 font-extrabold block">단백</span>
                            <span className="text-xs font-extrabold text-brand-dark">{currentRecipe.nutrition.protein}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-700 font-extrabold block">지방</span>
                            <span className="text-xs font-extrabold text-brand-dark">{currentRecipe.nutrition.fat}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-800 leading-relaxed font-bold">
                          {currentRecipe.nutrition.nutritionNotes}
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* 3. Ingredient Calorie Breakdown */}
                  {currentRecipe.ingredientCalories && currentRecipe.ingredientCalories.length > 0 && (
                    <div className="bg-[#faf8f5] border border-[#d5cebd] p-5 rounded-[20px] flex flex-col gap-3.5 mt-4 hover:border-brand-green/45 transition-all shadow-sm">
                      <div>
                        <div className="flex items-center gap-1.5 text-brand-green font-extrabold text-xs uppercase tracking-wider">
                          <Sparkles size={14} className="text-brand-gold animate-pulse" />
                          <span>각 구성 식재료 및 음식별 개별 칼로리 분석 <span className="text-brand-orange text-[9px] lowercase font-sans">(nutrition breakdown)</span></span>
                        </div>
                        <p className="text-xs text-slate-700 mt-1 font-bold leading-relaxed">
                          해당 레시피 요리를 구성하는 개별 식재료의 중량 단위별 칼로리 소모 기여도와 점유율 평가 데이터입니다.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {currentRecipe.ingredientCalories.map((item, idx) => {
                          const rawPercent = item.proportion ? parseInt(item.proportion, 10) : 0;
                          const widthPercent = Math.min(Math.max(rawPercent, 2), 100);

                          return (
                            <div key={idx} className="bg-white px-4 py-3 border border-[#e1ded7]/70 rounded-xl flex flex-col gap-2 hover:shadow-sm transition-all">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-extrabold text-slate-800">{item.name}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-black text-[#9d6f43] bg-[#faf2eb] px-2 py-0.5 rounded text-[10px]">{item.calories}</span>
                                  {item.proportion && (
                                    <span className="font-extrabold text-slate-800 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{item.proportion}</span>
                                  )}
                                </div>
                              </div>
                              {/* Micro Progress Bar */}
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-brand-green rounded-full transition-all duration-500"
                                  style={{ width: `${widthPercent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </section>

          {/* RIGHT COLUMN SIDEBARS (5/12 layout) */}
          <section className="lg:col-span-5 flex flex-col gap-6" id="diary-and-safety-sidebars">
            
            {/* HERBAL DIARY LEDGER */}
            <div className="bg-[#0f4c3a] text-brand-sand rounded-[24px] shadow-md p-6 flex flex-col gap-5 border border-brand-green relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-brand-medium/30 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-3 relative z-10">
                <span className="p-2.5 bg-brand-sand/10 rounded-2xl text-brand-sand border border-white/5">
                  <Coins size={18} className="text-[#ebd0b9]" />
                </span>
                <div>
                  <h3 className="text-md md:text-base font-bold font-serif text-white tracking-tight leading-none">식재료 절감 다이어리</h3>
                  <span className="text-[8px] text-[#ebd0b9]/80 font-serif font-bold block mt-1 uppercase tracking-widest">Storage Ledger Record</span>
                </div>
              </div>

              {/* Box input */}
              <div className="bg-brand-sand/10 rounded-xl p-4 flex flex-col gap-3.5 border border-white/10 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-brand-lime font-bold font-sans">절감 세이브 지출 원장 등재</span>
                  <span className="text-[10px] font-serif bg-[#ebd0b9] text-brand-dark px-2.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 shadow-sm">
                    +₩{derivedSavings.toLocaleString()} Saving
                  </span>
                </div>
                
                <input
                  type="text"
                  value={diaryNotes}
                  onChange={(e) => setDiaryNotes(e.target.value)}
                  placeholder="오늘의 냉장고파먹기 성공 요점을 짧게 적어보세요."
                  className="w-full text-xs bg-brand-green border border-brand-medium rounded-lg px-3 py-2.5 text-white placeholder-[#cfdbd5]/50 focus:outline-none focus:border-brand-sand font-semibold transition-all"
                />

                <button
                  onClick={handleSaveToDiary}
                  disabled={hasSavedToday}
                  className="w-full py-2.5 bg-[#ebd0b9] hover:bg-[#ebd5c1] disabled:bg-[#1a3a2e] disabled:text-brand-lime/30 text-brand-dark text-[11px] font-serif font-black rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  {hasSavedToday ? (
                    <>
                      <Check size={12} className="text-brand-green" /> 가계 다이어리 등재 완료
                    </>
                  ) : (
                    <>
                      파먹기 성공 다이어리 서명하기 <ArrowUpRight size={12} />
                    </>
                  )}
                </button>
              </div>

              {/* Accumulated stats */}
              <div className="grid grid-cols-2 gap-3 bg-[#0d3f30] p-4.5 rounded-xl border border-brand-medium/40 relative z-10">
                <div className="text-center border-r border-[#ebd0b9]/15">
                  <span className="text-[8px] uppercase tracking-widest text-[#cfdbd5] font-serif font-bold block">누적 절약 횟수</span>
                  <span className="text-lg font-bold text-white mt-1 block font-serif">{diaries.length}회</span>
                </div>
                <div className="text-center">
                  <span className="text-[8px] uppercase tracking-widest text-[#cfdbd5] font-serif font-bold block">총 소진 절감액</span>
                  <span className="text-lg font-bold text-[#ebd0b9] mt-1 block font-serif">₩{totalAllTimeSavings.toLocaleString()}</span>
                </div>
              </div>

              {/* List of saved diaries */}
              <div className="flex flex-col gap-2 relative z-10">
                <span className="block text-[9px] font-bold text-brand-lime uppercase tracking-widest font-serif">
                  📋 누적 식비 절감 가계원장
                </span>

                {diaries.length === 0 ? (
                  <div className="text-center border border-dashed border-[#cfdbd5]/20 p-6 rounded-xl text-[#cfdbd5]/60 text-xs font-serif leading-relaxed">
                    작성된 다이어리가 아직 비어 있습니다.<br />레시피 완성 기록을 클릭해 원장을 가꿔보세요!
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1 select-text">
                    {diaries.map(d => (
                      <div key={d.id} className="bg-brand-sand/5 border border-brand-medium/50 rounded-xl p-3 flex flex-col gap-1.5 text-xs text-[#cfdbd5] relative group hover:border-brand-sand/30 transition-all">
                        <div className="flex justify-between items-center text-[#ebd0b9] text-[9px] font-serif font-bold">
                          <span>📅 {d.date}</span>
                          <span className="text-brand-lime">₩{d.savedCost.toLocaleString()} 절감됨</span>
                        </div>
                        <p className="font-bold text-white text-xs font-serif">🍳 {d.recipeName}</p>
                        <p className="text-[10px] text-[#cfdbd5] bg-brand-green/80 p-2 rounded-lg border border-brand-medium/30 italic">
                          "{d.notes}"
                        </p>
                        
                        <div className="text-[10px] text-[#cfdbd5] flex flex-wrap items-center gap-1.5 mt-1 font-bold">
                          <span className="text-brand-lime text-[9px] font-serif">사용한 재료:</span>
                          {d.ingredientsUsed.map((ing, iIdx) => (
                            <span key={iIdx} className="bg-[#0b382a] border border-brand-medium/40 px-1.5 py-0.5 rounded text-[8px] text-brand-lime">{ing}</span>
                          ))}
                        </div>

                        <button
                          onClick={() => handleDeleteDiary(d.id)}
                          className="absolute right-3 top-3 text-brand-lime/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
                          title="삭제"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* SAFETY VISUAL SANITATION MODULE */}
            <div className="bg-white rounded-[24px] shadow-sm border border-[#e1ded7] p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2.5 text-brand-gold">
                <span className="p-2.5 bg-[#f5f2eb] rounded-2xl border border-[#e1ded7]">
                  <ShieldCheck size={18} className="text-brand-green" />
                </span>
                <div>
                  <h3 className="text-sm md:text-base font-bold font-serif text-brand-green tracking-tight leading-none">식위생 및 안전 점검 모듈</h3>
                  <span className="text-[8px] text-brand-gold font-serif font-bold uppercase block mt-1">Safety & Sanitation Engine</span>
                </div>
              </div>

              {/* safety directive warnings card */}
              <div className="bg-[#faf2eb] border-l-4 border-[#b38a5f] p-4 rounded-r-2xl border-t border-r border-b border-[#e1ded7]/30">
                <span className="block text-[8px] font-black text-[#b38a5f] font-serif uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <AlertTriangle size={11} /> [안전 위생 처방 지시서]
                </span>
                <p className="text-xs text-brand-dark leading-relaxed font-semibold">
                  {currentRecipe.safetyMessage}
                </p>
              </div>

              {/* Detailed sanitation blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
                <div className="p-4 bg-[#faf8f5] border border-[#d5cebd] rounded-xl leading-relaxed text-slate-800">
                  <span className="block font-extrabold text-brand-green mb-1.5">식재료 유통 관리</span>
                  사용된 보유 식재료 중 상단 위생 등급에서 주의 처분된 보관 꿀팁을 제공함으로써 식중독 및 부패 리스크를 사전 탐지 차단합니다.
                </div>
                <div className="p-4 bg-[#faf8f5] border border-[#d5cebd] rounded-xl leading-relaxed text-slate-800">
                  <span className="block font-extrabold text-brand-green mb-1.5">식단 가이드 우선</span>
                  불필요하게 과영양되는 배달 음식을 억제하고 현재 식습관 목적의 가계 효율을 최상급으로 향상시킬 수 있도록 도와줍니다.
                </div>
              </div>
            </div>

            {/* LOGGING SYSTEMS */}
            <div className="bg-brand-dark text-slate-400 p-4.5 rounded-xl text-[9px] font-mono leading-relaxed shadow-inner border border-brand-green/10">
              <p>&gt; ACTIVE_VIEW: [RECIPE_SELECTION_TEMPLATE]</p>
              <p>&gt; DIARY_PERSISTENCE: [LOCALSTORAGE_SYNCED]</p>
              <p>&gt; PRESETS_FONT_FAMILY: [PRETENDARD]</p>
              <p className="text-brand-lime">&gt; SLEEK_INTERFACE: [HERB_AESTHETIC_UNIFIED_COMPLETE]</p>
            </div>

          </section>

        </div>
      )}
    </div>
  );
}
