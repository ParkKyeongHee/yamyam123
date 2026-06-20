import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload sizes to support base64 image uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Initialize Gemini Client Lazily to prevent crash if key is missing on deployment
let defaultAi: GoogleGenAI | null = null;

function getDefaultAi() {
  if (!defaultAi) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is missing.");
    }
    defaultAi = new GoogleGenAI({
      apiKey: apiKey || "dummy-key-for-start-up",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return defaultAi;
}

// Helper to retrieve the current Gemini client, preferring user key in headers for validation/use
function getGeminiClient(req: express.Request) {
  const customKey = req.headers["x-gemini-api-key"] as string | undefined;
  if (customKey && customKey.trim().length > 0) {
    return new GoogleGenAI({
      apiKey: customKey.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return getDefaultAi();
}

// A robust helper function to generate response with fallbacks to avoid 503 UNAVAILABLE "high demand" errors
async function generateContentWithFallback(
  aiClient: GoogleGenAI,
  params: {
    contents: any[];
    responseSchema?: any;
    promptTextForFallback?: string;
  }
) {
  const models = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"];
  let lastError: any = null;

  for (const modelName of models) {
    try {
      console.log(`[Gemini] Attempting generation with model: ${modelName}`);
      const config: any = {
        responseMimeType: "application/json",
      };
      if (params.responseSchema) {
        config.responseSchema = params.responseSchema;
      }

      const response = await aiClient.models.generateContent({
        model: modelName,
        contents: params.contents,
        config: config,
      });

      if (response && response.text) {
        console.log(`[Gemini] Model ${modelName} succeeded!`);
        return response.text;
      }
    } catch (err: any) {
      console.warn(`[Gemini] Model ${modelName} returned error:`, err.message || err);
      lastError = err;
    }
  }

  // Final fallback: flexible json run on the most unresponsive-proof model (gemini-3.1-flash-lite)
  try {
    console.warn(`[Gemini] All structured schema calls failed. Attempting a flexible fallback call on gemini-3.1-flash-lite...`);
    let promptText = "";
    if (params.promptTextForFallback) {
      promptText = params.promptTextForFallback;
    } else {
      promptText = params.contents.map(c => {
        if (typeof c === "string") return c;
        if (c.text) return c.text;
        if (c.parts && Array.isArray(c.parts)) {
          return c.parts.map((p: any) => p.text || "").join("\n");
        }
        return "";
      }).join("\n");
    }

    const response = await aiClient.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: promptText + "\n\n반드시 결과를 아래 설명한 양식과 일치하는 JSON 포맷으로 주최자 요구사항을 만족하게 돌려주세요. 백틱이나 부가설명 없이 순수 JSON만 제공하십시오.",
      config: {
        responseMimeType: "application/json",
      }
    });

    if (response && response.text) {
      return response.text;
    }
  } catch (err: any) {
    console.error(`[Gemini] All fallback calls failed completely:`, err.message || err);
  }

  throw lastError || new Error("식재료 레시피 생성 엔진이 현재 과부하 상태(503)입니다. 잠시 후 다시 조회를 시도해 주세요.");
}

// ==========================================
// [API Key 유효성 검증 API]
// ==========================================
app.post("/api/validate-key", async (req, res) => {
  try {
    const { key } = req.body;
    if (!key || typeof key !== "string" || key.trim() === "") {
      return res.status(400).json({ error: "API 키를 정확히 입력해주세요." });
    }

    const testAi = new GoogleGenAI({
      apiKey: key.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Make a simple low-latency test generation to check if key is valid
    const response = await testAi.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "API Key Validation. Reply exactly with 'OK'.",
      config: {
        maxOutputTokens: 10,
      },
    });

    if (response) {
      return res.json({ success: true, message: "성공적으로 승인되었습니다." });
    } else {
      throw new Error("올바른 응답을 수신하지 못했습니다.");
    }
  } catch (error: any) {
    console.warn("Validation failed for key:", error.message || error);
    // Be helpful and specific about why it failed. Usually wrong key or block
    let detailedError = "유효하지 않은 API 키입니다. Google AI Studio에서 올바른 키를 생성했는지 다시 한번 확인해 주세요.";
    if (error.message && error.message.includes("API_KEY_INVALID")) {
      detailedError = "입력하신 API 키 형식이 올바르지 않거나 활성화되지 않은 키입니다. (API_KEY_INVALID)";
    }
    return res.status(400).json({
      success: false,
      error: detailedError,
    });
  }
});

// ==========================================
// [입력 모듈] API: 텍스트 및 사진 분석 식재료 목록 추출
// ==========================================
app.post("/api/analyze-ingredients", async (req, res) => {
  try {
    const { text, image, mimeType } = req.body;

    if (!text && !image) {
      return res.status(400).json({ error: "식재료 텍스트 입력 또는 이미지가 필요합니다." });
    }

    const promptText = `
    수석 소프트웨어 아키텍트이자 공인 영양사로서 스마트 냉장고의 식재료를 정밀 분석합니다.
    ${text ? `사용자가 입력한 텍스트: "${text}"` : ""}
    제시된 냉장고 사진 또는 텍스트 정보를 기반으로 식재료 목록을 정확히 추출, 분석 및 정규화해주세요.
    
    반드시 다음 규칙을 지키세요:
    1. 현실적으로 사용 가능한 식재료 리스트를 파싱합니다.
    2. 각 식재료의 수량(amount), 상태(condition: 신선함, 유통기한 임박, 냉동, 보통 중 하나), 카테고리(category: 채소, 고기, 해산물, 양념/재료, 유제품, 기타 중 하나)를 정확히 추출합니다.
    3. 음식별 영양 칼로리 분석을 위해, 각 식재료와 기재된 분량에 최적화된 예상 칼로리값(estimatedCalories: 예: '120 kcal', '60 kcal', '약간(5 kcal)')을 엄밀히 영양학적으로 추정하여 반환합니다.
    4. isExisting 속성은 항상 true로 설정합니다.
    
    출력은 반드시 { ingredients: Array<{ name: string, amount: string, condition: string, category: string, isExisting: boolean, estimatedCalories: string }> } 포맷인 JSON 형태여야 합니다.
    `;

    const parts: any[] = [];
    if (image) {
      parts.push({
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: image,
        },
      });
    }
    parts.push({
      text: promptText,
    });

    const contents = [{ parts }];

    const activeAi = getGeminiClient(req);

    const responseText = await generateContentWithFallback(activeAi, {
      contents: contents,
      responseSchema: {
        type: Type.OBJECT,
        required: ["ingredients"],
        properties: {
          ingredients: {
            type: Type.ARRAY,
            description: "추출된 식재료 목록",
            items: {
              type: Type.OBJECT,
              required: ["name", "amount", "condition", "category", "isExisting", "estimatedCalories"],
              properties: {
                name: { type: Type.STRING, description: "식재료 이름 (예: 두부, 계란, 삼겹살)" },
                amount: { type: Type.STRING, description: "계량 또는 수량 (예: 1모, 3알, 200g, 약간)" },
                condition: { type: Type.STRING, description: "상태 (신선함, 유통기한 임박, 보통, 냉동 중 선택)" },
                category: { type: Type.STRING, description: "대분류 카테고리 (채소, 고기, 해산물, 양념/재료, 유제품, 기타 중 선택)" },
                isExisting: { type: Type.BOOLEAN, description: "이미 냉장고에 존재하는지 여부 (true)" },
                estimatedCalories: { type: Type.STRING, description: "해당 분량에 어울리는 영양학적 예상 칼로리 소모량 또는 함유량 (예: 80 kcal, 140 kcal)" },
              },
            },
          },
        },
      },
      promptTextForFallback: promptText
    });

    let cleanedText = responseText.trim();
    if (cleanedText.includes("```json")) {
      cleanedText = cleanedText.split("```json")[1].split("```")[0];
    } else if (cleanedText.includes("```")) {
      cleanedText = cleanedText.split("```")[1].split("```")[0];
    }
    cleanedText = cleanedText.trim();

    const parsedData = JSON.parse(cleanedText || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Analyze Ingredients Error:", error);
    res.status(500).json({ error: "식재료를 분석하는 도중 오류가 발생했습니다: " + error.message });
  }
});

// ==========================================
// [매칭 엔진] API: 최적의 냉장고 파먹기 레시피 추천 및 칼로리 개별 분석
// ==========================================
app.post("/api/generate-recipes", async (req, res) => {
  try {
    const { profile, availableIngredients, ingredients } = req.body;

    let resolvedAvailableIngredients = "";
    if (ingredients && Array.isArray(ingredients)) {
      resolvedAvailableIngredients = ingredients
        .filter((i: any) => i.isExisting || i.isExisting === undefined)
        .map((i: any) => `${i.name} (${i.amount || "약간"}, 상태: ${i.condition || "보통"})`)
        .join(", ");
    } else if (availableIngredients) {
      resolvedAvailableIngredients = availableIngredients;
    }

    if (!profile || !resolvedAvailableIngredients) {
      return res.status(400).json({ error: "프로필 정보와 이용 가능한 식재료 목록이 필요합니다." });
    }

    const prompt = `
당신은 "냉장고파먹기"의 수석 소프트웨어 아키텍트이자 가계 경제 다이어리 멘토이며, 식단 칼로리 정밀 분석 전문가입니다.
모든 출력물은 높은 응집도와 낮은 결합도를 유지하는 '모듈형 설계' 원칙을 따릅니다.

[사용자 프로필]
- 사용자 이름: ${profile.name}
- 목적: ${profile.purposeText}
- 대상자: ${profile.recipientText}

[보유한 냉장고 속 식재료]
- ${resolvedAvailableIngredients}

[레시피 추출 및 매칭 엔진 규칙]
1. 실험적 메뉴나 괴식은 절대 제외하며, 가급적 대중적이고 친숙한 메뉴(예: 김치찌개, 볶음밥, 계란말이 등)를 최우선으로 매칭합니다.
2. 식재료를 최대화하여 활용하고, 추가 구매를 최소화하여 식비 절감을 극대화합니다.
3. 총 3가지의 추천 레시피 후보를 번호(1 ~ 3)와 함께 추천하는 구조화된 데이터를 생성합니다.
4. 각 추천 레시피에 들어간 개별 식재료들의 칼로리를 분석하고 기여도를 평가한 일품화된 리스트(ingredientCalories)를 정확하고 영양학적인 근거와 함께 작성하세요.

식비 절감은 한국 원(KRW) 기준으로 계산하세요. 
중요: 모든 추천 레시피의 절감액이 일괄적으로 동일하거나 9,000원과 같은 정적인 기본값으로 나오는 것은 엄격히 금지됩니다. 각 요리의 난이도, 주재료 가격, 외식 가격 기준을 현실감 있게 반영하여 동적으로 다양하고 정밀한 금액을 산출하세요.
- estimatedCostIfBought (만약 이 레시피를 위해 재료를 마트에서 새로 사거나 외부 식당에서 사먹었을 때의 예상 비용. 예: 분식/면류는 6,000~9,000, 찌개/한식은 8,000~11,000, 고기/메인디쉬는 16,000~30,000 등으로 메뉴에 맞춰 현실성 있는 금액을 다르게 설정)
- actualCost (기존 냉장고 속 식재료 활용으로 직접 추가 지출한 비용, 만약 추가 구매가 없다면 양념/기초소진 비용 등을 감안하여 500, 800, 1200, 1500 등 소액의 임의 현실 비용을 할당하거나 추가 구매 필요 재료의 추정 비용 산입)
- savings (estimatedCostIfBought - actualCost 로 수학적으로 정확해야 함. 세 가지 레시피 각각 절감액이 서로 다르게 나타나야 하며, 1원 단위까지 1500, 800, 1200, 7200 등으로 세밀하게 차별화되어야 함)
- costSavingNote (비용 절감 사유 및 내용 한 줄, 구체적으로 어떤 식재료들을 알뜰하게 파먹어서 소진했고 무엇을 안 사게 되어 아꼈는지 현실감 넘치는 사유 정리)

안전 점검 모듈(safetyMessage)은 재료의 생위생 및 안전, 보관 주의 사항 중 사용자 상태에 알맞은 조언을 제공합니다.
각 레시피를 나타내는 이미지 생성용 프롬프트(imagePrompt)도 구체적으로 묘사하여 제공해주세요 (English, professional culinary food photography, clean plate).

응답은 반드시 아래 JSON 구조와 일치해야 합니다:
{
  "recipes": [
    {
      "recommendNumber": 1,
      "menuName": "메뉴명",
      "cookingGuide": ["1단계 가이드", "2단계 가이드", ...],
      "costStats": {
        "estimatedCostIfBought": 12000,
        "actualCost": 0,
        "savings": 12000,
        "costSavingNote": "집에 있는 남은 두부와 김치를 소진하여 불필요한 외식 비용을 전액 절감했습니다."
      },
      "nutrition": {
        "calories": "350kcal",
        "carbs": "45g",
        "protein": "18g",
        "fat": "12g",
        "balanceScore": 85,
        "nutritionNotes": "단백질과 탄수화물 비율이 우수하며 염분 조절을 위해 국물 섭취는 줄이는 것을 권장합니다."
      },
      "ingredientCalories": [
        { "name": "두부 (150g)", "calories": "120 kcal", "proportion": "34%" },
        { "name": "신김치 (100g)", "calories": "35 kcal", "proportion": "10%" },
        { "name": "대파/양념류", "calories": "20 kcal", "proportion": "6%" }
      ],
      "safetyMessage": "⚠️ 냉장고에 보관 중이던 유통기한 임박 식재료는 조리 시 85도 이상에서 1분 이상 완전히 가열하여 섭취하세요.",
      "imagePrompt": "Professional culinary food photography of Korean kimchi stew with tofu in a hot stone pot, high resolution, soft lighting"
    },
    ...
  ]
}
`;

    const activeAi = getGeminiClient(req);

    const responseText = await generateContentWithFallback(activeAi, {
      contents: [prompt],
      responseSchema: {
        type: Type.OBJECT,
        required: ["recipes"],
        properties: {
          recipes: {
            type: Type.ARRAY,
            description: "추천 레시피 리스트",
            items: {
              type: Type.OBJECT,
              required: ["recommendNumber", "menuName", "cookingGuide", "costStats", "nutrition", "ingredientCalories", "safetyMessage", "imagePrompt"],
              properties: {
                recommendNumber: { type: Type.NUMBER },
                menuName: { type: Type.STRING },
                cookingGuide: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "단계별 조리 가이드 (모듈화)"
                },
                costStats: {
                  type: Type.OBJECT,
                  required: ["estimatedCostIfBought", "actualCost", "savings", "costSavingNote"],
                  properties: {
                    estimatedCostIfBought: { type: Type.NUMBER },
                    actualCost: { type: Type.NUMBER },
                    savings: { type: Type.NUMBER },
                    costSavingNote: { type: Type.STRING },
                  },
                },
                nutrition: {
                  type: Type.OBJECT,
                  required: ["calories", "carbs", "protein", "fat", "balanceScore", "nutritionNotes"],
                  properties: {
                    calories: { type: Type.STRING },
                    carbs: { type: Type.STRING },
                    protein: { type: Type.STRING },
                    fat: { type: Type.STRING },
                    balanceScore: { type: Type.NUMBER },
                    nutritionNotes: { type: Type.STRING },
                  },
                },
                ingredientCalories: {
                  type: Type.ARRAY,
                  description: "각 음식 요소/식재료별 영양 및 칼로리 개별 분석 데이터",
                  items: {
                    type: Type.OBJECT,
                    required: ["name", "calories", "proportion"],
                    properties: {
                      name: { type: Type.STRING, description: "사용한 식재료 이름 및 분량" },
                      calories: { type: Type.STRING, description: "해당 재료의 예상 칼로리값" },
                      proportion: { type: Type.STRING, description: "전체 요리 대비 칼로리 점유 비율" },
                    }
                  }
                },
                safetyMessage: { type: Type.STRING, description: "안전 점검 및 보관 팁 메시지" },
                imagePrompt: { type: Type.STRING, description: "이미지 생성을 위한 AI 프롬프트" },
              },
            },
          },
        },
      },
      promptTextForFallback: prompt
    });

    // Clean up markdown code blocks if any exist
    let cleanedText = responseText.trim();
    if (cleanedText.includes("```json")) {
      cleanedText = cleanedText.split("```json")[1].split("```")[0];
    } else if (cleanedText.includes("```")) {
      cleanedText = cleanedText.split("```")[1].split("```")[0];
    }
    cleanedText = cleanedText.trim();

    const parsedData = JSON.parse(cleanedText || "{}");
    if (!parsedData.recipes || !Array.isArray(parsedData.recipes)) {
      throw new Error("유효한 레시피 데이터 리스트가 응답에 담겨 있지 않습니다.");
    }
    res.json(parsedData);
  } catch (error: any) {
    console.error("Match Recipes Error:", error);
    res.status(500).json({ error: "레시피를 추천하는 도중 오류가 발생했습니다: " + error.message });
  }
});

// ==========================================
// [이미지 생성 모듈] API: 음식완성 이미지 생성
// ==========================================
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "이미지 생성을 위한 프롬프트가 필요합니다." });
    }

    // Explicitly prompt the AI model to generate a beautiful, whimsical 3D illustration / digital art style of the food
    const illustrationPrompt = `Cute whimsical 3D style food illustration of ${prompt}, clay render, vibrant playful colors, soft lighting, clean solid pastel background, high resolution digital art, no-text, centered single dish.`;

    const activeAi = getGeminiClient(req);

    // Try to generate content using gemini-2.5-flash-image
    const response = await activeAi.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          parts: [
            {
              text: illustrationPrompt,
            },
          ],
        },
      ],
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    // Find first inlineData part
    let base64Image = "";
    if (response?.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }

    if (base64Image) {
      return res.json({ imageUrl: `data:image/png;base64,${base64Image}` });
    } else {
      throw new Error("No image data found in response parts.");
    }
  } catch (err: any) {
    console.warn("Gemini Image generation failed, falling back to curated illustration/3D vector search:", err.message);
    
    const menuName = req.body.menuName || "";
    const prompt = req.body.prompt || "";
    const recommendNumber = Number(req.body.recommendNumber) || 0;

    // Hand-curated, highly reliable direct Unsplash CDN URLs (100% free of rate-limits, instantly loads in iframes)
    const categoryImages: Record<string, string[]> = {
      stew: [ // Soup / Stew / Broth
        "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1594756297462-0214a169b555?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1608500218900-8afa1359a7c1?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80"
      ],
      noodles: [ // Noodles / Ramen / Pasta
        "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1612966608997-30004f7cdfb2?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1496116211217-41af89634424?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1582515073490-39981397c445?auto=format&fit=crop&w=600&q=80"
      ],
      rice: [ // Rice / Bibimbap / Fried rice / Bowls
        "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1618413504381-e5d4e22bf9b8?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1603133872878-68551a3e3a84?auto=format&fit=crop&w=600&q=80"
      ],
      meat: [ // Beef / Pork / Chicken / Meats
        "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1598103442097-8b743e2b95c6?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1602489169122-d1704258e3f1?auto=format&fit=crop&w=600&q=80"
      ],
      salad: [ // Healthy / Salad / Tofu / Veggies
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1624462966581-bc6d768cbce5?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1515003844-1098c546b724?auto=format&fit=crop&w=600&q=80"
      ],
      pancake: [ // Eggs, Pancakes, Savory bakes, Dumplings
        "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1598214886806-c87b2a370944?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=600&q=80"
      ],
      general: [ // General beautiful food dishes (12 options)
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1493770308161-fd81a6496cd8?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1473093258190-3685383e25d6?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80"
      ]
    };

    // Build unique hash based on the menuName to guarantee a unique, deterministic random visual image
    let hash = 0;
    const nameStr = menuName || prompt || "";
    for (let i = 0; i < nameStr.length; i++) {
      hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Mix in recommendNumber to keep indices unique and non-duplicating even if names are similar
    hash = hash + (recommendNumber * 73);
    const seed = Math.abs(hash);

    // Determine category based on menuName keywords
    let category = "general";
    if (/[찌개|국|탕|스프|수프|전골|짜글이|샤브]/.test(nameStr)) {
      category = "stew";
    } else if (/[면|라면|국수|파스타|스파게티|우동|소바|비빔면|볶음면|스파|짜장|짬뽕]/.test(nameStr)) {
      category = "noodles";
    } else if (/[밥|볶음밥|비빔밥|덮밥|주먹밥|롤|초밥|리조또|필라프]/.test(nameStr)) {
      category = "rice";
    } else if (/[고기|불고기|제육|닭|오리|갈비|육|돈|치킨|삼겹살|스테이크|조림|구이|가스|까스]/.test(nameStr)) {
      category = "meat";
    } else if (/[샐러드|무침|야채|채소|나물|겉절이|쌈|쌈밥]/.test(nameStr)) {
      category = "salad";
    } else if (/[전|부침개|만두|말이|오믈렛|계란|달걀|샌드위치|빵|토스트]/.test(nameStr)) {
      category = "pancake";
    }

    const imagePool = categoryImages[category];
    // Mix in recommendNumber to force unique chosenIndex even in the exact same category and menuName
    const chosenIndex = (seed + recommendNumber) % imagePool.length;
    let finalUrl = imagePool[chosenIndex];

    res.json({ imageUrl: finalUrl, isFallback: true });
  }
});

// =========================================================
// DEV VS PROD INTEGRATION
// =========================================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[냉장고 파먹기 Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
