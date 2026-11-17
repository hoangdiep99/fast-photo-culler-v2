import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { EyeStatus, SingleEyeData, PhotoAIData } from '../types';

export interface AIDetectionResult extends PhotoAIData {}

let faceLandmarker: FaceLandmarker | null = null;
let modelLoadingPromise: Promise<void> | null = null;

/**
 * Tải Mạng Nơ-ron Google MediaPipe FaceLandmarker Chính Thức từ file `face_landmarker.task`
 */
async function loadGoogleMediaPipeTaskModel(): Promise<void> {
  if (faceLandmarker) return;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: './models/face_landmarker.task',
          delegate: 'GPU',
        },
        outputFaceBlendshapes: true,
        runningMode: 'IMAGE',
        numFaces: 5,
      });

      console.log('✅ Official Google MediaPipe face_landmarker.task (478 3D Mesh + Blendshapes) Loaded!');
    } catch (e) {
      console.warn('Failed to load Google MediaPipe face_landmarker.task:', e);
    }
  })();

  return modelLoadingPromise;
}

/**
 * Tính độ nét Tenengrad / Sobel trên một vùng RoI (Region of Interest)
 * Đo trực tiếp trên lông mi, con ngươi mắt và khóe môi thay vì bị lừa bởi bokeh xóa phông
 */
function computeRoiSharpness(
  gray: Float32Array,
  width: number,
  height: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const rx1 = Math.max(1, Math.min(width - 2, Math.floor(x1)));
  const ry1 = Math.max(1, Math.min(height - 2, Math.floor(y1)));
  const rx2 = Math.max(rx1 + 2, Math.min(width - 2, Math.ceil(x2)));
  const ry2 = Math.max(ry1 + 2, Math.min(height - 2, Math.ceil(y2)));

  let sumGradSq = 0;
  let count = 0;

  for (let y = ry1; y <= ry2; y++) {
    for (let x = rx1; x <= rx2; x++) {
      const idx = y * width + x;
      // Sobel gradient
      const gx =
        -gray[idx - width - 1] + gray[idx - width + 1] -
        2 * gray[idx - 1] + 2 * gray[idx + 1] -
        gray[idx + width - 1] + gray[idx + width + 1];

      const gy =
        -gray[idx - width - 1] - 2 * gray[idx - width] - gray[idx - width + 1] +
        gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1];

      sumGradSq += (gx * gx + gy * gy);
      count++;
    }
  }

  if (count === 0) return 60;
  const rmsGrad = Math.sqrt(sumGradSq / count);
  // Chuẩn hóa sang thang điểm 10 - 100
  return Math.min(100, Math.max(10, Math.round(rmsGrad * 0.95)));
}

/**
 * Đoạn phân tích Chụp Rung Tay (Directional Motion Blur Detection)
 * Dựa trên cấu trúc Eigenvector / Gradient Covariance Anisotropy
 */
function detectMotionBlur(
  gray: Float32Array,
  width: number,
  height: number
): { isMotionBlur: boolean; motionBlurScore: number } {
  let gxxSum = 0;
  let gyySum = 0;
  let gxySum = 0;
  let totalGrad = 0;
  let count = 0;

  for (let y = 2; y < height - 2; y += 2) {
    for (let x = 2; x < width - 2; x += 2) {
      const idx = y * width + x;
      const gx = (gray[idx + 1] - gray[idx - 1]) * 0.5;
      const gy = (gray[idx + width] - gray[idx - width]) * 0.5;

      gxxSum += gx * gx;
      gyySum += gy * gy;
      gxySum += gx * gy;
      totalGrad += Math.sqrt(gx * gx + gy * gy);
      count++;
    }
  }

  if (count === 0) return { isMotionBlur: false, motionBlurScore: 0 };

  const denom = gxxSum + gyySum + 1e-4;
  // Anisotropy / Coherence: đo sự lệch hướng gradient (0 = đồng hướng tròn, 1 = lệch tuyệt đối theo vệt rung)
  const anisotropy = Math.sqrt((gxxSum - gyySum) * (gxxSum - gyySum) + 4 * gxySum * gxySum) / denom;
  const avgGrad = totalGrad / count;

  const motionBlurScore = Math.min(100, Math.max(0, Math.round(anisotropy * 100)));
  // Chụp rung tay: Coherence cao (> 0.48) đồng thời biên độ nét trung bình bị kéo dãn
  const isMotionBlur = anisotropy > 0.48 && avgGrad < 28;

  return { isMotionBlur, motionBlurScore };
}

/**
 * ĐỘNG CƠ CHÍNH THỨC GOOGLE MEDIAPIPE FACE_LANDMARKER.TASK (v28.0 NÂNG CẤP)
 * - Đo nét chuyên sâu vùng Mắt (Eye RoI Sharpness) tránh bị lừa bởi Bokeh xóa phông
 * - Phát hiện chuyển động rung tay (Motion Blur)
 * - Tự động bù trừ cười híp mắt (Asian Smile & Cheek Compensation) tránh nhận nhầm nhắm mắt
 */
export async function analyzeImageQuality(
  imageSrc: string,
  origWidth?: number,
  origHeight?: number,
  customThresholdPct: number = 30
): Promise<AIDetectionResult> {
  return new Promise((resolve) => {
    if (!imageSrc) {
      return resolve({
        isBlink: false,
        isBlurry: false,
        isMotionBlur: false,
        motionBlurScore: 0,
        eyeSharpness: 85,
        sharpnessScore: 80,
        eyeOpennessScore: 90,
        faceDetected: false,
        eyeStatus: 'OPEN',
        overallPhotoQualityScore: 85
      });
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    img.onload = async () => {
      try {
        const naturalW = origWidth || img.naturalWidth || 6000;
        const naturalH = origHeight || img.naturalHeight || 4000;

        const sampleW = 380;
        const sampleH = Math.round((img.height / img.width) * sampleW) || 250;

        const canvas = document.createElement('canvas');
        canvas.width = sampleW;
        canvas.height = sampleH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({
            isBlink: false,
            isBlurry: false,
            isMotionBlur: false,
            motionBlurScore: 0,
            eyeSharpness: 80,
            sharpnessScore: 80,
            eyeOpennessScore: 90,
            faceDetected: false,
            eyeStatus: 'OPEN',
            overallPhotoQualityScore: 85
          });
        }

        ctx.drawImage(img, 0, 0, sampleW, sampleH);
        const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
        const data = imgData.data;

        // 1. Grayscale toàn ảnh
        const gray = new Float32Array(sampleW * sampleH);
        for (let i = 0; i < data.length; i += 4) {
          gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }

        // 2. Phát hiện rung tay Motion Blur
        const { isMotionBlur, motionBlurScore } = detectMotionBlur(gray, sampleW, sampleH);

        // 3. Laplacian Variance cho Điểm Nét Toàn Cảnh (Global Sharpness)
        let lapSum = 0;
        let lapSqSum = 0;
        let count = 0;

        for (let y = 1; y < sampleH - 1; y++) {
          for (let x = 1; x < sampleW - 1; x++) {
            const idx = y * sampleW + x;
            const lap =
              gray[idx - sampleW] +
              gray[idx - 1] -
              4 * gray[idx] +
              gray[idx + 1] +
              gray[idx + sampleW];

            lapSum += lap;
            lapSqSum += lap * lap;
            count++;
          }
        }

        const mean = lapSum / count;
        const variance = lapSqSum / count - mean * mean;
        let globalSharpness = Math.min(100, Math.max(10, Math.round(Math.sqrt(variance) * 2.6)));

        // 4. Tải & Chạy Mạng Nơ-ron Google MediaPipe face_landmarker.task
        await loadGoogleMediaPipeTaskModel();

        let faceDetected = false;
        let faceShortestEdgePx = 0;
        let eyeStatus: EyeStatus = 'OPEN';
        let isBlink = false;

        let leftEyeData: SingleEyeData | undefined;
        let rightEyeData: SingleEyeData | undefined;

        let openingRatioAvg = 0.90;
        let irisVisibilityAvg = 0.35;
        let confidenceAvg = 0.98;
        let finalEyeOpenScore = 90;
        let finalSmileScore = 50;
        let finalMouthOpenScore = 0;
        let eyeSharpness = globalSharpness;

        if (faceLandmarker) {
          let result: any = null;
          try {
            result = faceLandmarker.detect(canvas);
          } catch {
            try {
              result = faceLandmarker.detect(img);
            } catch {}
          }

          if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
            faceDetected = true;

            const landmarks = result.faceLandmarks[0]; // Khuôn mặt chính (ưu tiên diện tích lớn nhất)
            const blendshapes = result.faceBlendshapes && result.faceBlendshapes[0]
              ? result.faceBlendshapes[0].categories
              : [];

            const getCategoryScore = (name: string): number => {
              const item = blendshapes.find((c: any) => c.categoryName === name);
              return item ? item.score : 0.0;
            };

            const blinkLeftScore = getCategoryScore('eyeBlinkLeft');
            const blinkRightScore = getCategoryScore('eyeBlinkRight');
            const lookDownLeft = getCategoryScore('eyeLookDownLeft');
            const lookDownRight = getCategoryScore('eyeLookDownRight');

            const avgBlinkScore = (blinkLeftScore + blinkRightScore) / 2.0;
            const avgLookDownScore = (lookDownLeft + lookDownRight) / 2.0;

            // Đọc cử chỉ cười và nheo mắt khi cười (mouthSmile, cheekSquint, eyeSquint)
            const smileLeft = getCategoryScore('mouthSmileLeft');
            const smileRight = getCategoryScore('mouthSmileRight');
            const avgSmile = (smileLeft + smileRight) / 2.0;
            finalSmileScore = Math.min(100, Math.max(0, Math.round(avgSmile * 100)));

            const cheekSquintLeft = getCategoryScore('cheekSquintLeft');
            const cheekSquintRight = getCategoryScore('cheekSquintRight');
            const avgCheekSquint = (cheekSquintLeft + cheekSquintRight) / 2.0;

            const eyeSquintLeft = getCategoryScore('eyeSquintLeft');
            const eyeSquintRight = getCategoryScore('eyeSquintRight');
            const avgEyeSquint = (eyeSquintLeft + eyeSquintRight) / 2.0;

            const jawOpen = getCategoryScore('jawOpen');
            finalMouthOpenScore = Math.min(100, Math.max(0, Math.round(jawOpen * 100)));

            // 5. Tính tọa độ khuôn mặt và mắt trên canvas mẫu để đo độ nét vùng mắt (Eye RoI)
            let minX = 1, maxX = 0, minY = 1, maxY = 0;
            landmarks.forEach((pt: any) => {
              if (pt.x < minX) minX = pt.x;
              if (pt.x > maxX) maxX = pt.x;
              if (pt.y < minY) minY = pt.y;
              if (pt.y > maxY) maxY = pt.y;
            });

            const faceW = (maxX - minX) * naturalW;
            const faceH = (maxY - minY) * naturalH;
            faceShortestEdgePx = Math.round(Math.min(faceW, faceH));

            // Vùng mắt trái: landmarks 33, 133, 159, 145, 468
            const leftEyeIndices = [33, 133, 159, 145, 153, 154, 468];
            let lx1 = 1, lx2 = 0, ly1 = 1, ly2 = 0;
            leftEyeIndices.forEach((idx) => {
              const pt = landmarks[idx];
              if (pt) {
                if (pt.x < lx1) lx1 = pt.x;
                if (pt.x > lx2) lx2 = pt.x;
                if (pt.y < ly1) ly1 = pt.y;
                if (pt.y > ly2) ly2 = pt.y;
              }
            });

            // Vùng mắt phải: landmarks 362, 263, 386, 374, 380, 473
            const rightEyeIndices = [362, 263, 386, 374, 380, 381, 473];
            let rx1 = 1, rx2 = 0, ry1 = 1, ry2 = 0;
            rightEyeIndices.forEach((idx) => {
              const pt = landmarks[idx];
              if (pt) {
                if (pt.x < rx1) rx1 = pt.x;
                if (pt.x > rx2) rx2 = pt.x;
                if (pt.y < ry1) ry1 = pt.y;
                if (pt.y > ry2) ry2 = pt.y;
              }
            });

            // Mở rộng bounding box mắt ra 35% để bao hàm mi mắt và chân mày
            const expandRoI = (x1: number, y1: number, x2: number, y2: number) => {
              const w = x2 - x1;
              const h = y2 - y1;
              return {
                x1: (x1 - w * 0.35) * sampleW,
                y1: (y1 - h * 0.35) * sampleH,
                x2: (x2 + w * 0.35) * sampleW,
                y2: (y2 + h * 0.35) * sampleH,
              };
            };

            const leftRoI = expandRoI(lx1, ly1, lx2, ly2);
            const rightRoI = expandRoI(rx1, ry1, rx2, ry2);

            const leftEyeSharpness = computeRoiSharpness(gray, sampleW, sampleH, leftRoI.x1, leftRoI.y1, leftRoI.x2, leftRoI.y2);
            const rightEyeSharpness = computeRoiSharpness(gray, sampleW, sampleH, rightRoI.x1, rightRoI.y1, rightRoI.x2, rightRoI.y2);
            eyeSharpness = Math.round((leftEyeSharpness + rightEyeSharpness) / 2);

            // Đo độ nét toàn bộ khuôn mặt
            const faceRoI = {
              x1: Math.max(0, minX * sampleW),
              y1: Math.max(0, minY * sampleH),
              x2: Math.min(sampleW - 1, maxX * sampleW),
              y2: Math.min(sampleH - 1, maxY * sampleH),
            };
            const faceSharpness = computeRoiSharpness(gray, sampleW, sampleH, faceRoI.x1, faceRoI.y1, faceRoI.x2, faceRoI.y2);

            // Điểm nét cuối cùng: ưu tiên trọng số 70% vùng Mắt và Mặt (khắc phục hoàn toàn lỗi Bokeh xóa phông)
            globalSharpness = Math.round(eyeSharpness * 0.45 + faceSharpness * 0.35 + globalSharpness * 0.20);

            // 6. THUẬT TOÁN NHẬN DIỆN MẮT THÔNG MINH - CHỐNG NHẦM LẪN CƯỜI HÍP MẮT (ASIAN SMILE COMPENSATION)
            // Người Á Đông khi cười tươi (mouthSmile > 0.35 hoặc cheekSquint > 0.25) thì cơ má nâng lên làm mắt khép hờ
            const isSmilingBrightly = avgSmile > 0.35 || avgCheekSquint > 0.28 || (avgEyeSquint > 0.30 && avgSmile > 0.20);

            let eyeOpennessPct = Math.min(100, Math.max(10, Math.round((1.0 - avgBlinkScore) * 100)));

            if (isSmilingBrightly) {
              // Khi cười tươi: chỉ tính là nhắm mắt nếu avgBlinkScore cực lớn (> 0.72)
              if (avgBlinkScore > 0.72) {
                isBlink = true;
                eyeStatus = 'CLOSED';
                eyeOpennessPct = Math.min(20, Math.round((1.0 - avgBlinkScore) * 100));
              } else {
                // Biểu cảm cười tự nhiên: giữ trạng thái Mở Mắt
                isBlink = false;
                eyeStatus = 'OPEN';
                eyeOpennessPct = Math.max(72, Math.round(100 - avgBlinkScore * 40));
              }
            } else {
              // Trạng thái bình thường:
              // Cúi nhìn thấp (lookDown) hoặc chớp mắt
              if (avgBlinkScore > 0.55 || (avgLookDownScore > 0.48 && avgBlinkScore > 0.38)) {
                isBlink = true;
                eyeStatus = 'CLOSED';
                eyeOpennessPct = 15;
              } else if (eyeOpennessPct < customThresholdPct || eyeOpennessPct <= 28) {
                isBlink = true;
                eyeStatus = 'CLOSED';
              } else {
                isBlink = false;
                eyeStatus = 'OPEN';
              }
            }

            const openingRatio = Number((eyeOpennessPct / 100.0).toFixed(3));

            leftEyeData = {
              status: isBlink ? 'CLOSED' : 'OPEN',
              openingRatio,
              irisVisibility: 0.35,
              ear: Number((1.0 - blinkLeftScore).toFixed(3)),
              confidence: 0.98,
              sharpness: leftEyeSharpness,
              score: eyeOpennessPct,
            };

            rightEyeData = {
              status: isBlink ? 'CLOSED' : 'OPEN',
              openingRatio,
              irisVisibility: 0.35,
              ear: Number((1.0 - blinkRightScore).toFixed(3)),
              confidence: 0.98,
              sharpness: rightEyeSharpness,
              score: eyeOpennessPct,
            };

            openingRatioAvg = openingRatio;
            irisVisibilityAvg = 0.35;
            finalEyeOpenScore = eyeOpennessPct;
          }
        }

        // Nếu không phát hiện khuôn mặt (ảnh phong cảnh, kiến trúc)
        if (!faceDetected) {
          isBlink = false;
          eyeStatus = 'OPEN';
          openingRatioAvg = 0.90;
          irisVisibilityAvg = 0.35;
          finalEyeOpenScore = 85;
          finalSmileScore = 50;
          finalMouthOpenScore = 0;
          eyeSharpness = globalSharpness;
        }

        const isBlurry = globalSharpness < 45 || isMotionBlur;

        // Điểm đánh giá tổng hợp bức ảnh (Overall Quality Score)
        const overallPhotoQualityScore = Math.round(
          finalEyeOpenScore * 0.40 +
          globalSharpness * 0.35 +
          finalSmileScore * 0.15 +
          (confidenceAvg * 100) * 0.10 -
          (isMotionBlur ? 15 : 0)
        );

        resolve({
          isBlink,
          isBlurry,
          isMotionBlur,
          motionBlurScore,
          eyeSharpness,
          sharpnessScore: globalSharpness,
          eyeOpennessScore: finalEyeOpenScore,
          smileScore: finalSmileScore,
          mouthOpenScore: finalMouthOpenScore,
          faceSizePx: faceShortestEdgePx,
          faceDetected,
          earScore: leftEyeData ? Number(((leftEyeData.ear + (rightEyeData?.ear || leftEyeData.ear)) / 2).toFixed(3)) : 0.28,
          eyeStatus,
          leftEye: leftEyeData,
          rightEye: rightEyeData,
          openingRatioAvg,
          irisVisibilityAvg,
          confidenceAvg,
          overallPhotoQualityScore: Math.max(10, Math.min(100, overallPhotoQualityScore)),
        });
      } catch (err) {
        console.warn('Google MediaPipe Task AI quality analyze error:', err);
        resolve({
          isBlink: false,
          isBlurry: false,
          isMotionBlur: false,
          motionBlurScore: 0,
          eyeSharpness: 80,
          sharpnessScore: 80,
          eyeOpennessScore: 90,
          faceDetected: false,
          eyeStatus: 'OPEN',
          overallPhotoQualityScore: 85
        });
      }
    };

    img.onerror = () => {
      resolve({
        isBlink: false,
        isBlurry: false,
        isMotionBlur: false,
        motionBlurScore: 0,
        eyeSharpness: 80,
        sharpnessScore: 80,
        eyeOpennessScore: 90,
        faceDetected: false,
        eyeStatus: 'OPEN',
        overallPhotoQualityScore: 85
      });
    };
  });
}
