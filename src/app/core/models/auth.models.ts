export type RoleName = 'admin' | 'reviewer_level_1' | 'reviewer_level_2' | 'viewer';

export interface Role {
  id: string;
  name: RoleName;
  label: string;
  level: number; // 0 = admin, 1 = L1, 2 = L2, 99 = viewer
  canFinalApprove: boolean;
  isActive: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: RoleName[];
  isActive: boolean;
  avatarUrl?: string;
  telegramUsername?: string;
  createdAt: string;
}
