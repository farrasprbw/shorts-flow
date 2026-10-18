import { PlatformType } from './video.models';

export type ScheduleStatus = 'queued' | 'processing' | 'in_progress' | 'completed' | 'failed';

export interface ScheduleItem {
  id: string;
  videoId: string;
  videoTitle: string;
  thumbnailUrl: string;
  videoThumbnail?: string;
  platform: PlatformType;
  scheduledAt: string;
  status: ScheduleStatus;
  errorMessage?: string;
  publishedAt?: string;
}

