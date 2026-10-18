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

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  schedules: ScheduleItem[];
}

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

        <div class="flex items-center space-x-3">
          <!-- View Switcher -->
          <div class="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center">
            <button
              (click)="viewMode.set('list')"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5"
              [class.bg-white]="viewMode() === 'list'"
              [class.dark:bg-slate-700]="viewMode() === 'list'"
              [class.text-indigo-600]="viewMode() === 'list'"
              [class.dark:text-indigo-300]="viewMode() === 'list'"
              [class.shadow-xs]="viewMode() === 'list'"
              [class.text-slate-500]="viewMode() !== 'list'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
              <span>List</span>
            </button>
            <button
              (click)="viewMode.set('calendar')"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5"
              [class.bg-white]="viewMode() === 'calendar'"
              [class.dark:bg-slate-700]="viewMode() === 'calendar'"
              [class.text-indigo-600]="viewMode() === 'calendar'"
              [class.dark:text-indigo-300]="viewMode() === 'calendar'"
              [class.shadow-xs]="viewMode() === 'calendar'"
              [class.text-slate-500]="viewMode() !== 'calendar'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span>Kalender</span>
            </button>
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
      </div>

      <!-- VIEW MODE 1: LIST VIEW -->
      @if (viewMode() === 'list') {
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

        <!-- Content Area -->
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
            <div class="hidden md:block overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 shadow-xs">
              <table class="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead class="bg-slate-50 dark:bg-slate-700/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th scope="col" class="px-6 py-4">Video & Judul</th>
                    <th scope="col" class="px-6 py-4">Platform</th>
                    <th scope="col" class="px-6 py-4">Waktu Publikasi</th>
                    <th scope="col" class="px-6 py-4">Status</th>
                    <th scope="col" class="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
                  @for (item of currentList(); track item.id) {
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td class="px-6 py-4 flex items-center space-x-3.5">
                        <img
                          [src]="item.thumbnailUrl || item.videoThumbnail"
                          [alt]="item.videoTitle"
                          class="w-10 h-14 object-cover rounded-lg shrink-0 bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                        <div class="font-medium text-slate-900 dark:text-white line-clamp-2 max-w-xs">
                          {{ item.videoTitle }}
                        </div>
                      </td>

                      <td class="px-6 py-4">
                        <span
                          class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold"
                          [class]="getPlatformClass(item.platform)"
                        >
                          {{ item.platform.toUpperCase() }}
                        </span>
                      </td>

                      <td class="px-6 py-4 font-mono text-xs">
                        {{ formatDateTime(item.scheduledAt) }}
                      </td>

                      <td class="px-6 py-4">
                        @switch (item.status) {
                          @case ('queued') {
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                              <span class="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                              Menunggu Waktu
                            </span>
                          }
                          @case ('in_progress') {
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                              <span class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse"></span>
                              Sedang Diunggah
                            </span>
                          }
                          @case ('completed') {
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                              Berhasil Terbit
                            </span>
                          }
                          @case ('failed') {
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                              <span class="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
                              Gagal
                            </span>
                          }
                        }
                      </td>

                      <td class="px-6 py-4 text-right">
                        @if (item.status === 'queued') {
                          <button
                            (click)="onCancelSchedule(item)"
                            class="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
                          >
                            Batalkan
                          </button>
                        } @else if (item.status === 'failed') {
                          <button
                            (click)="onRetrySchedule(item)"
                            class="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Coba Lagi
                          </button>
                        } @else {
                          <span class="text-xs text-slate-400">-</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Mobile Card View -->
            <div class="grid grid-cols-1 gap-4 md:hidden">
              @for (item of currentList(); track item.id) {
                <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
                  <div class="flex items-start space-x-3">
                    <img
                      [src]="item.thumbnailUrl || item.videoThumbnail"
                      [alt]="item.videoTitle"
                      class="w-12 h-16 object-cover rounded-lg shrink-0 bg-slate-900 border border-slate-200"
                    />
                    <div class="flex-1">
                      <div class="flex items-center justify-between">
                        <span
                          class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold"
                          [class]="getPlatformClass(item.platform)"
                        >
                          {{ item.platform.toUpperCase() }}
                        </span>
                        <span class="text-xs font-mono text-slate-500">
                          {{ formatDateTime(item.scheduledAt) }}
                        </span>
                      </div>
                      <h4 class="text-sm font-semibold text-slate-900 dark:text-white mt-1 line-clamp-2">
                        {{ item.videoTitle }}
                      </h4>
                    </div>
                  </div>

                  <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <span class="text-xs font-medium capitalize text-slate-600 dark:text-slate-300">
                      Status: {{ item.status }}
                    </span>
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
      } @else {
        <!-- VIEW MODE 2: CALENDAR GRID VIEW -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-5">
          <!-- Calendar Header & Navigation -->
          <div class="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
            <div class="flex items-center space-x-3">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">
                {{ getMonthYearTitle() }}
              </h3>
              <button
                (click)="todayMonth()"
                class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-all"
              >
                Hari Ini
              </button>
            </div>

            <div class="flex items-center space-x-2">
              <button
                (click)="prevMonth()"
                class="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all"
                title="Bulan sebelumnya"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
              </button>
              <button
                (click)="nextMonth()"
                class="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all"
                title="Bulan berikutnya"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>
          </div>

          <!-- Weekday Headers -->
          <div class="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
            <div>Sen</div>
            <div>Sel</div>
            <div>Rab</div>
            <div>Kam</div>
            <div>Jum</div>
            <div>Sab</div>
            <div>Min</div>
          </div>

          <!-- Calendar Grid Days -->
          <div class="grid grid-cols-7 gap-2">
            @for (day of calendarDays(); track day.date.toISOString()) {
              <div
                (click)="onSelectCalendarDay(day.date)"
                class="min-h-24 sm:min-h-28 p-2 rounded-xl border transition-all flex flex-col justify-between cursor-pointer group"
                [class.bg-white]="day.isCurrentMonth"
                [class.dark:bg-slate-800/80]="day.isCurrentMonth"
                [class.border-slate-200]="day.isCurrentMonth && !day.isToday"
                [class.dark:border-slate-700]="day.isCurrentMonth && !day.isToday"
                [class.bg-slate-50]="!day.isCurrentMonth"
                [class.dark:bg-slate-900/40]="!day.isCurrentMonth"
                [class.border-slate-100]="!day.isCurrentMonth"
                [class.dark:border-slate-800]="!day.isCurrentMonth"
                [class.opacity-40]="!day.isCurrentMonth"
                [class.border-indigo-500]="day.isToday"
                [class.ring-2]="day.isToday"
                [class.ring-indigo-500/20]="day.isToday"
                [class.hover:border-indigo-400]="day.isCurrentMonth"
              >
                <div class="flex items-center justify-between">
                  <span
                    class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                    [class.bg-indigo-600]="day.isToday"
                    [class.text-white]="day.isToday"
                    [class.text-slate-700]="!day.isToday && day.isCurrentMonth"
                    [class.dark:text-slate-300]="!day.isToday && day.isCurrentMonth"
                    [class.text-slate-400]="!day.isCurrentMonth"
                  >
                    {{ day.dayNumber }}
                  </span>

                  <span class="opacity-0 group-hover:opacity-100 text-[10px] text-indigo-600 font-semibold transition-opacity hidden sm:inline">
                    + Jadwal
                  </span>
                </div>

                <!-- Scheduled Video Pills on this Day -->
                <div class="space-y-1 mt-1 overflow-hidden">
                  @for (sch of day.schedules; track sch.id) {
                    <div
                      class="px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center space-x-1"
                      [class.bg-emerald-50]="sch.status === 'completed'"
                      [class.text-emerald-700]="sch.status === 'completed'"
                      [class.dark:bg-emerald-950/50]="sch.status === 'completed'"
                      [class.dark:text-emerald-300]="sch.status === 'completed'"
                      [class.bg-amber-50]="sch.status === 'queued'"
                      [class.text-amber-700]="sch.status === 'queued'"
                      [class.dark:bg-amber-950/50]="sch.status === 'queued'"
                      [class.dark:text-amber-300]="sch.status === 'queued'"
                      [class.bg-rose-50]="sch.status === 'failed'"
                      [class.text-rose-700]="sch.status === 'failed'"
                      [title]="sch.videoTitle + ' (' + formatTimeOnly(sch.scheduledAt) + ')'"
                    >
                      <span class="font-bold font-mono">{{ formatTimeOnly(sch.scheduledAt) }}</span>
                      <span class="truncate">{{ sch.videoTitle }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
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

            <!-- Prime-Time Smart Presets -->
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                Preset Jam Prime-Time (Rekomendasi Terbaik)
              </label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  (click)="setPresetTime('12:00')"
                  class="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-400 text-xs text-slate-700 dark:text-slate-200 transition-all text-center"
                >
                  <span class="block font-bold">12:00 WIB</span>
                  <span class="text-[10px] text-slate-400">Makan Siang</span>
                </button>
                <button
                  type="button"
                  (click)="setPresetTime('17:30')"
                  class="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-400 text-xs text-slate-700 dark:text-slate-200 transition-all text-center"
                >
                  <span class="block font-bold">17:30 WIB</span>
                  <span class="text-[10px] text-slate-400">Pulang Kerja</span>
                </button>
                <button
                  type="button"
                  (click)="setPresetTime('20:00')"
                  class="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-400 text-xs text-slate-700 dark:text-slate-200 transition-all text-center"
                >
                  <span class="block font-bold">20:00 WIB</span>
                  <span class="text-[10px] text-slate-400">Prime Malam</span>
                </button>
              </div>
            </div>

            <!-- Date Time Picker -->
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                Tanggal & Waktu Tayang Kustom
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

  viewMode = signal<'list' | 'calendar'>('list');
  activeTab = signal<'upcoming' | 'completed' | 'failed'>('upcoming');
  isScheduleModalOpen = signal<boolean>(false);
  calendarMonth = signal<Date>(new Date());

  selectedVideoId = '';
  scheduleDateTime = this.getDefaultScheduleDateTime();
  targetPlatforms = {
    youtube: true,
    instagram: true,
    facebook: false,
    tiktok: true
  };

  getDefaultScheduleDateTime(targetDate?: Date): string {
    const d = targetDate ? new Date(targetDate) : new Date();
    if (!targetDate) {
      d.setMinutes(d.getMinutes() + 5);
    } else {
      d.setHours(18, 0, 0, 0);
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  setPresetTime(timeStr: string) {
    const cur = this.scheduleDateTime ? new Date(this.scheduleDateTime) : new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    cur.setHours(hours, minutes, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    this.scheduleDateTime = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}T${pad(cur.getHours())}:${pad(cur.getMinutes())}`;
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
    if (this.activeTab() === 'upcoming') return this.upcomingSchedules();
    if (this.activeTab() === 'completed') return this.completedSchedules();
    return this.failedSchedules();
  });

  // Calendar Calculation
  calendarDays = computed<CalendarDay[]>(() => {
    const activeDate = this.calendarMonth();
    const year = activeDate.getFullYear();
    const month = activeDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday as start of week (0 = Monday, ..., 6 = Sunday)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: CalendarDay[] = [];
    const today = new Date();
    const allSchedules = this.scheduleService.schedules();

    // Previous month padding days
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDate - i);
      days.push({
        date: d,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: this.isSameDay(d, today),
        schedules: this.getSchedulesForDay(d, allSchedules)
      });
    }

    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: this.isSameDay(d, today),
        schedules: this.getSchedulesForDay(d, allSchedules)
      });
    }

    // Next month padding days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: this.isSameDay(d, today),
        schedules: this.getSchedulesForDay(d, allSchedules)
      });
    }

    return days;
  });

  private isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  private getSchedulesForDay(date: Date, list: ScheduleItem[]): ScheduleItem[] {
    return list.filter(item => {
      const itemDate = new Date(item.scheduledAt);
      return this.isSameDay(date, itemDate);
    });
  }

  getMonthYearTitle(): string {
    return this.calendarMonth().toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric'
    });
  }

  prevMonth() {
    const cur = this.calendarMonth();
    this.calendarMonth.set(new Date(cur.getFullYear(), cur.getMonth() - 1, 1));
  }

  nextMonth() {
    const cur = this.calendarMonth();
    this.calendarMonth.set(new Date(cur.getFullYear(), cur.getMonth() + 1, 1));
  }

  todayMonth() {
    this.calendarMonth.set(new Date());
  }

  onSelectCalendarDay(date: Date) {
    this.openScheduleModal(date);
  }

  openScheduleModal(targetDate?: Date) {
    this.scheduleDateTime = this.getDefaultScheduleDateTime(targetDate);
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

  formatTimeOnly(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
