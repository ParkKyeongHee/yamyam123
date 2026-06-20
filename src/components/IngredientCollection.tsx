import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Ingredient, UserProfile } from '../types';
import { Camera, FileText, Plus, Trash, Sparkles, ArrowRight, ArrowLeft, Loader2, ListChecks } from 'lucide-react';

interface IngredientCollectionProps {
  profile: UserProfile;
  initialIngredients: Ingredient[];
  onComplete: (ingredients: Ingredient[]) => void;
  onBack: () => void;
}

export default function IngredientCollection({ profile, initialIngredients, onComplete, onBack }: IngredientCollectionProps) {
  const [inputText, setInputText] = useState<string>('');
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  // Custom addition form
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientAmount, setNewIngredientAmount] = useState('적당량');
  const [newIngredientCondition, setNewIngredientCondition] = useState('보통');
  const [newIngredientCategory, setNewIngredientCategory] = useState('채소');

  const categories = ['채소', '고기', '해산물', '양념/재료', '유제품', '기타'];
  const conditions = ['신선함', '보통', '유통기한 임박', '냉동'];

  // Handle image conversion to base64
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setParseError('이미지 파일포맷만 지원합니다.');
      return;
    }
    
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleTriggerFile = () => {
    fileInputRef.current?.click();
  };

  const resetImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Call API to analyze ingredients
  const handleAnalyze = async (autoMatch: boolean = false) => {
    if (!inputText.trim() && !imagePreview) {
      setParseError('분석할 텍스트를 적거나 식재료 이미지를 올려주세요.');
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      let base64Image = '';
      let mimeType = '';
      if (imagePreview) {
        const parts = imagePreview.split(',');
        base64Image = parts[1];
        const match = parts[0].match(/:(.*?);/);
        mimeType = match ? match[1] : 'image/jpeg';
      }

      const userKey = localStorage.getItem('custom_gemini_api_key');
      const fetchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (userKey) {
        fetchHeaders['x-gemini-api-key'] = userKey;
      }

      const response = await fetch('/api/analyze-ingredients', {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify({
          text: inputText,
          image: base64Image || undefined,
          mimeType: mimeType || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '식재료 분석에 실패하였습니다.');
      }

      const data = await response.json();

      if (data.ingredients && Array.isArray(data.ingredients)) {
        // Merge with existing ingredients, avoiding duplicates
        const newItems: Ingredient[] = data.ingredients;
        setIngredients(prev => {
          const merged = [...prev];
          newItems.forEach(item => {
            const exists = merged.some(m => m.name.toLowerCase() === item.name.toLowerCase());
            if (!exists) {
              merged.push(item);
            }
          });
          return merged;
        });

        // Reset inputs
        setInputText('');
        resetImage();

        if (autoMatch) {
          const combined = [...ingredients];
          newItems.forEach(item => {
            const exists = combined.some(m => m.name.toLowerCase() === item.name.toLowerCase());
            if (!exists) {
              combined.push(item);
            }
          });
          onComplete(combined);
        }
      } else {
        throw new Error('의미 있는 식재료 데이터를 파싱하지 못했습니다. 다시 시도해 주세요.');
      }
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || '분석 중 에러가 발생했습니다.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddIngredient = () => {
    if (!newIngredientName.trim()) return;
    const newItem: Ingredient = {
      name: newIngredientName.trim(),
      amount: newIngredientAmount,
      condition: newIngredientCondition,
      category: newIngredientCategory,
      isExisting: true,
    };
    setIngredients(prev => [...prev, newItem]);
    setNewIngredientName('');
    setNewIngredientAmount('적당량');
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const toggleExisting = (index: number) => {
    setIngredients(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, isExisting: !item.isExisting };
      }
      return item;
    }));
  };

  const handleNextStep = () => {
    if (ingredients.length === 0) {
      setParseError('최소 하나의 식재료가 등록되어야 레시피 추천 엔진을 돌릴 수 있습니다.');
      return;
    }
    onComplete(ingredients);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case '채소': return 'bg-[#ebf3ee] text-brand-green border-brand-green/20';
      case '고기': return 'bg-rose-50 text-rose-700 border-rose-200/50';
      case '해산물': return 'bg-sky-50 text-sky-700 border-sky-200/50';
      case '유제품': return 'bg-purple-50 text-purple-700 border-purple-200/50';
      case '양념/재료': return 'bg-amber-50 text-amber-700 border-amber-200/50';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="w-full flex flex-col gap-6" id="ingredients-gathering-module">
      
      {/* 1. UPPER INFORMATION BANNER (Beige and rich green border) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#e1ded7] shadow-sm rounded-[20px] p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#f5f2eb] text-brand-green rounded-xl font-bold text-center flex flex-col justify-center border border-[#e1ded7]/65 min-w-[70px]">
            <span className="text-[9px] leading-none block uppercase text-brand-gold font-serif font-black tracking-wider">CHEF</span>
            <span className="text-sm font-black mt-1 font-serif">{profile.name}</span>
          </div>
          <div>
            <h4 className="font-bold text-brand-green font-serif text-base">지능형 매칭 프로필 활성화 완료</h4>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              식습관 목적: <span className="text-brand-green font-bold bg-[#ebf3ee] px-2 py-0.5 rounded-full">{profile.purposeText}</span> • 
              소식 집단 대상: <span className="text-brand-green font-bold bg-[#ebf3ee] px-2 py-0.5 rounded-full">{profile.recipientText}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-brand-green hover:border-brand-green font-bold px-4 py-2.5 border border-[#e1ded7] hover:bg-[#fcfbf9] rounded-xl bg-white transition-all cursor-pointer shadow-sm font-serif"
        >
          <ArrowLeft size={14} /> 매칭 옵션 수정
        </button>
      </div>

      {/* 2. DUAL LAYOUT: GRID CHANNELS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* LEFT COLUMN: Data capture & Manual insertion */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <div className="bg-white border border-[#e1ded7] p-5 md:p-6 rounded-[24px] shadow-sm flex flex-col gap-5">
            
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-brand-green font-serif flex items-center gap-2 text-sm md:text-base">
                <FileText size={18} className="text-brand-gold" /> 1단계: 자동 데이터 스캔
              </h4>
              <span className="text-[9px] font-serif text-brand-gold uppercase font-bold tracking-widest">Data Capture</span>
            </div>

            {/* Text Input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ingredient-text-input-field" className="block text-xs font-extrabold text-[#111] uppercase tracking-wider">
                실제 보유 야채/고기/기타 보유 상태 적기
              </label>
              <textarea
                id="ingredient-text-input-field"
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="예: 실시간으로 다듬은 두부 1모, 상단 야채칸에 시들고 있는 애호박 반개, 유통기한이 삼일 지난 어묵 두 장..."
                className="w-full text-xs sm:text-sm rounded-xl border border-[#d5cebd] bg-[#faf8f5]/55 px-3.5 py-3 focus:border-brand-green focus:outline-none focus:ring-4 focus:ring-brand-green/5 text-brand-dark placeholder-slate-500 leading-relaxed font-bold transition-all"
              />
            </div>

            {/* Image Collection Input */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-extrabold text-[#111] uppercase tracking-wider block">
                냉장고 사진 또는 신선 재료 촬영물 업로드 (위생체크 연동)
              </span>

              {imagePreview ? (
                <div className="relative rounded-2xl border border-[#e1ded7] overflow-hidden group aspect-video shadow-inner bg-[#faf8f5]">
                  <img src={imagePreview} alt="Fridge scan preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-brand-green/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={resetImage}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer border border-red-500"
                    >
                      사진 새로 올리기
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  ref={dragRef}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={handleTriggerFile}
                  className="border-2 border-dashed border-[#e1ded7] hover:border-brand-green rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-[#faf8f5] hover:bg-[#ebf4ee]/30 cursor-pointer transition-all gap-1.5 group"
                >
                  <Camera size={26} className="text-[#b38a5f] group-hover:text-brand-green transition-colors" />
                  <span className="text-xs font-extrabold text-brand-green">지능형 이미지 즉석 분석기</span>
                  <span className="text-[11px] text-[#9d6f43] font-extrabold">드래그 앤 드롭 또는 클릭하여 이미지 파일 첨부</span>
                  <input
                    ref={fileInputRef}
                    id="fridge-pic-input-element"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {parseError && (
              <div className="text-xs text-red-600 bg-red-50/50 border border-red-200 p-3.5 rounded-xl font-medium">
                ⚠️ {parseError}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => handleAnalyze(true)}
                disabled={isParsing || (!inputText.trim() && !imagePreview)}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-brand-green hover:bg-[#0c3e2f] disabled:bg-slate-100 disabled:text-slate-400 text-brand-sand transition-all font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md font-serif border border-brand-green"
              >
                {isParsing ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-brand-lime" />
                    Gemini가 실시간 스캔 & 레시피 분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="text-[#e2c19c] animate-pulse" />
                    🔍 스마트 분석 & 즉시 레시피 매칭
                  </>
                )}
              </button>

              <button
                onClick={() => handleAnalyze(false)}
                disabled={isParsing || (!inputText.trim() && !imagePreview)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#faf2eb] hover:bg-[#ebdcc8] border border-[#e1ded7] disabled:bg-[#fafafa] disabled:text-slate-300 disabled:border-slate-150 transition-all font-bold text-[11px] cursor-pointer text-brand-dark font-serif"
              >
                {isParsing ? '스캔 중...' : '📝 식재료 목록에만 먼저 추가하기'}
              </button>
            </div>
          </div>

          {/* QUICK MANUAL ADD FORM */}
          <div className="bg-white border border-[#ebd0b9]/60 p-5 rounded-[24px] shadow-sm flex flex-col gap-3">
            <h4 className="font-extrabold text-brand-green flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Plus size={15} className="text-brand-gold" /> 직접 재료 수동 추가
            </h4>
            
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <label htmlFor="manual-name-field" className="text-xs text-slate-700 font-extrabold">식재료명</label>
                <input
                  id="manual-name-field"
                  type="text"
                  placeholder="예: 스팸, 달걀, 마늘"
                  value={newIngredientName}
                  onChange={(e) => setNewIngredientName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-[#ebd0b9]/70 px-2.5 py-2 focus:border-brand-green focus:outline-none font-bold text-brand-dark bg-[#faf8f5]/20"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="manual-amount-field" className="text-xs text-slate-700 font-extrabold">사용량/분량</label>
                <input
                  id="manual-amount-field"
                  type="text"
                  placeholder="예: 1캔, 2알, 5쪽"
                  value={newIngredientAmount}
                  onChange={(e) => setNewIngredientAmount(e.target.value)}
                  className="w-full text-xs rounded-lg border border-[#ebd0b9]/70 px-2.5 py-2 focus:border-brand-green focus:outline-none font-bold text-brand-dark bg-[#faf8f5]/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <label htmlFor="manual-category-field" className="text-xs text-slate-700 font-extrabold">대분류 카테고리</label>
                <select
                  id="manual-category-field"
                  value={newIngredientCategory}
                  onChange={(e) => setNewIngredientCategory(e.target.value)}
                  className="w-full text-xs rounded-lg border border-[#ebd0b9]/70 px-2 py-1.5 focus:border-brand-green focus:outline-none bg-white font-extrabold text-brand-dark"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="manual-condition-field" className="text-xs text-slate-700 font-extrabold">식위생/보관상태</label>
                <select
                  id="manual-condition-field"
                  value={newIngredientCondition}
                  onChange={(e) => setNewIngredientCondition(e.target.value)}
                  className="w-full text-xs rounded-lg border border-[#ebd0b9]/70 px-2 py-1.5 focus:border-brand-green focus:outline-none bg-white font-extrabold text-brand-dark"
                >
                  {conditions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={handleAddIngredient}
              disabled={!newIngredientName.trim()}
              className="py-2.5 bg-[#fdfdfd] hover:bg-[#f5f2eb] border border-[#e1ded7] disabled:opacity-40 text-brand-green text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer font-serif"
            >
              <Plus size={13} /> 목록에 즉시 추가하기
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: CHECKLIST INTERFACES */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white border border-[#e1ded7] p-5 md:p-6 rounded-[24px] shadow-sm flex flex-col h-full min-h-[460px]">
            
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#faf2eb]">
              <div>
                <h4 className="font-extrabold text-brand-dark flex items-center gap-1.5 text-base">
                  <ListChecks size={18} className="text-brand-green" /> 매칭 대기 중인 레시피 성분 객체
                </h4>
                <p className="text-xs text-slate-700 mt-1 font-bold">보유 여부 체크박스를 조절하면 실시간 반영됩니다.</p>
              </div>
              {ingredients.length > 0 && (
                <button
                  onClick={() => setIngredients([])}
                  className="text-xs text-red-600 hover:text-red-700 font-bold cursor-pointer hover:bg-red-50/50 px-2 py-1 rounded"
                >
                  전체 지우기
                </button>
              )}
            </div>

            {ingredients.length === 0 ? (
              <div className="flex-1 border-2 border-dashed border-[#e1ded7] rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-[#faf8f5]">
                <div className="w-12 h-12 bg-[#faf2eb] border border-[#e1ded7] rounded-all rounded-full flex items-center justify-center text-brand-gold font-serif font-bold text-sm mb-3">i</div>
                <span className="text-xs md:text-sm font-extrabold text-brand-green">추출된 식재료 객체가 존재하지 않습니다.</span>
                <span className="text-xs text-slate-700 font-bold mt-1.5 max-w-[280px] leading-relaxed">
                  좌측 입력창에 텍스트를 구성하여 넣거나, 스마트 냉장고 스캔 기능을 통해 재료들의 세부 단위를 구축해 주세요.
                </span>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-2.5 max-h-[400px] overflow-y-auto pr-1">
                {ingredients.map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className={`flex items-center justify-between p-3 border border-[#e1ded7] rounded-xl transition-all ${
                      item.isExisting ? 'bg-white opacity-100 border-brand-green/30 hover:border-brand-green/80 shadow-[0_2px_8px_rgba(15,76,58,0.01)]' : 'opacity-40 bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.isExisting}
                        onChange={() => toggleExisting(index)}
                        className="rounded border-[#e1ded7] text-brand-green focus:ring-brand-green h-4.5 w-4.5 cursor-pointer accent-brand-green"
                        title="사용재료 포함 여부"
                      />
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold text-brand-dark ${!item.isExisting ? 'line-through text-slate-400' : ''}`}>
                          {item.name}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold border ${getCategoryColor(item.category)}`}>
                            {item.category}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold font-sans">
                            수량: {item.amount}
                          </span>
                          {item.estimatedCalories && (
                            <span className="text-[9px] text-[#b3753b] font-black font-sans bg-[#fdf5ed] px-1.5 py-0.5 rounded-md border border-[#f0dfcc] ml-1 flex items-center gap-0.5">
                              🔥 {item.estimatedCalories}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                        item.condition === '유통기한 임박' 
                        ? 'bg-amber-50 text-amber-800 border-amber-200' 
                        : item.condition === '신선함' 
                        ? 'bg-emerald-50 text-brand-green border-brand-lime'
                        : item.condition === '냉동'
                        ? 'bg-sky-50 text-sky-800 border-sky-200'
                        : 'bg-[#faf2eb] text-[#b38a5f] border-[#e1ded7]'
                      }`}>
                        {item.condition}
                      </span>
                      <button
                        onClick={() => handleRemoveIngredient(index)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                        title="성분 항목 삭제"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-[#faf2eb]">
              <button
                onClick={handleNextStep}
                disabled={ingredients.length === 0}
                className="w-full flex items-center justify-center gap-2 py-4 bg-brand-green hover:bg-[#0c3e2f] disabled:bg-slate-100 disabled:text-slate-400 text-brand-sand font-bold rounded-xl shadow-md transition-all cursor-pointer text-xs font-serif tracking-wider border border-brand-green"
              >
                지능형 레시피 매칭 엔진 시작
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
