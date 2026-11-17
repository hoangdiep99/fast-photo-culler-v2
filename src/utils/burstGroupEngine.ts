import { PhotoItem } from '../types';

export interface BurstGroup {
  id: string;
  photoIds: string[];
  bestShotId: string;
  count: number;
}

function parseTimestamp(dateStr?: string): number {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  try {
    let t = new Date(dateStr).getTime();
    if (!isNaN(t) && t > 0) return t;

    // YYYY:MM:DD HH:MM:SS (EXIF standard)
    const exifFormatted = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    t = new Date(exifFormatted).getTime();
    if (!isNaN(t) && t > 0) return t;

    // HH:mm:ss DD/MM/YYYY
    const dmyMatch = dateStr.match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyMatch) {
      const [, hh, mm, ss, d, m, y] = dmyMatch;
      t = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`).getTime();
      if (!isNaN(t) && t > 0) return t;
    }

    // DD/MM/YYYY HH:mm:ss
    const dmyMatch2 = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
    if (dmyMatch2) {
      const [, d, m, y, hh, mm, ss] = dmyMatch2;
      t = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
  } catch {}
  return 0;
}

/**
 * Trích xuất timestamp chụp ảnh thực tế từ EXIF dateTaken hoặc dateModified
 */
function getPhotoTimestamp(photo: PhotoItem): number {
  if (photo.exif?.dateTaken) {
    const t = parseTimestamp(photo.exif.dateTaken);
    if (t > 0) return t;
  }
  if (photo.dateModified) {
    const t = parseTimestamp(photo.dateModified);
    if (t > 0) return t;
  }
  return 0;
}

/**
 * Trích xuất tiền tố và số thứ tự file ảnh (ví dụ: DIP_5202.NEF -> prefix: "DIP_", num: 5202)
 */
function parseFileSequence(fileName: string): { prefix: string; num: number | null } {
  const match = fileName.match(/^(.*?)(\d+)(\.[^.]+)$/);
  if (match) {
    return {
      prefix: match[1].toLowerCase(),
      num: parseInt(match[2], 10),
    };
  }
  return { prefix: '', num: null };
}

/**
 * Thuật toán Tính điểm Tuyển chọn Ảnh Đẹp Nhất (Best Shot Scoring Engine)
 * Kết hợp đa tiêu chí: Mắt mở to (Eye Openness), Độ nét (Sharpness), Nụ cười/Biểu cảm (Smile), và Đánh giá (Rating)
 */
function calculateBestShotScore(photo: PhotoItem): number {
  const ai = photo.aiData;
  let score = 50.0;

  if (ai) {
    // 1. Điểm cơ sở từ AI Quality Score (0-100)
    score = ai.overallPhotoQualityScore || 50.0;

    // 2. Độ nét chủ thể (Subject-aware Sharpness) - Trọng số rất cao
    const sharpness = ai.sharpnessScore ?? 60.0;
    if (ai.isBlurry || sharpness < 40.0) {
      score -= 50.0; // Phạt nặng nếu ảnh out nét / rung tay
    } else if (sharpness >= 80.0) {
      score += 20.0 + (sharpness - 80.0) * 0.8; // Thưởng ảnh nét căng
    }

    // 3. Trạng thái mắt (Eye Openness) - Yếu tố quyết định trong ảnh chân dung / sự kiện
    const eyeOpen = ai.eyeOpennessScore ?? 85.0;
    if (ai.isBlink || eyeOpen < 35.0 || ai.eyeStatus === 'CLOSED') {
      score -= 70.0; // Phạt cực nặng nếu chớp mắt dở / nhắm mắt
    } else if (eyeOpen >= 85.0) {
      score += 25.0; // Thưởng lớn nếu mắt mở to, rõ tròng mắt
    }

    // 4. Nụ cười & Biểu cảm khuôn mặt (Smile & Expression)
    const smile = ai.smileScore ?? 50.0;
    if (smile >= 65.0) {
      score += 18.0; // Thưởng nếu cười rạng rỡ
    } else if (smile >= 45.0) {
      score += 8.0;
    }

    // Phạt méo miệng / khẩu hình đang nói dở (jawOpen cao mà không cười)
    const mouthOpen = ai.mouthOpenScore ?? 0.0;
    if (mouthOpen > 45.0 && smile < 35.0) {
      score -= 15.0;
    }

    // 5. Khuôn mặt rõ nét, chiếm tỉ lệ tốt trong khung hình
    if (ai.faceDetected && ai.faceSizePx && ai.faceSizePx >= 180) {
      score += 10.0;
    }
  }

  // 6. Tôn trọng quyết định thủ công của người dùng
  if (photo.rating > 0) {
    score += photo.rating * 15.0; // 5 sao được cộng tới +75 điểm
  }
  if (photo.isTagged) {
    score += 20.0;
  }
  if (photo.isRejected) {
    score -= 100.0;
  }

  return score;
}

/**
 * ĐỘNG CƠ GOM NHÓM CHỤP LIÊN HOÀN (7-9 ẢNH) & GỢI Ý BEST SHOT
 */
export function analyzeBurstGroups(photos: PhotoItem[]): {
  photos: PhotoItem[];
  groups: Record<string, BurstGroup>;
} {
  if (photos.length < 2) {
    const updated = photos.map((p) => ({
      ...p,
      isBestShot: p.isBestShot || false,
      burstGroupCount: 1,
      burstGroupIndex: 1,
    }));
    return { photos: updated, groups: {} };
  }

  const groups: Record<string, BurstGroup> = {};
  const photoGroupMap = new Map<string, string>();
  const groupMembersMap = new Map<string, PhotoItem[]>();

  let currentGroupId = `group_0`;
  let currentGroupPhotos: PhotoItem[] = [photos[0]];

  for (let i = 1; i < photos.length; i++) {
    const prev = photos[i - 1];
    const curr = photos[i];

    const prevSeq = parseFileSequence(prev.fileName);
    const currSeq = parseFileSequence(curr.fileName);

    const prevTime = getPhotoTimestamp(prev);
    const currTime = getPhotoTimestamp(curr);
    const timeDeltaMs = (prevTime > 0 && currTime > 0) ? Math.abs(currTime - prevTime) : -1;

    let isSameBurst = false;

    // Quy tắc 1: Cùng tiền tố (e.g. DIP_) và số thứ tự liền kề hoặc cách nhau tối đa 3 số (thợ xóa 1-2 tấm)
    if (prevSeq.prefix === currSeq.prefix && prevSeq.num !== null && currSeq.num !== null) {
      const numDelta = Math.abs(currSeq.num - prevSeq.num);

      if (numDelta <= 3) {
        if (timeDeltaMs >= 0) {
          // Nếu có thời gian: chụp cách nhau <= 8.5 giây thì 100% cùng 1 cụm pose 7-9 ảnh
          if (timeDeltaMs <= 8500) {
            isSameBurst = true;
          }
        } else {
          // Không có EXIF thời gian: số liên tiếp <= 2 được tính là cùng cụm
          if (numDelta <= 2) {
            isSameBurst = true;
          }
        }
      }
    }

    // Quy tắc 2: Chụp siêu nhanh liên tiếp (< 2.5 giây) kể cả khi đổi số máy ảnh
    if (!isSameBurst && timeDeltaMs >= 0 && timeDeltaMs <= 2500) {
      isSameBurst = true;
    }

    // Khống chế cụm tối đa 20 ảnh (nếu quá dài thì tự ngắt thành cụm mới để tránh gom cả album)
    if (isSameBurst && currentGroupPhotos.length < 20) {
      currentGroupPhotos.push(curr);
    } else {
      // Kết thúc cụm trước nếu có từ 2 ảnh trở lên
      if (currentGroupPhotos.length >= 2) {
        groupMembersMap.set(currentGroupId, [...currentGroupPhotos]);
      }
      currentGroupId = `group_${i}`;
      currentGroupPhotos = [curr];
    }
  }

  // Kết thúc cụm cuối cùng
  if (currentGroupPhotos.length >= 2) {
    groupMembersMap.set(currentGroupId, [...currentGroupPhotos]);
  }

  // --- TÍNH TOÁN VÀ BẦU CHỌN TẤM ĐẸP NHẤT (BEST SHOT 👑) TRONG TỪNG CỤM ---
  const bestShotMap = new Map<string, boolean>();
  const photoRankMap = new Map<string, { rank: number; total: number; index: number }>();

  groupMembersMap.forEach((members, gId) => {
    // Chấm điểm từng ảnh trong cụm
    const scoredMembers = members.map((p, idx) => ({
      photo: p,
      score: calculateBestShotScore(p),
      origIndex: idx,
    }));

    // Sắp xếp điểm cao nhất lên đầu
    scoredMembers.sort((a, b) => b.score - a.score);

    const winner = scoredMembers[0].photo;
    bestShotMap.set(winner.id, true);

    groups[gId] = {
      id: gId,
      photoIds: members.map((m) => m.id),
      bestShotId: winner.id,
      count: members.length,
    };

    members.forEach((m, idx) => {
      photoGroupMap.set(m.id, gId);
      const memberScoreObj = scoredMembers.find((sm) => sm.photo.id === m.id);
      const rank = memberScoreObj ? scoredMembers.indexOf(memberScoreObj) + 1 : idx + 1;
      photoRankMap.set(m.id, {
        rank,
        total: members.length,
        index: idx + 1,
      });
    });
  });

  const updatedPhotos = photos.map((p) => {
    const groupId = photoGroupMap.get(p.id);
    const isBestShot = bestShotMap.get(p.id) || false;
    const rankInfo = photoRankMap.get(p.id);

    return {
      ...p,
      burstGroupId: groupId,
      isBestShot,
      burstGroupCount: rankInfo ? rankInfo.total : 1,
      burstGroupIndex: rankInfo ? rankInfo.index : 1,
      aiData: p.aiData
        ? {
            ...p.aiData,
            burstRank: rankInfo ? rankInfo.rank : 1,
          }
        : undefined,
    };
  });

  return { photos: updatedPhotos, groups };
}
