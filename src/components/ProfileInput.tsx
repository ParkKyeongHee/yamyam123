import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { ArrowRight, Sparkles, User, Target, Users } from 'lucide-react';

interface ProfileInputProps {
  onComplete: (profile: UserProfile) => void;
}

export default function ProfileInput({ onComplete }: ProfileInputProps) {
  const [subStep, setSubStep] = useState<number>(1);
  const [name, setName] = useState<string>('');
  const [purpose, setPurpose] = useState<'saving' | 'diet' | 'convenience' | 'healthy' | 'other'>('saving');
  const [recipient, setRecipient] = useState<'solo' | 'couple' | 'family' | 'kids' | 'elderly' | 'other'>('solo');

  const purposeOptions = [
    { value: 'saving', label: '가계 식비 절감', desc: '불필요한 지출을 0원으로 완벽 단축' },
    { value: 'diet', label: '다이어트 및 칼로리 식단', desc: '남은 가벼운 재료 중심 건강 조리' },
    { value: 'healthy', label: '야채 소진 & 위생 강화', desc: '냉장고 오래된 야채의 안전한 섭취' },
    { value: 'convenience', label: '조리 시간 초단축 한끼', desc: '가장 편하고 신속한 매칭 지원' },
    { value: 'other', label: '단순 보관 식재료 전면 소진', desc: '유통기한 임박 긴급 구출' },
  ] as const;

  const recipientOptions = [
    { value: 'solo', label: '1인 가구 (나 혼자)', desc: '소용량 조리에 특화된 식단' },
    { value: 'couple', label: '2인 가족 (동거/부부)', desc: '균형 잡힌 사이드반찬 구성' },
    { value: 'family', label: '일반 다인 가구', desc: '남녀노소 호불호 없는 클래식 요리' },
    { value: 'kids', label: '자녀 동반 밥상', desc: '자극적이지 않고 영양소가 풍부한 요리' },
    { value: 'elderly', label: '부모님 / 어르신 식사', desc: '소화가 부드럽고 든든한 건강식' },
    { value: 'other', label: '손님 접대 / 모임', desc: '냉장고 털이로도 근사한 플레이팅' },
  ] as const;

  const handleNext = () => {
    if (subStep === 1 && !name.trim()) return;
    if (subStep < 3) {
      setSubStep(prev => prev + 1);
    } else {
      const selectedPurpose = purposeOptions.find(o => o.value === purpose);
      const selectedRecipient = recipientOptions.find(o => o.value === recipient);
      
      onComplete({
        name: name.trim(),
        purpose,
        purposeText: selectedPurpose ? selectedPurpose.label : '기타',
        recipient,
        recipientText: selectedRecipient ? selectedRecipient.label : '기타',
      });
    }
  };

  const handleBack = () => {
    if (subStep > 1) setSubStep(prev => prev - 1);
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white border border-[#e1ded7] shadow-[0_8px_30px_rgba(15,76,58,0.03)] rounded-[24px] p-6 md:p-8" id="profile-selection-card">
      
      {/* Delicate Gold Progress Line */}
      <div className="flex items-center justify-between mb-8 overflow-hidden rounded-full bg-[#f4f2eb] h-1.5 w-full border border-[#e1ded7]/30">
        <div 
          className="bg-brand-green h-1.5 transition-all duration-500 rounded-full"
          style={{ width: `${(subStep / 3) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        {subStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6"
            id="profile-step-1"
          >
            <div className="flex items-center gap-3">
              <span className="p-3 bg-[#ebf3ee] text-brand-green rounded-2xl border border-brand-lime/20">
                <User size={22} />
              </span>
              <div>
                <span className="text-xs font-extrabold text-[#9d6f43] tracking-wider block">Step 01 / 03</span>
                <h3 className="text-xl md:text-2xl font-bold text-brand-green tracking-tight mt-0.5">
                  이름을 작성해주세요.
                </h3>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="user-name-input-field" className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                다이어리에 등재될 식생활 멘티명
              </label>
              <input
                id="user-name-input-field"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 김지수"
                className="w-full rounded-xl border border-[#d5cebd] bg-brand-sand/30 px-4 py-3.5 focus:border-[#b38a5f] focus:outline-none focus:ring-4 focus:ring-brand-gold/5 text-brand-dark font-bold text-lg placeholder-slate-500 transition-all"
                maxLength={8}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name.trim()) handleNext();
                }}
                autoFocus
              />
            </div>
            
            <p className="text-xs text-slate-700 leading-relaxed font-bold">
              💡 아키텍처 v2.1 식비 계산 모듈과 안전 가이드 출력에 사용자가 인지할 맞춤 네이밍이 정교하게 이식됩니다.
            </p>

            <button
              onClick={handleNext}
              disabled={!name.trim()}
              id="btn-next-step1"
              className="flex items-center justify-center gap-2 w-full py-3.5 mt-2 rounded-xl bg-brand-green hover:bg-brand-green-hover disabled:bg-slate-100 disabled:text-slate-400 text-brand-sand font-bold transition-all shadow-md cursor-pointer text-xs font-serif tracking-wider"
            >
              다음 구성 단계로
              <ArrowRight size={14} />
            </button>
          </motion.div>
        )}

        {subStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-5"
            id="profile-step-2"
          >
            <div className="flex items-center gap-3">
              <span className="p-3 bg-[#ebf3ee] text-brand-green rounded-2xl border border-brand-lime/20">
                <Target size={22} />
              </span>
              <div>
                <span className="text-xs font-extrabold text-[#9d6f43] tracking-wider block">Step 02 / 03</span>
                <h3 className="text-xl md:text-2xl font-bold text-brand-green tracking-tight mt-0.5">
                  핵심 파먹기 목적을 결정하십시오.
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {purposeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPurpose(opt.value)}
                  className={`w-full flex flex-col p-4 rounded-xl text-left border transition-all cursor-pointer ${
                    purpose === opt.value
                      ? 'border-brand-green bg-[#ebf3ee] shadow-sm'
                      : 'border-[#ebd0b9]/60 hover:border-brand-green bg-[#fdfdfc]'
                  }`}
                >
                  <span className="font-extrabold text-brand-dark text-sm md:text-base">{opt.label}</span>
                  <span className="text-xs text-slate-700 mt-1 font-bold">{opt.desc}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleBack}
                className="w-1/3 py-3 rounded-xl border border-[#d5cebd] text-slate-700 hover:bg-slate-50 font-extrabold transition-all cursor-pointer text-xs"
              >
                이전
              </button>
              <button
                onClick={handleNext}
                className="w-2/3 flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-sand font-bold transition-all shadow-md cursor-pointer text-xs"
              >
                다음 구성 단계로
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {subStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-5"
            id="profile-step-3"
          >
            <div className="flex items-center gap-3">
              <span className="p-3 bg-[#ebf3ee] text-brand-green rounded-2xl border border-brand-lime/20">
                <Users size={22} />
              </span>
              <div>
                <span className="text-xs font-extrabold text-[#9d6f43] tracking-wider block">Step 03 / 03</span>
                <h3 className="text-xl md:text-2xl font-bold text-brand-green tracking-tight mt-0.5">
                  식생활 대상자를 골라주십시오.
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {recipientOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRecipient(opt.value)}
                  className={`w-full flex flex-col p-4 rounded-xl text-left border transition-all cursor-pointer ${
                    recipient === opt.value
                      ? 'border-brand-green bg-[#ebf3ee] shadow-sm'
                      : 'border-[#ebd0b9]/60 hover:border-brand-green bg-[#fdfdfc]'
                  }`}
                >
                  <span className="font-extrabold text-brand-dark text-sm md:text-base">{opt.label}</span>
                  <span className="text-xs text-slate-700 mt-1 font-bold">{opt.desc}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleBack}
                className="w-1/3 py-3 rounded-xl border border-[#d5cebd] text-slate-700 hover:bg-slate-50 font-extrabold transition-all cursor-pointer text-xs"
              >
                이전
              </button>
              <button
                onClick={handleNext}
                id="btn-complete-profile"
                className="w-2/3 flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-green hover:bg-[#0c3e2f] text-brand-sand font-bold transition-all shadow-md cursor-pointer text-xs tracking-wider"
              >
                초기 구성 로딩완료
                <Sparkles size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
