export type VideoStatus =
  | 'draft'
  | 'pending_review'
  | 'needs_revision'
  | 'approved'
  | 'rejected'
  | 'scheduled'
  | 'published'
  | 'failed';

export type PlatformType = 'youtube' | 'instagram' | 'facebook' | 'tiktok';

export interface ApprovalLog {
  id: string;
  videoId: string;
  userName: string;
  userRole: string;
  level: number;
  action: 'approve' | 'reject' | 'revision';
  channel: 'dashboard' | 'telegram';
  note?: string;
  createdAt: string;
}

export interface Video {
  id: string;
  title: string;
  script: string;
  promptUsed?: string;
  videoUrl?: string;
  thumbnailUrl: string;
  durationSeconds: number;
  aspectRatio: string;
  platforms: PlatformType[];
  status: VideoStatus;
  currentLevel: number;
  requiredMaxLevel: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  approvalHistory: ApprovalLog[];
  // Role & permission payload
  canReview?: boolean;
  requiredRole?: string;
  actionableLevels?: number[];
  // Mock race condition / concurrent lock data
  lockedBy?: {
    userName: string;
    action: 'approve' | 'reject';
    timestamp: string;
  };
}
