import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScheduleService } from '../../../core/services/schedule.service';
import { VideoService } from '../../../core/services/video.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ScheduleItem, ScheduleStatus } from '../../../core/models/schedule.models';
import { PlatformType } from '../../../core/models/video.models';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-schedule-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionButtonComponent, EmptyStateComponent],
  template: `
    <div class="flex flex-col gap-6 sm:gap-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Jadwal Upload
          </h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pengaturan antrian publikasi otomatis ke YouTube Shorts, Instagram Reels, Facebook Reels, dan TikTok.
          </p>
        </div>

        <app-action-button
          variant="primary"
          (clicked)="openScheduleModal()"
        >
          <span class="flex items-center space-x-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            <span>Jadwalkan Video</span>
          </span>
        </app-action-button>
      </div>

      <!-- Tabs Navigation -->
      <div class="border-b border-slate-200 dark:border-slate-700">
        <nav class="flex space-x-6">
          <button
            (click)="activeTab.set('upcoming')"
            class="pb-3 text-sm font-semibold transition-colors relative"
            [class.text-indigo-600]="activeTab() === 'upcoming'"
            [class.dark:text-indigo-400]="activeTab() === 'upcoming'"
            [class.text-slate-500]="activeTab() !== 'upcoming'"
          >
            Akan Datang ({{ upcomingSchedules().length }})
            @if (activeTab() === 'upcoming') {
              <span class="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>
            }
          </button>

          <button
            (click)="activeTab.set('completed')"
            class="pb-3 text-sm font-semibold transition-colors relative"
            [class.text-indigo-600]="activeTab() === 'completed'"
            [class.dark:text-indigo-400]="activeTab() === 'completed'"
            [class.text-slate-500]="activeTab() !== 'completed'"
          >
            Sudah Terbit ({{ completedSchedules().length }})
            @if (activeTab() === 'completed') {
              <span class="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>
            }
          </button>

          <button
            (click)="activeTab.set('failed')"
            class="pb-3 text-sm font-semibold transition-colors relative"
            [class.text-indigo-600]="activeTab() === 'failed'"
            [class.dark:text-indigo-400]="activeTab() === 'failed'"
            [class.text-slate-500]="activeTab() !== 'failed'"
          >
            Gagal ({{ failedSchedules().length }})
            @if (activeTab() === 'failed') {
              <span class="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>
            }
          </button>
        </nav>
      </div>

      <!-- Content Area with Generous Spacing from Tabs -->
      <div class="pt-2">
        @if (currentList().length === 0) {
        <app-empty-state
          [title]="getEmptyTitle()"
          [description]="getEmptyDesc()"
        >
          @if (activeTab() === 'upcoming') {
            <app-action-button variant="primary" size="sm" (clicked)="openScheduleModal()">
              Jadwalkan Sekarang
            </app-action-button>
          }
        </app-empty-state>
      } @else {
        <!-- Desktop Table View -->
        <div class="hidden md:block bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-100/75 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs uppercase font-semibold">
              <tr>
                <th class="py-3.5 px-6">Video</th>
                <th class="py-3.5 px-4">Platform</th>
                <th class="py-3.5 px-4">Waktu Publikasi</th>
                <th class="py-3.5 px-4">Status</th>
                <th class="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
              @for (item of currentList(); track item.id) {
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                  <!-- Video Info -->
                  <td class="py-4 px-6">
                    <div class="flex items-center space-x-3">
                      <img
                        [src]="item.thumbnailUrl"
                        [alt]="item.videoTitle"
                        class="w-10 h-16 rounded object-cover shadow-xs shrink-0"
                      />
                      <span class="font-medium text-slate-900 dark:text-white line-clamp-2 max-w-sm">
                        {{ item.videoTitle }}
                      </span>
                    </div>
                  </td>

                  <!-- Platform Badge -->
                  <td class="py-4 px-4">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
                      [class]="getPlatformClass(item.platform)"
                    >
                      {{ item.platform.toUpperCase() }}
                    </span>
                  </td>

                  <!-- Scheduled Time -->
                  <td class="py-4 px-4 text-slate-600 dark:text-slate-300">
                    <div class="font-medium">{{ formatDateTime(item.scheduledAt) }}</div>
                    <div class="text-[11px] text-slate-400">Otomatis via Worker</div>
                  </td>

                  <!-- Status -->
                  <td class="py-4 px-4">
                    @if (item.status === 'queued') {
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                        <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5 animate-pulse"></span>
                        Dalam Antrian
                      </span>
                    } @else if (item.status === 'completed') {
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                        Terbit
                      </span>
                    } @else {
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700" [title]="item.errorMessage || ''">
                        <span class="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
                        Gagal
                      </span>
                    }
                  </td>

                  <!-- Actions -->
                  <td class="py-4 px-6 text-right space-x-2">
                    @if (item.status === 'queued') {
                      <button
                        (click)="onCancelSchedule(item)"
                        class="text-xs font-medium text-rose-600 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        Batalkan
                      </button>
                    } @else if (item.status === 'failed') {
                      <button
                        (click)="onRetrySchedule(item)"
                        class="text-xs font-medium text-indigo-600 hover:text-indigo-700 p-1.5 rounded hover:bg-indigo-50"
                      >
                        Ulangi
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mobile Card List View -->
        <div class="md:hidden space-y-3.5">
          @for (item of currentList(); track item.id) {
            <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <div class="flex items-start space-x-3">
                <img
                  [src]="item.thumbnailUrl"
                  [alt]="item.videoTitle"
                  class="w-12 h-20 rounded object-cover shadow-xs shrink-0"
                />
                <div class="flex-1">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold mb-1"
                    [class]="getPlatformClass(item.platform)"
                  >
                    {{ item.platform.toUpperCase() }}
                  </span>
                  <h4 class="font-medium text-sm text-slate-900 dark:text-white line-clamp-2">
                    {{ item.videoTitle }}
                  </h4>
                  <div class="text-xs text-slate-500 mt-1">
                    {{ formatDateTime(item.scheduledAt) }}
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
                <div>
                  <span class="text-slate-400">Status: </span>
                  <span class="font-semibold capitalize text-slate-700 dark:text-slate-300">{{ item.status }}</span>
                </div>
                @if (item.status === 'queued') {
                  <button
                    (click)="onCancelSchedule(item)"
                    class="text-xs font-medium text-rose-600 hover:underline"
                  >
                    Batalkan
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
      </div>
    </div>

    <!-- Modal: Tambah Jadwal Video -->
    @if (isScheduleModalOpen()) {
      <div
        class="fixed inset-0 !m-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all duration-200"
        (click)="isScheduleModalOpen.set(false)"
      >
          <div
            class="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">
                Jadwalkan Video Baru
              </h3>
              <button
                (click)="isScheduleModalOpen.set(false)"
                class="text-slate-400 hover:text-slate-600 p-1"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div class="space-y-4">
              <!-- Select Video Approved -->
              <div>
                <label class="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                  Pilih Video yang Disetujui (Approved)
                </label>
                <select
                  [(ngModel)]="selectedVideoId"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  @for (vid of approvedVideos(); track vid.id) {
                    <option [value]="vid.id">
                      {{ vid.title }}
                    </option>
                  }
                </select>
              </div>

              <!-- Platforms Checkboxes -->
              <div>
                <label class="block text-xs font-semibold uppercase text-slate-500 mb-2">
                  Target Platform Distribusi
                </label>
                <div class="grid grid-cols-2 gap-2.5">
                  <label class="flex items-center space-x-2 text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="targetPlatforms.youtube" class="rounded text-indigo-600 focus:ring-indigo-500" />
                    <span class="font-medium text-slate-800 dark:text-slate-200">YouTube Shorts</span>
                  </label>
                  <label class="flex items-center space-x-2 text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="targetPlatforms.instagram" class="rounded text-indigo-600 focus:ring-indigo-500" />
                    <span class="font-medium text-slate-800 dark:text-slate-200">Instagram Reels</span>
                  </label>
                  <label class="flex items-center space-x-2 text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="targetPlatforms.facebook" class="rounded text-indigo-600 focus:ring-indigo-500" />
                    <span class="font-medium text-slate-800 dark:text-slate-200">Facebook Reels</span>
                  </label>
                  <label class="flex items-center space-x-2 text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="targetPlatforms.tiktok" class="rounded text-indigo-600 focus:ring-indigo-500" />
                    <span class="font-medium text-slate-800 dark:text-slate-200">TikTok (Draft)</span>
                  </label>
                </div>
              </div>

              <!-- Date Time Picker -->
              <div>
                <label class="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                  Tanggal & Waktu Tayang
                </label>
                <input
                  type="datetime-local"
                  [(ngModel)]="scheduleDateTime"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <!-- Footer Buttons -->
            <div class="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <app-action-button
                variant="ghost"
                (clicked)="isScheduleModalOpen.set(false)"
              >
                Batal
              </app-action-button>
              <app-action-button
                variant="primary"
                (clicked)="onSaveSchedule()"
              >
                Simpan Jadwal
              </app-action-button>
            </div>
          </div>
        </div>
      }
  `
})
export class ScheduleListComponent {
  scheduleService = inject(ScheduleService);
  videoService = inject(VideoService);
  toastService = inject(ToastService);

  activeTab = signal<'upcoming' | 'completed' | 'failed'>('upcoming');
  isScheduleModalOpen = signal<boolean>(false);

  selectedVideoId = '';
  scheduleDateTime = this.getDefaultScheduleDateTime();
  targetPlatforms = {
    youtube: true,
    instagram: true,
    facebook: false,
    tiktok: true
  };

  getDefaultScheduleDateTime(): string {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  approvedVideos = computed(() => {
    return this.videoService.videos().filter(v => v.status === 'approved' || v.status === 'scheduled');
  });

  upcomingSchedules = computed(() =>
    this.scheduleService.schedules().filter(s => s.status === 'queued')
  );

  completedSchedules = computed(() =>
    this.scheduleService.schedules().filter(s => s.status === 'completed')
  );

  failedSchedules = computed(() =>
    this.scheduleService.schedules().filter(s => s.status === 'failed')
  );

  currentList = computed(() => {
    const tab = this.activeTab();
    if (tab === 'upcoming') return this.upcomingSchedules();
    if (tab === 'completed') return this.completedSchedules();
    return this.failedSchedules();
  });

  openScheduleModal() {
    this.scheduleDateTime = this.getDefaultScheduleDateTime();
    const list = this.approvedVideos();
    if (list.length > 0) {
      this.selectedVideoId = list[0].id;
    }
    this.isScheduleModalOpen.set(true);
  }

  onSaveSchedule() {
    const vid = this.approvedVideos().find(v => v.id === this.selectedVideoId);
    if (!vid) {
      this.toastService.warning('Pilih video yang valid terlebih dahulu.');
      return;
    }

    const platforms: PlatformType[] = [];
    if (this.targetPlatforms.youtube) platforms.push('youtube');
    if (this.targetPlatforms.instagram) platforms.push('instagram');
    if (this.targetPlatforms.facebook) platforms.push('facebook');
    if (this.targetPlatforms.tiktok) platforms.push('tiktok');

    if (platforms.length === 0) {
      this.toastService.warning('Pilih minimal 1 target platform.');
      return;
    }

    this.scheduleService.addSchedule(
      vid.id,
      vid.title,
      vid.thumbnailUrl,
      platforms,
      new Date(this.scheduleDateTime).toISOString()
    );

    this.isScheduleModalOpen.set(false);
    this.toastService.success(`Jadwal berhasil ditambahkan untuk ${platforms.length} platform.`);
  }

  onCancelSchedule(item: ScheduleItem) {
    this.scheduleService.cancelSchedule(item.id);
    this.toastService.info(`Jadwal untuk ${item.platform.toUpperCase()} dibatalkan.`);
  }

  onRetrySchedule(item: ScheduleItem) {
    this.toastService.success(`Pekerjaan antrian upload ${item.platform.toUpperCase()} dikirim ulang.`);
  }

  getEmptyTitle(): string {
    if (this.activeTab() === 'upcoming') return 'Belum Ada Jadwal Upload';
    if (this.activeTab() === 'completed') return 'Belum Ada Video yang Terbit';
    return 'Tidak Ada Upload yang Gagal';
  }

  getEmptyDesc(): string {
    if (this.activeTab() === 'upcoming') return 'Semua antrian telah diproses. Anda dapat menambahkan jadwal baru dari video yang telah disetujui.';
    if (this.activeTab() === 'completed') return 'Video yang telah berhasil dipublikasikan oleh worker akan muncul di sini.';
    return 'Semua pipeline upload berjalan lancar tanpa kendala error.';
  }

  getPlatformClass(platform: PlatformType): string {
    switch (platform) {
      case 'youtube':
        return 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400';
      case 'instagram':
        return 'bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400';
      case 'facebook':
        return 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400';
      case 'tiktok':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
    }
  }

  formatDateTime(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
