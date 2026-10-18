import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VideoService } from '../../../core/services/video.service';
import { ApiService, ConflictSimulationResponse } from '../../../core/services/api.service';
import { Video } from '../../../core/models/video.models';
import { VideoCardComponent } from '../../../shared/components/video-card/video-card.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';

@Component({
  selector: 'app-review-queue',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VideoCardComponent,
    EmptyStateComponent,
    ActionButtonComponent
  ],
  template: `
    <div class="flex flex-col gap-6 sm:gap-8">
      <!-- Header Section -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center space-x-3">
            <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Review Queue
            </h2>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
              {{ videoService.pendingCount() }} Menunggu Tindakan Anda
            </span>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Daftar video vertikal hasil automasi yang memerlukan approval berjenjang sebelum publikasi.
          </p>
        </div>

        <!-- Action Controls -->
        <div class="flex flex-wrap items-center gap-2.5">
          <!-- Live Race Simulation Button -->
          <button
            (click)="runRaceSimulation()"
            [disabled]="isSimulating()"
            class="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-purple-200 dark:border-purple-800/80 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-colors shadow-sm disabled:opacity-50"
            title="Uji coba benturan approval simultan di database"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            <span>{{ isSimulating() ? 'Menguji...' : 'Uji Anti-Race Cond' }}</span>
          </button>

          <!-- Generate Video Button -->
          <button
            (click)="isGenerateModalOpen.set(true)"
            class="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-sm shadow-red-500/25 transition-all"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            <span>Generate Video</span>
          </button>

          <!-- Mobile Filter Toggle Button -->
          <div class="sm:hidden">
            <button
              (click)="isMobileFilterOpen.set(!isMobileFilterOpen())"
              class="flex items-center justify-center p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Simulation Banner / Result Toast -->
      @if (simulationResult()) {
        <div class="p-4 rounded-2xl border border-purple-200 dark:border-purple-800/80 bg-purple-50/90 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 shadow-sm transition-all">
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <div class="font-bold text-sm flex items-center space-x-2">
                <span>🛡️ Hasil Pengujian Database Lock Concurrency</span>
              </div>
              <p class="text-xs text-purple-700 dark:text-purple-300">
                {{ simulationResult()?.summary }}
              </p>
              <div class="mt-2 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900/50">
                <div>
                  <span class="font-semibold">{{ simulationResult()?.actor1?.name }}:</span>
                  <span class="text-emerald-600 dark:text-emerald-400 font-bold ml-1">Status {{ simulationResult()?.actor1?.statusCode }} (OK)</span>
                  <div class="text-[11px] text-slate-500">{{ simulationResult()?.actor1?.message }}</div>
                </div>
                <div>
                  <span class="font-semibold">{{ simulationResult()?.actor2?.name }}:</span>
                  <span class="text-rose-600 dark:text-rose-400 font-bold ml-1">Status {{ simulationResult()?.actor2?.statusCode }} (409 Conflict)</span>
                  <div class="text-[11px] text-slate-500">{{ simulationResult()?.actor2?.message }}</div>
                </div>
              </div>
            </div>
            <button (click)="simulationResult.set(null)" class="text-purple-400 hover:text-purple-600 p-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>
      }

      <!-- Filter Bar (Desktop Always, Mobile Drawer/Toggle) -->
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700/80 transition-all"
        [class.hidden]="!isMobileFilterOpen() && isSmallScreen()"
        [class.block]="isMobileFilterOpen() || !isSmallScreen()"
      >
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
          <!-- Search Input -->
          <div class="sm:col-span-8 relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input
              type="text"
              [ngModel]="videoService.searchQuery()"
              (ngModelChange)="videoService.searchQuery.set($event)"
              placeholder="Cari judul atau naskah video..."
              class="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
          </div>

          <!-- Status Filter -->
          <div class="sm:col-span-4">
            <select
              [ngModel]="videoService.statusFilter()"
              (ngModelChange)="videoService.statusFilter.set($event)"
              aria-label="Filter status video"
              class="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Video Grid List -->
      @if (isLoading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          @for (item of [1, 2, 3, 4, 5, 6]; track item) {
            <div class="bg-white dark:bg-slate-800 rounded-2xl h-80 animate-pulse border border-slate-200/60 dark:border-slate-700/60"></div>
          }
        </div>
      } @else if (videoService.filteredVideos().length === 0) {
        <app-empty-state
          [title]="videoService.pendingCount() === 0 ? 'Semua Video Beres Direview!' : 'Tidak Ada Video yang Sesuai'"
          [description]="videoService.pendingCount() === 0 ? 'Tidak ada video yang membutuhkan review pada level akun Anda saat ini. Video lain mungkin sedang menunggu tindakan dari reviewer level berbeda.' : 'Coba ubah kata kunci pencarian, filter status, atau filter level peninjauan.'"
        >
          <app-action-button
            variant="ghost"
            size="sm"
            (clicked)="resetFilters()"
          >
            Reset Semua Filter
          </app-action-button>
        </app-empty-state>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          @for (video of videoService.filteredVideos(); track video.id) {
            <app-video-card
              [video]="video"
              (reviewClicked)="onNavigateToDetail($event)"
            ></app-video-card>
          }
        </div>
      }
    </div>

    <!-- Generate Video AI Modal (Placed outside space-y-6 container) -->
    @if (isGenerateModalOpen()) {
      <div class="fixed inset-0 !m-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
        <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
          <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div class="flex items-center space-x-2.5">
              <div class="p-2 bg-red-100 dark:bg-red-950/60 text-red-600 rounded-xl">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white">Generate Video Baru</h3>
                <p class="text-xs text-slate-500">Pipeline BullMQ + FFmpeg 9:16 otomatis</p>
              </div>
            </div>
            <button (click)="isGenerateModalOpen.set(false)" class="text-slate-400 hover:text-slate-600 p-1">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Topik / Ide Utama Video</label>
              <input
                type="text"
                [(ngModel)]="newTopic"
                placeholder="Contoh: 5 Rahasia Algoritma YouTube Shorts 2026"
                class="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Naskah Hook / Sinopsis Singkat (Opsional)</label>
              <textarea
                [(ngModel)]="newScript"
                rows="3"
                placeholder="Biarkan kosong untuk auto-generate naskah otomatis..."
                class="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Target Platform Publikasi</label>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <label class="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="targetYouTube" class="rounded text-red-600 focus:ring-red-500" />
                  <span class="font-medium text-slate-700 dark:text-slate-200">YouTube Shorts</span>
                </label>
                <label class="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="targetInstagram" class="rounded text-red-600 focus:ring-red-500" />
                  <span class="font-medium text-slate-700 dark:text-slate-200">Instagram Reels</span>
                </label>
                <label class="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="targetTikTok" class="rounded text-red-600 focus:ring-red-500" />
                  <span class="font-medium text-slate-700 dark:text-slate-200">TikTok Video</span>
                </label>
                <label class="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="targetFacebook" class="rounded text-red-600 focus:ring-red-500" />
                  <span class="font-medium text-slate-700 dark:text-slate-200">Facebook Reels</span>
                </label>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              (click)="isGenerateModalOpen.set(false)"
              class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              (click)="submitGenerateVideo()"
              [disabled]="isGenerating() || !newTopic"
              class="px-5 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              @if (isGenerating()) {
                <svg class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>Memproses FFmpeg...</span>
              } @else {
                <span>Mulai Render Video</span>
              }
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ReviewQueueComponent {
  videoService = inject(VideoService);
  apiService = inject(ApiService);
  router = inject(Router);

  isLoading = signal<boolean>(false);
  isMobileFilterOpen = signal<boolean>(false);

  // Generate Modal & Form State
  isGenerateModalOpen = signal<boolean>(false);
  isGenerating = signal<boolean>(false);
  newTopic = '5 Trik Rahasia Coding Cepat dengan AI di 2026';
  newScript = '';
  targetYouTube = true;
  targetInstagram = true;
  targetTikTok = false;
  targetFacebook = false;

  // Race Simulation State
  isSimulating = signal<boolean>(false);
  simulationResult = signal<ConflictSimulationResponse | null>(null);

  isSmallScreen(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 640;
  }

  onNavigateToDetail(video: Video) {
    this.router.navigate(['/review', video.id]);
  }

  resetFilters() {
    this.videoService.searchQuery.set('');
    this.videoService.statusFilter.set('all');
    this.videoService.levelFilter.set('all');
  }

  async runRaceSimulation() {
    this.isSimulating.set(true);
    try {
      const res = await this.apiService.simulateConflict();
      this.simulationResult.set(res);
      await this.videoService.loadFromApi();
    } catch (err: unknown) {
      console.error('Race simulation error:', err);
    } finally {
      this.isSimulating.set(false);
    }
  }

  async submitGenerateVideo() {
    if (!this.newTopic) return;

    this.isGenerating.set(true);
    const platforms: string[] = [];
    if (this.targetYouTube) platforms.push('youtube');
    if (this.targetInstagram) platforms.push('instagram');
    if (this.targetTikTok) platforms.push('tiktok');
    if (this.targetFacebook) platforms.push('facebook');

    try {
      await this.apiService.generateVideo({
        topic: this.newTopic,
        script: this.newScript || undefined,
        platforms
      });

      // Close modal and wait briefly for worker to complete render
      this.isGenerateModalOpen.set(false);
      setTimeout(async () => {
        await this.videoService.loadFromApi();
      }, 2500);
    } catch (err) {
      console.error('Video generation error:', err);
    } finally {
      this.isGenerating.set(false);
    }
  }
}
