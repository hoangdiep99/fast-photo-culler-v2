export type ColorLabel = 'none' | 'red' | 'yellow' | 'green' | 'blue' | 'purple';
export type PickStatus = 'all' | 'pick' | 'reject' | 'unpicked';
export type RatingFilter = 'all' | 'unrated' | 1 | 2 | 3 | 4 | 5 | 'gte3';
export type AIFilter = 'all' | 'best' | 'open' | 'blink' | 'blurry' | 'sharp';
export type EyeStatus = 'OPEN' | 'CLOSED';
export type RawPreviewResolution = 'fast' | 'balanced' | 'max';

export interface SingleEyeData {
  status: EyeStatus;
  openingRatio: number;
  irisVisibility: number;
  ear: number;
  confidence: number;
  sharpness: number;
  score: number;
}

export interface PhotoAIData {
  isBlink?: boolean;
  isBlurry?: boolean;
  isMotionBlur?: boolean;
  motionBlurScore?: number;
  eyeSharpness?: number;
  sharpnessScore?: number;
  eyeOpennessScore?: number;
  smileScore?: number;
  mouthOpenScore?: number;
  faceSizePx?: number;
  faceDetected?: boolean;
  earScore?: number;
  eyeStatus?: EyeStatus;
  leftEye?: SingleEyeData;
  rightEye?: SingleEyeData;
  openingRatioAvg?: number;
  irisVisibilityAvg?: number;
  confidenceAvg?: number;
  overallPhotoQualityScore?: number;
  burstRank?: number;
}

export interface PhotoExif {
  make?: string;
  model?: string;
  lens?: string;
  iso?: number | string;
  fNumber?: string;
  shutterSpeed?: string;
  focalLength?: string;
  dateTaken?: string;
  dateModified?: string;
  fileSizeFormatted?: string;
  width?: number;
  height?: number;
}

export interface PhotoItem {
  id: string;
  filePath: string;
  fileName: string;
  isRaw: boolean;
  isVideo?: boolean;
  isDesign?: boolean;
  fileType: string;


  rating: number;
  colorLabel: ColorLabel;
  isTagged: boolean;
  isRejected: boolean;
  previewUrl?: string;
  fileSize?: number;
  dateModified?: string;
  orientation?: number;
  exif?: PhotoExif;
  aiData?: PhotoAIData;
  burstGroupId?: string;
  burstGroupCount?: number;
  burstGroupIndex?: number;
  isBestShot?: boolean;
}

export interface FilterState {
  rating: RatingFilter;
  pickStatus: PickStatus;
  colorLabel: ColorLabel | 'all';
  searchQuery: string;
  hideRejected: boolean;
  rawOnly: boolean;
  aiFilter: AIFilter;
  eyeOpeningThresholdPct?: number; // Default 45%
}

export type ThemeMode = 'dark' | 'light' | 'system';
export type SortField = 'name' | 'date' | 'size' | 'type' | 'rating';

export type SortOrder = 'asc' | 'desc';
export type LayoutMode = 'grid' | 'detail' | 'list';

export interface SortOptions {
  field: SortField;
  order: SortOrder;
  foldersFirst: boolean;
}

export interface CullingStats {

  total: number;
  filtered: number;
  tagged: number;
  rated: number;
  rejected: number;
}

export interface SubfolderItem {
  name: string;
  path: string;
  photoCount?: number;
  dateModified?: number;
}


export interface TreeNode {
  name: string;
  path: string;
  isFolder?: boolean;
  isDrive?: boolean;
  children?: TreeNode[];
  isExpanded?: boolean;
}

export interface RecentFolder {
  path: string;
  name: string;
  lastOpened: number | string;
}

export interface CacheInfo {
  count?: number;
  sizeFormatted?: string;
  usedBytes?: number;
  itemCount?: number;
  cachePath?: string;
  limitMB?: number;
  autoClearDays?: number;
}

export interface DriveInfo {
  name: string;
  path: string;
}

export interface UserFolderInfo {
  name: string;
  path: string;
  type: string;
}
