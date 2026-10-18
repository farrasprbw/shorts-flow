import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Video, PlatformType } from '../models/video.models';
import { ScheduleItem } from '../models/schedule.models';
import { User, Role } from '../models/auth.models';
import { KpiCardData, TopVideoMetric, TrafficChartPoint } from '../models/analytics.models';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

export interface YouTubeStatusResponse {
  connected: boolean;
  accountName?: string;
  email?: string;
}

export interface AnalyticsDataPayload {
  isLive: boolean;
  kpiCards: KpiCardData[];
  trafficData: TrafficChartPoint[];
  topVideos: TopVideoMetric[];
}

export interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsDataPayload;
}

export interface ConflictSimulationActor {
  name: string;
  action: string;
  statusCode: number;
  conflict: boolean;
  message: string;
}

export interface ConflictSimulationResponse {
  success: boolean;
  simulatedVideoId?: string;
  actor1?: ConflictSimulationActor;
  actor2?: ConflictSimulationActor;
  summary?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  public readonly baseUrl = 'http://localhost:3000/api';

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('sf_token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    });
  }

  // Auth
  async login(email: string, password: string): Promise<LoginResponse> {
    return firstValueFrom(
      this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, { email, password })
    );
  }

  // Videos
  async getVideos(params?: { status?: string; level?: string; search?: string; onlyActionable?: boolean }): Promise<ApiResponse<Video[]>> {
    const q: Record<string, string> = {};
    if (params?.status && params.status !== 'all') q['status'] = params.status;
    if (params?.level && params.level !== 'all') q['level'] = params.level;
    if (params?.search) q['search'] = params.search;
    if (params?.onlyActionable) q['onlyActionable'] = 'true';

    return firstValueFrom(
      this.http.get<ApiResponse<Video[]>>(`${this.baseUrl}/videos`, {
        params: q,
        headers: this.getAuthHeaders()
      })
    );
  }

  async getVideoById(id: string): Promise<ApiResponse<Video>> {
    return firstValueFrom(
      this.http.get<ApiResponse<Video>>(`${this.baseUrl}/videos/${id}`, {
        headers: this.getAuthHeaders()
      })
    );
  }

  async approveVideo(id: string, level: number, note?: string): Promise<ApiResponse<Video>> {
    return firstValueFrom(
      this.http.post<ApiResponse<Video>>(
        `${this.baseUrl}/videos/${id}/approve`,
        { level, note },
        { headers: this.getAuthHeaders() }
      )
    );
  }

  async rejectVideo(id: string, level: number, note?: string): Promise<ApiResponse<Video>> {
    return firstValueFrom(
      this.http.post<ApiResponse<Video>>(
        `${this.baseUrl}/videos/${id}/reject`,
        { level, note },
        { headers: this.getAuthHeaders() }
      )
    );
  }

  async requestRevision(id: string, level: number, note: string): Promise<ApiResponse<Video>> {
    return firstValueFrom(
      this.http.post<ApiResponse<Video>>(
        `${this.baseUrl}/videos/${id}/revision`,
        { level, note },
        { headers: this.getAuthHeaders() }
      )
    );
  }

  async batchActionVideos(videoIds: string[], action: 'approve' | 'reject', note?: string): Promise<{ success: boolean; message: string; successCount: number; failedCount: number }> {
    return firstValueFrom(
      this.http.post<{ success: boolean; message: string; successCount: number; failedCount: number }>(
        `${this.baseUrl}/videos/batch-action`,
        { videoIds, action, note },
        { headers: this.getAuthHeaders() }
      )
    );
  }

  async generateVideo(data: { topic?: string; title?: string; script?: string; platforms?: string[] }): Promise<ApiResponse<Video>> {
    return firstValueFrom(
      this.http.post<ApiResponse<Video>>(`${this.baseUrl}/videos/generate`, data, {
        headers: this.getAuthHeaders()
      })
    );
  }

  async simulateConflict(videoId?: string): Promise<ConflictSimulationResponse> {
    return firstValueFrom(
      this.http.post<ConflictSimulationResponse>(`${this.baseUrl}/videos/simulate-conflict`, { videoId }, {
        headers: this.getAuthHeaders()
      })
    );
  }

  // Schedules
  async getSchedules(): Promise<ApiResponse<ScheduleItem[]>> {
    return firstValueFrom(
      this.http.get<ApiResponse<ScheduleItem[]>>(`${this.baseUrl}/schedules`)
    );
  }

  async addSchedule(videoId: string, platforms: PlatformType[], scheduledAt: string): Promise<ApiResponse<ScheduleItem[]>> {
    return firstValueFrom(
      this.http.post<ApiResponse<ScheduleItem[]>>(
        `${this.baseUrl}/schedules`,
        { videoId, platforms, scheduledAt },
        { headers: this.getAuthHeaders() }
      )
    );
  }

  async cancelSchedule(id: string): Promise<ApiResponse<null>> {
    return firstValueFrom(
      this.http.delete<ApiResponse<null>>(`${this.baseUrl}/schedules/${id}`, {
        headers: this.getAuthHeaders()
      })
    );
  }

  // Analytics
  async getAnalytics(range: string = '14d', platform: string = 'all'): Promise<AnalyticsResponse> {
    return firstValueFrom(
      this.http.get<AnalyticsResponse>(`${this.baseUrl}/analytics`, {
        params: { range, platform }
      })
    );
  }

  async syncAnalytics(): Promise<ApiResponse<{ updated: number }>> {
    return firstValueFrom(
      this.http.post<ApiResponse<{ updated: number }>>(`${this.baseUrl}/analytics/sync`, {}, {
        headers: this.getAuthHeaders()
      })
    );
  }

  // Admin
  async getAdminUsers(): Promise<ApiResponse<User[]>> {
    return firstValueFrom(
      this.http.get<ApiResponse<User[]>>(`${this.baseUrl}/admin/users`)
    );
  }

  // YouTube OAuth Status
  async getYouTubeStatus(): Promise<YouTubeStatusResponse> {
    return firstValueFrom(
      this.http.get<YouTubeStatusResponse>(`${this.baseUrl}/youtube/status`)
    ).catch(() => ({ connected: false }));
  }

  async saveAdminUser(user: Partial<User>): Promise<ApiResponse<User>> {
    return firstValueFrom(
      this.http.post<ApiResponse<User>>(`${this.baseUrl}/admin/users`, user, {
        headers: this.getAuthHeaders()
      })
    );
  }

  async toggleUserStatus(id: string): Promise<ApiResponse<User>> {
    return firstValueFrom(
      this.http.patch<ApiResponse<User>>(`${this.baseUrl}/admin/users/${id}/status`, {}, {
        headers: this.getAuthHeaders()
      })
    );
  }

  async getAdminRoles(): Promise<ApiResponse<Role[]>> {
    return firstValueFrom(
      this.http.get<ApiResponse<Role[]>>(`${this.baseUrl}/admin/roles`)
    );
  }

  async saveAdminRole(role: { id?: string; name?: string; label?: string; level?: number; canFinalApprove?: boolean; isActive?: boolean }): Promise<ApiResponse<Role>> {
    return firstValueFrom(
      this.http.post<ApiResponse<Role>>(`${this.baseUrl}/admin/roles`, role, {
        headers: this.getAuthHeaders()
      })
    );
  }
}
