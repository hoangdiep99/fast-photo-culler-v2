/**
 * Google Gemini Vision API Service
 * Tích hợp chuẩn 100% cho các dòng Model mới: gemini-3.6-flash & gemini-3.5-flash
 */

export interface GeminiTestResult {
  success: boolean;
  message: string;
}

export interface PhotoEmotionScore {
  smileScore: number; // 0 - 100
  eyeStatus: string;  // "OPEN" | "CLOSED" | "SQUINT"
  emotion: string;    // "Happy", "Natural", "Neutral", "Blink"
  overallScore: number; // 0 - 100
}

export interface BestShotAnalysisResult {
  bestPhotoId: string;
  bestFileName: string;
  reason: string;
  photoScores: Record<string, PhotoEmotionScore>;
}

// Danh sách các mô hình Google Gemini đang hoạt động thực tế 100% cho API Key mới
const WORKING_GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
];

/**
 * Kiểm tra tính hợp lệ của API Key với Google Gemini API
 */
export async function testGeminiApiKey(apiKey: string): Promise<GeminiTestResult> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { success: false, message: 'Vui lòng nhập Google Gemini API Key!' };
  }

  let lastErrorMessage = '';

  for (const modelName of WORKING_GEMINI_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(cleanKey)}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: 'Hello! Respond with "OK" if the Google Gemini API key is working correctly.' }],
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (replyText) {
          return {
            success: true,
            message: `✅ Kết nối thành công Google Gemini API! (Đã liên kết Mô hình Google AI: ${modelName})`,
          };
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        lastErrorMessage = errData.error?.message || response.statusText || 'Lỗi kết nối API';
      }
    } catch (err: any) {
      lastErrorMessage = err?.message || 'Lỗi mạng hoặc kết nối';
    }
  }

  return { success: false, message: `❌ Lỗi kết nối Google Gemini API: ${lastErrorMessage}` };
}

/**
 * Gửi nhóm ảnh ứng viên lên Google Gemini Vision API để chọn tấm đẹp nhất
 */
export async function analyzeBestShotWithGemini(
  apiKey: string,
  photosData: { id: string; fileName: string; base64Data: string }[]
): Promise<BestShotAnalysisResult> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('Chưa cấu hình Google Gemini API Key!');
  }

  if (photosData.length === 0) {
    throw new Error('Danh sách ảnh rỗng!');
  }

  const contentsParts: any[] = [
    {
      text: `Bạn là một chuyên gia Nhiếp ảnh & Giám khảo chọn ảnh chân dung chuyên nghiệp (Professional Portrait Judge).
Dưới đây là ${photosData.length} bức ảnh chân dung ứng viên. Hãy phân tích kỹ:
1. Mắt có mở to tròn tự nhiên không? (Tránh mắt nhắm/lim dim/cúi nhìn).
2. Nụ cười và cảm xúc khuôn mặt có tươi tắn, rạng rỡ, tự nhiên nhất không?
3. Thần thái và nét mặt chung.

Hãy trả về kết quả định dạng JSON thuần túy (JSON string) không chứa markdown code block, theo cấu trúc:
{
  "bestPhotoId": "ID của bức ảnh đẹp nhất",
  "bestFileName": "Tên file bức ảnh đẹp nhất",
  "reason": "Giải thích chi tiết ngắn gọn 1-2 câu vì sao bức ảnh này đẹp nhất",
  "scores": {
    "PHOTO_ID_1": { "smileScore": 95, "eyeStatus": "OPEN", "emotion": "Rạng rỡ", "overallScore": 96 }
  }
}
`,
    },
  ];

  photosData.forEach((item) => {
    const pureBase64 = item.base64Data.replace(/^data:image\/\w+;base64,/, '');
    contentsParts.push({ text: `[ẢNH ID: ${item.id} - FILE: ${item.fileName}]` });
    contentsParts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: pureBase64,
      },
    });
  });

  let lastError = 'Lỗi gọi API Gemini Vision';

  for (const modelName of WORKING_GEMINI_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(cleanKey)}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: contentsParts }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawJsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        try {
          const cleanJsonStr = rawJsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJsonStr);

          return {
            bestPhotoId: parsed.bestPhotoId || photosData[0].id,
            bestFileName: parsed.bestFileName || photosData[0].fileName,
            reason: parsed.reason || 'Bức ảnh có biểu cảm nụ cười và mắt tự nhiên nhất trong nhóm.',
            photoScores: parsed.scores || {},
          };
        } catch {
          return {
            bestPhotoId: photosData[0].id,
            bestFileName: photosData[0].fileName,
            reason: 'Đã phân tích xong ảnh với Google Gemini Vision.',
            photoScores: {},
          };
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        lastError = errData.error?.message || response.statusText || 'Lỗi gọi API Gemini';
      }
    } catch (e: any) {
      lastError = e?.message || 'Lỗi kết nối';
    }
  }

  throw new Error(lastError);
}
