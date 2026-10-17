import { PlatformType } from './video.models';

export type ScheduleStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ScheduleItem {
  id: string;
  videoId: string;
  videoTitle: string;
  thumbnailUrl: string;
  platform: PlatformType;
  scheduledAt: string;
  status: ScheduleStatus;
  errorMessage?: string;
  publishedAt?: string;
}
