import { Injectable, signal, inject } from '@angular/core';
import { ScheduleItem } from '../models/schedule.models';
import { PlatformType } from '../models/video.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  private apiService = inject(ApiService);

  constructor() {
    this.loadFromApi();
  }

  async loadFromApi() {
    try {
      const res = await this.apiService.getSchedules();
      if (res && res.success && Array.isArray(res.data)) {
        this._schedules.set(res.data);
      }
    } catch (err) {
      console.warn('[ScheduleService] Cannot load schedules from API:', err);
    }
  }

  private readonly _schedules = signal<ScheduleItem[]>([]);

  public readonly schedules = this._schedules.asReadonly();

  async addSchedule(videoId: string, title: string, thumbnailUrl: string, platforms: PlatformType[], scheduledAt: string) {
    try {
      await this.apiService.addSchedule(videoId, platforms, scheduledAt);
      await this.loadFromApi();
    } catch (err) {
      console.warn('[ScheduleService] Backend addSchedule error:', err);
    }
  }

  async cancelSchedule(id: string) {
    try {
      await this.apiService.cancelSchedule(id);
      await this.loadFromApi();
    } catch (err) {
      console.warn('[ScheduleService] Backend cancelSchedule error:', err);
    }
  }
}
