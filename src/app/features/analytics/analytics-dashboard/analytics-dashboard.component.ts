import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { ToastService } from '../../../shared/services/toast.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  template: `
    <div class="flex flex-col gap-6 sm:gap-8">
      <!-- Header with Filter Controls -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Analytics & Performa Konten
          </h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pantau pertumbuhan traffic YouTube Shorts, Instagram Reels, dan TikTok hasil distribusi otomatis.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          @if (analyticsService.isLive()) {
            <span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Data Riil YouTube</span>
            </span>
          }

          <!-- Sync YouTube Button -->
          <button
            (click)="onSyncMetrics()"
            [disabled]="analyticsService.isSyncing()"
            class="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors shadow-xs disabled:opacity-50"
            title="Tarik metrik tayangan dan suka terbaru dari YouTube"
          >
            <svg class="w-3.5 h-3.5" [class.animate-spin]="analyticsService.isSyncing()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span>{{ analyticsService.isSyncing() ? 'Menarik Data...' : 'Sinkronisasi YouTube' }}</span>
          </button>

          <!-- Platform Filter -->
          <select
            [ngModel]="analyticsService.selectedPlatform()"
            (ngModelChange)="onPlatformChange($event)"
            class="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Semua Platform</option>
            <option value="youtube">YouTube Shorts</option>
            <option value="instagram">Instagram Reels</option>
            <option value="tiktok">TikTok</option>
          </select>

          <!-- Range Toggle Tabs -->
          <div class="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold">
            <button
              (click)="onRangeChange('7d')"
              class="px-3 py-1.5 rounded-lg transition-colors"
              [class.bg-white]="analyticsService.selectedRange() === '7d'"
              [class.dark:bg-slate-700]="analyticsService.selectedRange() === '7d'"
              [class.text-indigo-600]="analyticsService.selectedRange() === '7d'"
              [class.shadow-xs]="analyticsService.selectedRange() === '7d'"
              [class.text-slate-500]="analyticsService.selectedRange() !== '7d'"
            >
              7 Hari
            </button>
            <button
              (click)="onRangeChange('14d')"
              class="px-3 py-1.5 rounded-lg transition-colors"
              [class.bg-white]="analyticsService.selectedRange() === '14d'"
              [class.dark:bg-slate-700]="analyticsService.selectedRange() === '14d'"
              [class.text-indigo-600]="analyticsService.selectedRange() === '14d'"
              [class.shadow-xs]="analyticsService.selectedRange() === '14d'"
              [class.text-slate-500]="analyticsService.selectedRange() !== '14d'"
            >
              14 Hari
            </button>
            <button
              (click)="onRangeChange('30d')"
              class="px-3 py-1.5 rounded-lg transition-colors"
              [class.bg-white]="analyticsService.selectedRange() === '30d'"
              [class.dark:bg-slate-700]="analyticsService.selectedRange() === '30d'"
              [class.text-indigo-600]="analyticsService.selectedRange() === '30d'"
              [class.shadow-xs]="analyticsService.selectedRange() === '30d'"
              [class.text-slate-500]="analyticsService.selectedRange() !== '30d'"
            >
              30 Hari
            </button>
          </div>
        </div>
      </div>

      <!-- KPI Metrics Row -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
        @for (card of analyticsService.kpiCards(); track card.title) {
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 p-5 flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-slate-500 dark:text-slate-400">
                {{ card.title }}
              </span>
              <span
                class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                [class.bg-emerald-100]="card.isPositive"
                [class.text-emerald-700]="card.isPositive"
                [class.bg-rose-100]="!card.isPositive"
                [class.text-rose-700]="!card.isPositive"
              >
                @if (card.isPositive) {
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                  </svg>
                } @else {
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path>
                  </svg>
                }
                <span>{{ card.delta }}</span>
              </span>
            </div>

            <div class="mt-4">
              <div class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {{ card.value }}
                @if (card.unit) {
                  <span class="text-lg font-normal text-slate-500 ml-1">{{ card.unit }}</span>
                }
              </div>
              <p class="text-xs text-slate-400 mt-1">
                {{ card.sublabel }}
              </p>
            </div>
          </div>
        }
      </div>

      <!-- Main Traffic Chart Container -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">
              Traffic 2 Minggu Terakhir (Views & Growth)
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">
              Data terintegrasi dari YouTube Analytics API & Meta Insights
            </p>
          </div>
          <div class="flex items-center space-x-4 text-xs font-medium">
            <span class="flex items-center space-x-1.5 text-indigo-600 dark:text-indigo-400">
              <span class="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              <span>Views</span>
            </span>
            <span class="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Subscribers</span>
            </span>
          </div>
        </div>

        <!-- Stylish Chart Visualizer & Placeholder -->
        <div class="relative min-h-[18rem] w-full bg-slate-50/75 dark:bg-slate-900/50 rounded-xl p-4 flex flex-col justify-end border border-slate-100 dark:border-slate-800">
          @if (analyticsService.trafficData().length > 0) {
            <!-- Background Grid Lines -->
            <div class="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none opacity-20 dark:opacity-10">
              <div class="border-b border-slate-400 w-full"></div>
              <div class="border-b border-slate-400 w-full"></div>
              <div class="border-b border-slate-400 w-full"></div>
              <div class="border-b border-slate-400 w-full"></div>
            </div>

            <!-- SVG Smooth Area Curve & Line -->
            <svg class="w-full h-48 overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 200">
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.35"/>
                  <stop offset="100%" stop-color="#4f46e5" stop-opacity="0.0"/>
                </linearGradient>
              </defs>
              <!-- Area Fill -->
              <path
                d="M 20,150 Q 120,130 220,90 T 420,110 T 620,40 L 680,20 L 680,200 L 20,200 Z"
                fill="url(#viewsGradient)"
              />
              <!-- Line Stroke -->
              <path
                d="M 20,150 Q 120,130 220,90 T 420,110 T 620,40 L 680,20"
                fill="none"
                stroke="#4f46e5"
                stroke-width="3.5"
                stroke-linecap="round"
              />
              <!-- Secondary Line (Subs) -->
              <path
                d="M 20,180 Q 120,165 220,140 T 420,150 T 620,110 L 680,95"
                fill="none"
                stroke="#10b981"
                stroke-width="2.5"
                stroke-dasharray="4 4"
                stroke-linecap="round"
              />
            </svg>

            <!-- X-Axis Labels -->
            <div class="flex justify-between pt-3 text-[11px] font-mono text-slate-400">
              @for (point of analyticsService.trafficData(); track point.date) {
                <span>{{ point.date }}</span>
              }
            </div>
          } @else {
            <div class="h-56 flex flex-col items-center justify-center text-center p-6 my-auto">
              <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-500 mb-2.5">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Belum Ada Riwayat Traffic</p>
              <p class="text-xs text-slate-400 mt-1 max-w-sm">
                Metrik grafik akan muncul setelah video yang disetujui terdistribusi dan memperoleh penayangan di platform.
              </p>
            </div>
          }
        </div>
      </div>

      <!-- Top 5 Videos Table -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
        <div class="p-6 border-b border-slate-100 dark:border-slate-700/60">
          <h3 class="text-base font-bold text-slate-900 dark:text-white">
            Top 5 Video dengan Retensi Tertinggi
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">
            Konten dengan performa views dan engagement audiens terbaik
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-100/75 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs uppercase font-semibold">
              <tr>
                <th class="py-3 px-6">Video</th>
                <th class="py-3 px-4">Platform</th>
                <th class="py-3 px-4 text-right">Views</th>
                <th class="py-3 px-4 text-right">Likes</th>
                <th class="py-3 px-4 text-right">Retensi</th>
                <th class="py-3 px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
              @for (vid of analyticsService.topVideos(); track vid.id) {
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                  <td class="py-3.5 px-6">
                    <div class="flex items-center space-x-3">
                      <img
                        [src]="vid.thumbnailUrl"
                        [alt]="vid.title"
                        class="w-8 h-12 rounded object-cover shadow-xs shrink-0"
                      />
                      <span class="font-medium text-slate-900 dark:text-white line-clamp-1 max-w-xs">
                        {{ vid.title }}
                      </span>
                    </div>
                  </td>

                  <td class="py-3.5 px-4 font-semibold text-xs text-slate-600 dark:text-slate-300">
                    {{ vid.platform.toUpperCase() }}
                  </td>

                  <td class="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {{ vid.views.toLocaleString('id-ID') }}
                  </td>

                  <td class="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                    {{ vid.likes.toLocaleString('id-ID') }}
                  </td>

                  <td class="py-3.5 px-4 text-right font-mono font-semibold text-emerald-600">
                    {{ vid.retentionPercent }}%
                  </td>

                  <td class="py-3.5 px-6 text-center">
                    <app-status-badge [status]="vid.status"></app-status-badge>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="py-10 text-center text-slate-400">
                    <div class="flex flex-col items-center justify-center space-y-1">
                      <svg class="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p class="text-sm font-medium text-slate-600 dark:text-slate-400">Belum ada video terbit</p>
                      <p class="text-xs text-slate-400">Jadwalkan dan terbitkan video untuk melihat analitik retensi dan performa di sini.</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class AnalyticsDashboardComponent {
  analyticsService = inject(AnalyticsService);
  private toastService = inject(ToastService);

  onPlatformChange(platform: string) {
    this.analyticsService.selectedPlatform.set(platform);
    this.analyticsService.onFilterChange();
  }

  onRangeChange(range: '7d' | '14d' | '30d') {
    this.analyticsService.selectedRange.set(range);
    this.analyticsService.onFilterChange();
  }

  async onSyncMetrics() {
    this.toastService.info('Sedang menarik metrik tayangan terbaru dari YouTube...');
    const res = await this.analyticsService.syncYouTube();
    if (res.success) {
      this.toastService.success(res.message);
    } else {
      this.toastService.warning(res.message);
    }
  }
}
