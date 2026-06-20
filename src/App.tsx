import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, UserProfile, Ingredient } from './types';
import LandingHero from './components/LandingHero';
import ProfileInput from './components/ProfileInput';
import IngredientCollection from './components/IngredientCollection';
import RecipeView from './components/RecipeView';
import { Sparkles, Cpu, Leaf } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState>({
    step: 'landing', // Default starting step is landing to capture attention
    profile: {
      name: '',
      purpose: 'saving',
      purposeText: '',
      recipient: 'solo',
      recipientText: ''
    },
    ingredients: [],
    recipes: [],
    currentRecipeIndex: 0,
    diaries: [],
    isLoading: false,
    isImageLoading: false,
    statusMessage: '스마트 냉장고 솔루션: 랜딩페이지 활성화 및 시스템 준비 완료',
    error: null,
  });

  const [hasSavedProfile, setHasSavedProfile] = useState<boolean>(false);
  const [isApiKeyVerified, setIsApiKeyVerified] = useState<boolean>(false);

  // Check storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('refined_fridge_profile');
    if (saved) {
      setHasSavedProfile(true);
    }
    const savedKey = localStorage.getItem('custom_gemini_api_key');
    if (savedKey && savedKey.trim().length > 0) {
      setIsApiKeyVerified(true);
    }
  }, []);

  const handleApiKeyVerified = () => {
    const savedKey = localStorage.getItem('custom_gemini_api_key');
    setIsApiKeyVerified(!!savedKey && savedKey.trim().length > 0);
  };

  const handleStartLanding = () => {
    setState((prev) => ({
      ...prev,
      step: 'profile',
      statusMessage: '셰프 프로필 입력 및 초기 배정 단계 진입',
    }));
  };

  const handleContinueWithSaved = () => {
    const saved = localStorage.getItem('refined_fridge_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState((prev) => ({
          ...prev,
          profile: parsed,
          step: 'ingredients',
          statusMessage: '기존에 작성된 프리텐다드 프로필 데이터를 성공적으로 매핑했습니다.',
        }));
      } catch (e) {
        console.error('Saved profile issue:', e);
      }
    }
  };

  // Update profile handler (Step 1 Initialization)
  const handleProfileComplete = (profile: UserProfile) => {
    localStorage.setItem('refined_fridge_profile', JSON.stringify(profile));
    setHasSavedProfile(true);
    
    setState((prev) => ({
      ...prev,
      profile,
      step: 'ingredients',
      statusMessage: '식재료 파싱 및 안전 스캔 준비 단계에 도달했습니다.',
    }));
  };

  const handleBackToProfile = () => {
    setState((prev) => ({
      ...prev,
      step: 'profile',
      statusMessage: '프로필 설정을 새롭게 갱신하는 중',
    }));
  };

  // Reset entire flow back to beginnings
  const handleResetAll = () => {
    localStorage.removeItem('refined_fridge_profile');
    setHasSavedProfile(false);
    setState({
      step: 'landing',
      profile: {
        name: '',
        purpose: 'saving',
        purposeText: '',
        recipient: 'solo',
        recipientText: ''
      },
      ingredients: [],
      recipes: [],
      currentRecipeIndex: 0,
      diaries: [],
      isLoading: false,
      isImageLoading: false,
      statusMessage: '모든 상태 초기화 및 인트로 캐싱 클리어',
      error: null,
    });
  };

  // Handle ingredient lists submission (Step 2 Ingredients collection complete)
  const handleIngredientsComplete = async (ingredients: Ingredient[]) => {
    setState((prev) => ({
      ...prev,
      ingredients,
      step: 'recipe_matching',
      isLoading: true,
      statusMessage: '최고 경제성 보장 레시피 매칭 알고리즘을 지능적으로 가동 중...',
    }));

    try {
      const userKey = localStorage.getItem('custom_gemini_api_key');
      const fetchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (userKey) {
        fetchHeaders['x-gemini-api-key'] = userKey;
      }

      const response = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify({
          profile: state.profile,
          ingredients,
        }),
      });

      if (!response.ok) {
        let errorMsg = '레시피 추천 엔진이 정시 계산을 완수하지 못했습니다.';
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errorMsg += ` (${errData.error})`;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const data = await response.json();
      
      setState((prev) => ({
        ...prev,
        recipes: data.recipes || [],
        step: 'rendering',
        isLoading: false,
        statusMessage: '식비 & 영양 가이드 구조화 템플릿 실시간 마운트 진행',
      }));
    } catch (err: any) {
      console.error(err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        step: 'ingredients', // fallback
        error: err.message || '가용 가능한 레시피 모듈 로딩 상의 통신 불일치 발생',
        statusMessage: '정상 궤도로 안전 회귀 처리하였습니다.',
      }));
    }
  };

  const handleBackToIngredients = () => {
    setState((prev) => ({
      ...prev,
      step: 'ingredients',
      statusMessage: '정규화 식재료 개별 수량 및 상태 편집 중...',
    }));
  };

  // State monitoring text for UI footer
  const getStepBadge = () => {
    switch (state.step) {
      case 'landing': return 'LANDING_SHOWCASE';
      case 'profile': return 'PROFILE_INITIALIZATION';
      case 'ingredients': return 'INPUT_NORMALIZATION';
      case 'recipe_matching': return 'RECIPE_MATCHING';
      case 'rendering': return 'RENDERING_VIEW';
      default: return 'IDLE';
    }
  };

  return (
    <div className="bg-[#faf8f5] text-brand-dark min-h-screen flex flex-col font-sans select-none antialiased">
      
      {/* Top Header Module (Botanical Premium Specification) */}
      <header className="h-16 bg-white border-b border-[#e1ded7] px-6 md:px-8 flex items-center justify-between shadow-[0_1px_10px_rgba(15,76,58,0.015)] flex-shrink-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-green rounded-xl flex items-center justify-center text-brand-sand font-serif font-black text-lg tracking-wider shadow-sm">
            H
          </div>
          <h1 className="text-base md:text-lg font-bold tracking-tight text-brand-green font-serif flex items-center gap-2">
            냉장고 파먹기 <span className="text-brand-green font-bold text-[10px] bg-[#ebf3ee] border border-brand-green/20 px-2 py-0.5 rounded-full font-serif tracking-widest uppercase">SMART SPEC</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3 text-xs font-semibold font-serif">
          <span className="text-[#b38a5f] hidden sm:inline tracking-widest uppercase">
            Status: <span className="text-brand-green font-black">[{getStepBadge()}]</span>
          </span>
          <div className="h-4 w-px bg-[#e1ded7] hidden sm:block"></div>
          {state.profile.name ? (
            <div className="flex items-center gap-2 bg-[#ebf3ee] border border-brand-green/10 px-3 py-1.5 rounded-full text-brand-green font-serif font-bold">
              <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-ping"></span>
              {state.profile.name} 님
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#f5f2eb] text-[#b38a5f] px-3 py-1.5 border border-[#e1ded7]/60 rounded-full font-serif font-bold">
              <span className="w-1.5 h-1.5 bg-brand-gold/60 rounded-full"></span>
              GUEST
            </div>
          )}
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 flex flex-col justify-start">
        
        {/* Error notification */}
        {state.error && (
          <div className="bg-[#faf2eb] border border-[#e1ded7] text-brand-dark px-4 py-3.5 rounded-2xl text-xs sm:text-sm mb-5 flex items-center justify-between shadow-sm font-serif">
            <span className="font-bold text-[#b38a5f]">⚠️ {state.error}</span>
            <button 
              onClick={() => setState(p => ({ ...p, error: null }))}
              className="text-brand-gold hover:text-brand-green font-bold px-1 cursor-pointer"
            >
              닫기
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* Step 0: landing page */}
          {state.step === 'landing' && (
            <motion.div
              key="landing_hero"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.25 }}
            >
              <LandingHero 
                onStart={handleStartLanding}
                savedProfileExists={hasSavedProfile}
                onContinue={handleContinueWithSaved}
                onApiKeyVerified={handleApiKeyVerified}
                isInitiallyVerified={isApiKeyVerified}
              />
            </motion.div>
          )}

          {/* Step 1 Profile Initialization Component */}
          {state.step === 'profile' && (
            <motion.div
              key="profile_intro"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="py-6 flex flex-col justify-center items-center gap-6"
            >
              <div className="text-center max-w-xl mx-auto flex flex-col gap-2">
                <span className="inline-flex gap-1.5 items-center px-3 py-1 bg-[#ebf3ee] text-brand-green border border-brand-green/20 rounded-full text-[10px] font-bold w-fit mx-auto shadow-sm font-serif uppercase tracking-widest">
                  <Cpu size={12} className="text-brand-green" /> SYSTEM: PROFILE_LAYER
                </span>
                <h2 className="text-3xl md:text-4xl font-bold font-serif text-brand-green tracking-tight leading-tight">
                  낭비는 0원, 조리 효율 극대화!<br />
                  <span className="text-brand-gold font-normal italic">지능형 셰프 초기화 단계</span>
                </h2>
                <p className="text-xs md:text-sm text-slate-500 leading-relaxed font-normal">
                  프로필 설정을 진행하는 시점에 맞춤 식재료 데이터 정규화(Data Normalization) 모듈과 <br />
                  대중성 우선 레시피 매칭 엔진이 유기적인 JSON 데이터 흐름을 형성합니다.
                </p>
              </div>

              <ProfileInput onComplete={handleProfileComplete} />
            </motion.div>
          )}

          {/* Step 2 Ingredient Capture & Parser Component */}
          {state.step === 'ingredients' && (
            <motion.div
              key="ingredients_capture"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-2"
            >
              <div className="flex flex-col gap-1.5 mb-5 border-b border-[#faf2eb] pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-serif font-bold text-brand-green bg-[#ebf3ee] border border-brand-green/20 px-2.5 py-1 rounded-full uppercase tracking-widest">
                    MODULE 02
                  </span>
                  <span className="text-xs font-bold text-[#b38a5f] uppercase tracking-wider font-serif">
                    인공지능 음식 스캐너 및 유효 목록 정규화
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold font-serif text-brand-green tracking-tight">현실 식재료 정규화 (Data Normalization)</h2>
                <p className="text-xs text-slate-500 font-medium">집에 있는 남은 야채, 해산물, 양념 등 사소한 단어 하나만 적거나 수동 추가 및 사진을 올려 즉시 객체화하십시오.</p>
              </div>

              <IngredientCollection 
                profile={state.profile}
                initialIngredients={state.ingredients}
                onComplete={handleIngredientsComplete}
                onBack={handleBackToProfile}
              />
            </motion.div>
          )}

          {/* Step 3 Recipe Matching Loader */}
          {state.step === 'recipe_matching' && (
            <motion.div
              key="recipe_matching_loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center py-20 text-center gap-5"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-[#faf2eb] border-t-brand-green animate-spin" />
                <Leaf size={24} className="absolute inset-0 m-auto text-brand-green animate-bounce" />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono font-bold text-brand-green bg-[#ebf3ee] border border-brand-green/20 px-3 py-1 rounded-full w-fit mx-auto shadow-sm">
                  PROCESSOR: ENGINE_RUNNING
                </span>
                <h3 className="text-xl md:text-2xl font-bold font-serif text-brand-green">
                  수석 아키텍트 레시피 매칭 로직 정밀 수행 중...
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  보유하신 정규화 식재료 가입 상태를 참조하여, <br />
                  실험적 괴식을 필터링하고 맛이 보장된 대중적인 조리 가이드와 <br />
                  식비 절감 통계, 안심 안전 모듈 처방전을 실시간 가공하고 있습니다.
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 4 Render Unified Output Template Component */}
          {state.step === 'rendering' && (
            <motion.div
              key="rendering_output"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="py-2"
            >
              <RecipeView 
                profile={state.profile}
                recipes={state.recipes}
                ingredients={state.ingredients}
                onBackToIngredients={handleBackToIngredients}
                onResetAll={handleResetAll}
              />
            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* Global Bottom Console Logger (Unified Specifications) */}
      <footer className="bg-brand-dark text-slate-400 p-4 border-t border-brand-green/10 font-mono text-[10px] leading-relaxed select-text flex-shrink-0">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="text-[#ebd0b9] font-bold font-serif uppercase tracking-wider">&gt; Active State: [{getStepBadge()}]</span>
            <span className="hidden sm:inline text-brand-green">|</span>
            <span className="flex items-center gap-1.5 text-slate-355 font-bold">
              <span className="w-1.5 h-1.5 bg-[#cfdbd5] rounded-full animate-pulse"></span>
              Logger status: <span className="text-brand-lime font-mono">{state.statusMessage}</span>
            </span>
          </div>
          <div className="text-slate-500 font-sans select-none tracking-tight">
            Refrigerator Dining Planner System v2.1 • All Rights Reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
