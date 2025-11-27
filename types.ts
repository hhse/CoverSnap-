export interface ExtractionResult {
  url: string;
  title?: string;
  platform: Platform;
  originalUrl: string;
}

export enum Platform {
  WECHAT = 'WeChat',
  ZHIHU = 'Zhihu',
  XIAOHONGSHU = 'Xiaohongshu',
  UNKNOWN = 'Unknown'
}

export interface ExtractorState {
  isLoading: boolean;
  error: string | null;
  data: ExtractionResult | null;
}
