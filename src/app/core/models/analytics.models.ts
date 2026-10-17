import { PlatformType, VideoStatus } from './video.models';

export interface KpiCardData {
  title: string;
  value: string;
  delta: string;
  isPositive: boolean;
  unit?: string;
  sublabel: string;
}

export interface TopVideoMetric {
  id: string;
  title: string;
  thumbnailUrl: string;
  views: number;
  platform: PlatformType;
  status: VideoStatus;
  likes: number;
  retentionPercent: number;
}

export interface TrafficChartPoint {
  date: string;
  views: number;
  subs: number;
}
