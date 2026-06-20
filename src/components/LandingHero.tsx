import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, TrendingDown, ShieldCheck, BookOpen, ChevronRight, Apple, 
  DollarSign, Leaf, Lock, CheckCircle2, ChevronDown, ChevronUp, HelpCircle, 
  Loader2, ExternalLink, Check, AlertCircle 
} from 'lucide-react';

interface LandingHeroProps {
  onStart: () => void;
  savedProfileExists: boolean;
  onContinue: () => void;
  onApiKeyVerified: () => void;
  isInitiallyVerified: boolean;
}

export default function LandingHero({ 
  onStart, 
  savedProfileExists, 
  onContinue,
  onApiKeyVerified,
  isInitiallyVerified
}: LandingHeroProps) {
  const [apiKey, setApiKey] = useState('');
  const [isVerified, setIsVerified] = useState(isInitiallyVerified);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  // Sync state if initial verified is adjusted from outside
  useEffect(() => {
    setIsVerified(isInitiallyVerified);
    if (isInitiallyVerified) {
      const savedKey = localStorage.getItem('custom_gemini_api_key');
      if (savedKey) {
        setApiKey(savedKey);
      }
    }
  }, [isInitiallyVerified]);

  const stats = [
    { label: '평균 가구당 연간 버려지는 식재료', value: '45만 원 상당', desc: '이 앱으로 낭비 제로(0%) 도전' },
    { label: 'AI 정규화 및 분석 속도', value: '1.2초', desc: '식재료 사진 및 텍스트 즉시 정밀 분류' },
    { label: '추천 레시피 대중성 우선 매칭', value: '100%', desc: '실험적 괴식을 철저히 배제한 보장된 맛' },
  ];

  const features = [
    {
      icon: <Apple className="text-brand-green w-6 h-6" />,
      title: '지능형 식재료 객체 정규화',
      desc: '문장 형태의 입력 또는 한 장의 냉장고 사진 스캔만으로 구성 성분, 상태, 분량을 완벽한 JSON 데이터 형태로 즉시 정규화 처리합니다.',
      badge: 'Input Module'
    },
    {
      icon: <TrendingDown className="text-brand-green w-6 h-6" />,
      title: '대중성 우선 레시피 매칭',
      desc: '구하기 힘든 식재료나 기괴한 레시피는 일절 필터링! 오직 냉장고에 존재하는 재료의 활용을 극대화하여 친숙하고 검증된 집밥만을 제안합니다.',
      badge: 'Recipe Logic'
    },
    {
      icon: <DollarSign className="text-brand-green w-6 h-6" />,
      title: '식비 절감 입증 다이어리',
      desc: '재료 소진을 통한 대체 외식 비용과 가계 지출 절감액을 실시간 통계로 투명하게 관리하며, 미적이고 영구적인 가계 경제 다이어리를 축적합니다.',
      badge: 'Diary Module'
    },
    {
      icon: <ShieldCheck className="text-brand-green w-6 h-6" />,
      title: '식위생 자율 점검 안전 엔진',
      desc: '냉동 재료 가열 가이드와 개봉 후 유통기한 임박 주의사항을 결합 발산하여 보관 꿀팁 및 식중독 예방 수칙을 직관적으로 처방해 드립니다.',
      badge: 'Safety Module'
    }
  ];

  const handleValidateAndUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || apiKey.trim() === '') {
      setValidationError('Gemini API 키를 입력해 주세요.');
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: apiKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '잘못된 API 키이거나 통신 장애가 발생했습니다.');
      }

      // Success
      localStorage.setItem('custom_gemini_api_key', apiKey.trim());
      setIsVerified(true);
      onApiKeyVerified(); // Notify App
    } catch (err: any) {
      setValidationError(err.message || '인증 실패: 키 유효성을 확인할 수 없습니다.');
      setIsVerified(false);
      localStorage.removeItem('custom_gemini_api_key');
    } finally {
      setIsValidating(false);
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem('custom_gemini_api_key');
    setApiKey('');
    setIsVerified(false);
    onApiKeyVerified(); // Sync with App parent
  };

  return (
    <div className="w-full flex flex-col gap-10 py-6 md:py-8 max-w-5xl mx-auto" id="landing-showcase-module">
      
      {/* 1. BRAND HERO HERO BANNER */}
      <div className="bg-brand-green text-brand-sand rounded-[32px] overflow-hidden shadow-[0_12px_45px_rgba(15,76,58,0.15)] relative border border-brand-green/20">
        
        {/* Decorative foliage abstract background shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-brand-medium/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-brand-medium/25 rounded-full blur-3xl pointer-events-none" />
        
        {/* Subtle lines resembling organic layout */}
        <div className="absolute inset-0 opacity-5 border-[16px] border-brand-sand m-4 rounded-[24px] pointer-events-none" />
        
        <div className="p-8 md:p-14 text-center flex flex-col items-center gap-6 relative z-10">
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-sand/15 backdrop-blur-md text-white border border-brand-sand/30 rounded-full text-xs font-bold tracking-widest uppercase"
          >
            <Leaf size={12} className="text-[#c5d3b1] animate-pulse" />
            스마트 냉장고 솔루션 • Refrigerator Dining Science
          </motion.div>

          <div className="flex flex-col gap-3">
            <span className="text-[#ebd0b9] text-xs font-bold tracking-[0.2em] block uppercase">
              가계 경제 수호 및 리사이클 푸드 라이프의 혁신
            </span>
            <motion.h1 
              className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              냉장고 속 숨은 자산, <br className="sm:hidden" />
              <span className="text-[#e2c19c] font-black italic mr-1">완벽하게</span> 털어드립니다.
            </motion.h1>
          </div>

          <motion.p 
            className="text-white text-xs md:text-sm max-w-xl font-medium leading-relaxed opacity-95"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            냉장고 사진 스캔부터 정규화, 대중성 100% 매칭 레시피, <br className="hidden md:inline" />
            그리고 영구 다이어리로 누적되는 식비 절감액을 직관적인 뷰 모듈로 즐겨보세요!
          </motion.p>

          {/* Dynamic API Key Authorization Widget / Play Controls Panel */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-lg mt-2 mx-auto"
          >
            {!isVerified ? (
              <div className="flex flex-col gap-4">
                
                {/* Status Indicator Bar */}
                <div className="flex items-center gap-2 justify-center text-brand-sand text-xs sm:text-sm font-bold bg-white/10 px-4 py-2.5 rounded-full w-fit mx-auto border border-white/15">
                  <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Check size={11} className="stroke-[3.5]" />
                  </div>
                  <span>무료로 시작하세요. Gemini API 키만 있으면 됩니다.</span>
                </div>

                {/* Input form according to mockup */}
                <form onSubmit={handleValidateAndUnlock} className="flex flex-col sm:flex-row gap-2.5 items-stretch bg-white/5 backdrop-blur-md p-2 rounded-3xl border border-white/20 shadow-inner">
                  <div className="relative flex-1 flex items-center bg-white rounded-2xl px-3 border border-transparent focus-within:ring-2 focus-within:ring-emerald-500/20 shadow-sm transition-all h-12">
                    <Lock className="text-slate-400 w-4.5 h-4.5 mr-2 shrink-0" />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      disabled={isValidating}
                      placeholder="Gemini API Key 입력"
                      className="bg-transparent text-slate-800 text-xs sm:text-sm font-mono w-full focus:outline-none placeholder-slate-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isValidating}
                    className="bg-[#143ebf] hover:bg-[#1034a1] active:scale-95 text-brand-sand text-xs sm:text-sm font-extrabold px-8 py-3 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shrink-0 h-11 sm:h-12 disabled:opacity-75 font-serif"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-white" />
                        인증 완료 중...
                      </>
                    ) : (
                      '시작하기'
                    )}
                  </button>
                </form>

                {/* Validation Error Message Box */}
                {validationError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#fcf1f1] border border-red-200 text-red-900 text-[11px] sm:text-xs text-center py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm"
                  >
                    <AlertCircle size={14} className="text-red-600 shrink-0" />
                    <span>{validationError}</span>
                  </motion.div>
                )}

                {/* Collapsible Guide Accordion */}
                <div className="bg-[#ffffff] text-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-250/85">
                  <button
                    onClick={() => setGuideOpen(!guideOpen)}
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100/80 transition-colors border-b border-slate-150 font-bold text-xs sm:text-sm text-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <HelpCircle size={16} className="text-[#143ebf]" />
                      <span>Gemini API Key 발급 가이드</span>
                    </div>
                    {guideOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                  </button>

                  <AnimatePresence initial={false}>
                    {guideOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 flex flex-col gap-3 text-xs text-slate-600 text-left bg-white font-sans border-t border-slate-50">
                          
                          <div className="flex gap-2.5 items-start bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                            <span className="w-5.5 h-5.5 rounded-full bg-slate-200/80 text-[#143ebf] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                            <div>
                              <strong className="text-slate-850 text-[12px]">Google AI Studio 접속</strong>
                              <p className="text-[11px] text-slate-500 mt-0.5">아래 링크를 클릭하여 Google AI Studio에 국격 접속하세요.</p>
                              <a 
                                href="https://aistudio.google.com/apikey" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[#143ebf] hover:underline flex items-center gap-1 mt-1 font-bold text-[11px]"
                              >
                                https://aistudio.google.com/apikey
                                <ExternalLink size={10} />
                              </a>
                            </div>
                          </div>

                          <div className="flex gap-2.5 items-start bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                            <span className="w-5.5 h-5.5 rounded-full bg-slate-200/80 text-[#143ebf] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                            <div>
                              <strong className="text-slate-850 text-[12px]">Google 계정으로 로그인</strong>
                              <p className="text-[11px] text-slate-500 mt-0.5">Gmail 계정으로 로그인하세요. 계정이 없으면 무료로 편하게 만들 수 있습니다.</p>
                            </div>
                          </div>

                          <div className="flex gap-2.5 items-start bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                            <span className="w-5.5 h-5.5 rounded-full bg-slate-200/80 text-[#143ebf] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                            <div>
                              <strong className="text-slate-850 text-[12px]">'API 키 만들기' 클릭</strong>
                              <p className="text-[11px] text-slate-500 mt-0.5">화면에서 'Create API Key' 또는 'API 키 만들기' 노랑색/파란색 단독 버튼을 클릭하세요.</p>
                            </div>
                          </div>

                          <div className="flex gap-2.5 items-start bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                            <span className="w-5.5 h-5.5 rounded-full bg-slate-200/80 text-[#143ebf] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">4</span>
                            <div>
                              <strong className="text-slate-850 text-[12px]">프로젝트 선택 후 생성</strong>
                              <p className="text-[11px] text-slate-500 mt-0.5">기본 프로젝트를 가볍게 클릭하고 'Create API key in existing project'를 선택하면 완료됩니다.</p>
                            </div>
                          </div>

                          <div className="flex gap-2.5 items-start bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                            <span className="w-5.5 h-5.5 rounded-full bg-slate-200/80 text-[#143ebf] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">5</span>
                            <div>
                              <strong className="text-slate-850 text-[12px]">API 키 복사</strong>
                              <p className="text-[11px] text-slate-500 mt-0.5">인스턴스가 즉시 생성된 AIza로 시작하는 키를 복사한 뒤, 위의 입력창에 붙여넣어 시작하세요!</p>
                            </div>
                          </div>

                          {/* Quick Link Button */}
                          <a
                            href="https://aistudio.google.com/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 py-3 w-full bg-[#f0f5ff] hover:bg-[#e1ecff] text-[#143ebf] text-xs font-extrabold text-center rounded-xl transition-all flex items-center justify-center gap-1.5 border border-[#bfd4ff]"
                          >
                            🔑 API 키 발급 페이지로 이동
                          </a>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            ) : (
              
              /* API Key is Verified - Show Launch Buttons */
              <div className="flex flex-col gap-5 items-center">
                
                {/* Micro Verified Banner */}
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold shadow-sm font-sans"
                >
                  <CheckCircle2 size={15} className="text-emerald-500 grow-0 animate-pulse" />
                  <span>Gemini API 키가 안전하게 보관 및 인증되었습니다!</span>
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="text-emerald-900 border border-emerald-300 hover:bg-[#ffff] font-extrabold cursor-pointer ml-3 text-[10px] bg-white/40 px-2.5 py-0.5 rounded-full transition-colors"
                  >
                    키 변경
                  </button>
                </motion.div>

                {/* Main Process Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2 w-full">
                  {savedProfileExists && (
                    <button
                      onClick={onContinue}
                      className="px-6 py-3.5 bg-transparent hover:bg-brand-sand/10 text-brand-sand text-xs font-bold rounded-full transition-all flex items-center gap-2 cursor-pointer border border-[#ebd0b9]/60 w-full sm:w-auto justify-center"
                    >
                      이전 세션 이어서 파먹기
                      <ChevronRight size={14} className="text-[#ebd0b9]" />
                    </button>
                  )}

                  <button
                    onClick={onStart}
                    className="px-8 py-3.5 bg-[#e2c19c] hover:bg-[#ebd5c1] active:translate-y-0 text-brand-dark text-xs font-extrabold rounded-full shadow-lg transition-all flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5 w-full sm:w-auto justify-center font-serif uppercase tracking-wider"
                  >
                    신규 냉장고 파먹기 시작하기
                    <ChevronRight size={14} />
                  </button>
                </div>

              </div>
            )}
          </motion.div>

        </div>
      </div>

      {/* 2. REALTIME STATS HIGHLIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            className="bg-[#ffffff] border border-[#d5cebd] rounded-2xl p-5 shadow-[0_4px_12px_rgba(15,76,58,0.015)] flex flex-col gap-1.5 text-center hover:border-brand-green transition-all duration-300"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + idx * 0.1 }}
          >
            <span className="text-xs text-[#9d6f43] font-extrabold tracking-wider block uppercase">{stat.label}</span>
            <span className="text-2xl md:text-3xl font-extrabold text-brand-green my-1">{stat.value}</span>
            <span className="text-xs text-slate-700 font-bold">{stat.desc}</span>
          </motion.div>
        ))}
      </div>

      {/* 3. FEATURING MODULES */}
      <div className="flex flex-col gap-5 mt-2">
        <div className="text-center md:text-left border-b border-[#ebd0b9]/40 pb-4">
          <h3 className="text-lg md:text-xl font-extrabold text-[#0f4c3a] flex items-center gap-2 justify-center md:justify-start">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-green animate-pulse" />
            🚀 냉장고파먹기의 4대 고응집 독립 모듈
          </h3>
          <p className="text-xs text-slate-700 mt-1 font-bold">
            소프트웨어 아키텍처 v2.1 설계가 보장하는 높은 안정성 및 데이터 유기성
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((feat, idx) => (
            <motion.div
              key={idx}
              className="bg-white border border-[#d5cebd] rounded-2xl p-5 shadow-[0_4px_12px_rgba(15,76,58,0.02)] flex gap-4 hover:shadow-md transition-all duration-300 group hover:border-brand-green"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
            >
              <div className="p-3 bg-[#f5f2eb] rounded-xl flex-shrink-0 group-hover:bg-[#ebf4ee] transition-colors h-12 w-12 flex items-center justify-center border border-[#d5cebd]/40">
                {feat.icon}
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-brand-dark text-sm md:text-base">{feat.title}</h4>
                  <span className="text-[10px] text-brand-green bg-[#ebf3ee] border border-brand-green/20 px-2.5 py-0.5 rounded-full font-extrabold tracking-wider">
                    {feat.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-bold">
                  {feat.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 4. BOTTOM PERSISTENT HIGHLIGHT SLIDE */}
      <div className="bg-[#f5f2eb] border border-[#d5cebd] rounded-[24px] p-6 text-center flex flex-col items-center gap-4 shadow-sm relative overflow-hidden">
        
        {/* Subtle decorative circles */}
        <div className="absolute top-10 right-10 w-20 h-20 border border-brand-green/5 rounded-full" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 border-2 border-brand-green/5 rounded-full" />

        <div className="w-8 h-8 rounded-full bg-[#ebf3ee] flex items-center justify-center text-brand-green mb-1 border border-brand-green/10">
          <BookOpen size={16} />
        </div>
        
        <h3 className="text-sm md:text-lg font-extrabold text-brand-green leading-relaxed">
          "냉장고를 비울 때 통장이 가장 빠르게 채워집니다."
        </h3>
        
        <p className="text-xs md:text-sm text-slate-800 max-w-xl leading-relaxed font-bold">
          오늘 먹을 한 끼 식사를 위생적이고 기분 좋게 요리하면서, 한달에 불필요하게 낭비되는 수십만 원 상당의 배달 음식 및 가계 유효 소비를 현명하게 단축해 보세요.
        </p>

        {isVerified ? (
          <button
            type="button"
            onClick={onStart}
            className="mt-2 px-6 py-3 bg-brand-green hover:bg-[#0c3e2f] text-brand-sand text-xs font-extrabold rounded-full transition-all shadow-md cursor-pointer uppercase tracking-wider border border-brand-green"
          >
            초기 인터페이스로 이동하기
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setValidationError('먼저 상단의 Gemini API 키를 등록하고 인증해 주세요!');
            }}
            className="mt-2 px-6 py-3 bg-slate-400 hover:bg-slate-500 text-white text-xs font-extrabold rounded-full transition-all shadow-md cursor-pointer uppercase tracking-wider border border-transparent"
          >
            먼저 API 키 등록하기
          </button>
        )}
      </div>

    </div>
  );
}
