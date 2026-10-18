import { Injectable, signal, inject } from '@angular/core';
import { KpiCardData, TopVideoMetric, TrafficChartPoint } from '../models/analytics.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiService = inject(ApiService);

  public readonly selectedRange = signal<'7d' | '14d' | '30d'>('14d');
  public readonly selectedPlatform = signal<string>('all');
  public readonly isLive = signal<boolean>(false);
  public readonly isSyncing = signal<boolean>(false);

  public readonly kpiCards = signal<KpiCardData[]>([
    {
      title: 'Total Views',
      value: '0',
      delta: '0%',
      isPositive: true,
      sublabel: 'belum ada penayangan'
    },
    {
      title: 'Total Likes',
      value: '0',
      delta: '0',
      isPositive: true,
      sublabel: 'interaksi suka audiens'
    },
    {
      title: 'Total Komentar',
      value: '0',
      delta: '0',
      isPositive: true,
      sublabel: 'diskusi pada video'
    },
    {
      title: 'Avg Engagement Rate',
      value: '0.0%',
      delta: '0%',
      isPositive: true,
      sublabel: 'rasio likes & komentar per views'
    }
  ]);

  public readonly trafficData = signal<TrafficChartPoint[]>([]);
  public readonly topVideos = signal<TopVideoMetric[]>([]);

  constructor() {
    this.loadFromApi();
  }

  async loadFromApi() {
    try {
      const res = await this.apiService.getAnalytics(
        this.selectedRange(),
        this.selectedPlatform()
      );
      if (res && res.success && res.data) {
        this.isLive.set(Boolean(res.data.isLive));
        this.kpiCards.set(res.data.kpiCards || []);
        this.trafficData.set(res.data.trafficData || []);
        this.topVideos.set(res.data.topVideos || []);
      }
    } catch (err: unknown) {
      console.warn('[AnalyticsService] Cannot load live analytics from API:', (err as Error).message);
    }
  }

  async syncYouTube(): Promise<{ success: boolean; message: string }> {
    this.isSyncing.set(true);
    try {
      const res = await this.apiService.syncAnalytics();
      await this.loadFromApi();
      return {
        success: true,
        message: res.message || 'Sinkronisasi metrik YouTube berhasil.'
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: (err as Error).message || 'Gagal sinkronisasi dengan YouTube.'
      };
    } finally {
      this.isSyncing.set(false);
    }
  }

  onFilterChange() {
    this.loadFromApi();
  }
}
