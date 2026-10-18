import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VideoService } from '../../../core/services/video.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Video, PlatformType } from '../../../core/models/video.models';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-review-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    StatusBadgeComponent,
    ActionButtonComponent,
    ConfirmModalComponent
  ],
  template: `
    @if (video(); as v) {
      <div class="space-y-6">
        <!-- Top Navigation -->
        <div class="flex items-center justify-between">
          <a
            routerLink="/review"
            class="inline-flex items-center space-x-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            <span>Kembali ke Review Queue</span>
          </a>

          <!-- Race condition simulation tester button for developer demo -->
          <div class="flex items-center space-x-2">
            @if (v.lockedBy) {
              <button
                (click)="onResetConflict()"
                class="text-xs px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition"
              >
                Reset Simulasi Konflik
              </button>
            } @else {
              <button
                (click)="onSimulateConflict()"
                class="text-xs px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/50 hover:bg-amber-200 transition"
                title="Simulasi benturan ketika reviewer lain (Farras) baru saja approve/reject di Telegram"
              >
                ⚡ Simulasi Benturan Telegram (Anti-Race Condition)
              </button>
            }
          </div>
        </div>

        <!-- Anti-Race Condition Conflict Warning Banner -->
        @if (v.lockedBy) {
          <div class="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border-l-4 border-amber-500 text-amber-900 dark:text-amber-200 flex items-start space-x-3 shadow-xs animate-in fade-in">
            <svg class="w-6 h-6 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <div>
              <h4 class="font-bold text-sm">Aksi Ditutup: Terjadi Perubahan Status Bersamaan</h4>
              <p class="text-xs mt-1 text-amber-800 dark:text-amber-300">
                Video ini sudah diproses oleh <strong>{{ v.lockedBy.userName }}</strong> (status: {{ v.lockedBy.action }}) {{ v.lockedBy.timestamp }}.
                Sistem database conditional lock telah mengunci aksi untuk menghindari duplikasi publikasi.
              </p>
            </div>
          </div>
        }

        <!-- Permission Level Notice Banner -->
        @if (v.status === 'pending_review' && !canReviewCurrentLevel()) {
          <div class="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/50 border-l-4 border-blue-500 text-blue-900 dark:text-blue-200 flex items-start space-x-3 shadow-xs">
            <svg class="w-6 h-6 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h4 class="font-bold text-sm">Mode Pratinjau (Read-Only)</h4>
              <p class="text-xs mt-1 text-blue-800 dark:text-blue-300">
                Video ini sedang menunggu <strong>Reviewer Level {{ v.currentLevel }}</strong>.
                Akun aktif Anda ({{ authService.currentUser()?.name }}) tidak memiliki wewenang untuk mengambil keputusan pada level ini.
              </p>
            </div>
          </div>
        }

        <!-- 2-Column Responsive Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <!-- Left Column (lg:col-span-7 or 8): Video Preview 9:16 & Script -->
          <div class="lg:col-span-7 xl:col-span-8 space-y-6">
            <!-- 9:16 Video Player Container -->
            <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col items-center">
              <div class="w-full max-w-sm">
                <!-- 9:16 Real HTML5 Player -->
                <div class="relative aspect-[9/16] w-full rounded-2xl overflow-hidden bg-slate-950 shadow-2xl flex items-center justify-center border border-slate-800">
                  @if (v.videoUrl) {
                    <video
                      #videoElement
                      [src]="v.videoUrl"
                      [poster]="v.thumbnailUrl"
                      controls
                      playsinline
                      preload="auto"
                      class="w-full h-full object-cover"
                      (play)="isPlaying.set(true)"
                      (pause)="isPlaying.set(false)"
                    ></video>
                  } @else {
                    <img
                      [src]="v.thumbnailUrl"
                      [alt]="v.title"
                      class="w-full h-full object-cover opacity-80"
                    />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex items-center justify-center">
                      <span class="text-xs text-white bg-black/60 px-3 py-1.5 rounded-xl">File video belum tersedia</span>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Script & Generation Prompt Accordion Card -->
            <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
              <div class="flex items-center justify-between cursor-pointer select-none" (click)="isScriptExpanded.set(!isScriptExpanded())">
                <div class="flex items-center space-x-2">
                  <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <h3 class="font-semibold text-slate-900 dark:text-slate-100">
                    Naskah & Narasi Voice Over (Script)
                  </h3>
                </div>
                <button class="text-slate-400 hover:text-slate-600 p-1">
                  <svg
                    class="w-5 h-5 transition-transform duration-200"
                    [class.rotate-180]="isScriptExpanded()"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
              </div>

              @if (isScriptExpanded()) {
                <div class="pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-4">
                  <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-serif">
                    "{{ v.script }}"
                  </div>

                  @if (v.promptUsed) {
                    <div>
                      <div class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        System Prompt AI:
                      </div>
                      <div class="p-3 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-xs text-slate-600 dark:text-slate-300 font-mono">
                        {{ v.promptUsed }}
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Approval Audit History Log -->
            <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
              <h3 class="font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Riwayat Audit Approval (Log)</span>
              </h3>

              @if (v.approvalHistory.length === 0) {
                <p class="text-xs text-slate-400 italic">
                  Belum ada log approval tercatat untuk video ini.
                </p>
              } @else {
                <div class="space-y-3">
                  @for (log of v.approvalHistory; track log.id) {
                    <div class="flex items-start space-x-3 text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/60 dark:border-slate-700/60">
                      <div
                        class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        [class.bg-emerald-100]="log.action === 'approve'"
                        [class.text-emerald-600]="log.action === 'approve'"
                        [class.bg-amber-100]="log.action === 'revision'"
                        [class.text-amber-600]="log.action === 'revision'"
                        [class.bg-rose-100]="log.action === 'reject'"
                        [class.text-rose-600]="log.action === 'reject'"
                      >
                        @if (log.action === 'approve') {
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        } @else if (log.action === 'revision') {
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                        } @else {
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        }
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center justify-between">
                          <span class="font-semibold text-slate-900 dark:text-slate-100">
                            {{ log.userName }} (Level {{ log.level }})
                          </span>
                          <span class="text-slate-400 text-[11px]">
                            {{ formatDateTime(log.createdAt) }}
                          </span>
                        </div>
                        <div class="mt-0.5 text-slate-600 dark:text-slate-300">
                          {{ log.note || 'Tidak ada catatan tambahan.' }}
                        </div>
                        <div class="mt-1 flex items-center space-x-2 text-[10px] text-slate-400">
                          <span>Channel: {{ log.channel === 'telegram' ? '🤖 Bot Telegram' : '💻 Web Dashboard' }}</span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Right Column (lg:col-span-5 or 4): Metadata & Action Stack (Sticky) -->
          <div class="lg:col-span-5 xl:col-span-4 sticky top-20 space-y-6">
            <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-5">
              <!-- Title & Status -->
              <div>
                <div class="flex items-center justify-between gap-2 mb-2">
                  <app-status-badge [status]="v.status"></app-status-badge>
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    Menunggu Level {{ v.currentLevel }}
                  </span>
                </div>
                <h2 class="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                  {{ v.title }}
                </h2>
              </div>

              <!-- Metadata List -->
              <div class="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                <div class="flex items-center justify-between">
                  <span class="text-slate-400">Dibuat Pada</span>
                  <span class="font-medium text-slate-800 dark:text-slate-200">{{ formatDateTime(v.createdAt) }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-400">Durasi Video</span>
                  <span class="font-medium text-slate-800 dark:text-slate-200">{{ v.durationSeconds }} Detik (9:16)</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-400">Kategori & B-Roll</span>
                  <span class="font-semibold text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80">
                    {{ getCategoryLabel(v.category) }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-400">Persyaratan Level</span>
                  <span class="font-medium text-slate-800 dark:text-slate-200">{{ v.requiredMaxLevel }} Tingkat (L1 & L2)</span>
                </div>
                <div class="pt-2">
                  <span class="text-slate-400 block mb-1.5">Target Platform Distribusi</span>
                  <div class="flex flex-wrap gap-1.5">
                    @for (p of v.platforms; track p) {
                      <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                        {{ p.toUpperCase() }}
                      </span>
                    }
                  </div>
                </div>

                <!-- YouTube Made for Kids Setting & Quick Toggle -->
                <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-slate-50/70 dark:bg-slate-800/60 space-y-2 mt-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-1.5">
                      <span class="text-sm">👶</span>
                      <span class="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">YouTube Kids (COPPA)</span>
                    </div>
                    <button
                      type="button"
                      (click)="toggleMadeForKids(v)"
                      [disabled]="v.status !== 'pending_review' || isUpdatingAudience()"
                      class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shadow-sm"
                      [class.bg-red-600]="v.isForKids"
                      [class.text-white]="v.isForKids"
                      [class.hover:bg-red-700]="v.isForKids"
                      [class.bg-slate-200]="!v.isForKids"
                      [class.dark:bg-slate-700]="!v.isForKids"
                      [class.text-slate-700]="!v.isForKids"
                      [class.dark:text-slate-300]="!v.isForKids"
                      [class.hover:bg-slate-300]="!v.isForKids"
                    >
                      {{ v.isForKids ? '✓ Khusus Anak' : 'Konten Umum' }}
                    </button>
                  </div>
                  <p class="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {{ v.isForKids ? 'Video ini akan dipublikasikan dengan tag "Made for Kids" di YouTube Shorts.' : 'Video ini dipublikasikan sebagai konten umum / bukan khusus anak-anak.' }}
                  </p>
                </div>
              </div>

              <!-- Divider -->
              <div class="border-t border-slate-100 dark:border-slate-700/60"></div>

              <!-- Role Permission Indicator Banner -->
              @if (!canReviewCurrentLevel()) {
                <div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                  🔒 Akun Anda saat ini (<strong>{{ authService.currentUser()?.name }}</strong>) tidak memiliki izin review untuk <strong>Level {{ v.currentLevel }}</strong>.
                  <span class="block mt-1 text-[11px] text-slate-400">Gunakan selector akun di sidebar untuk berganti persona.</span>
                </div>
              }

              <!-- Action Buttons Stack -->
              <div class="space-y-3 flex flex-col pt-1">
                <!-- Approve Button -->
                <app-action-button
                  variant="success"
                  size="lg"
                  [fullWidth]="true"
                  [disabled]="isActionDisabled()"
                  (clicked)="openConfirmModal('approve')"
                >
                  <span class="flex items-center justify-center space-x-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>
                      {{ v.currentLevel >= v.requiredMaxLevel ? 'Setujui Final (Approve)' : 'Setujui Level ' + v.currentLevel }}
                    </span>
                  </span>
                </app-action-button>

                <!-- Request Revision Button -->
                <button
                  type="button"
                  [disabled]="isActionDisabled()"
                  (click)="openConfirmModal('revision')"
                  class="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-700/40 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  <span>Minta Revisi (Feedback)</span>
                </button>

                <!-- Reject Button -->
                <app-action-button
                  variant="danger"
                  size="lg"
                  [fullWidth]="true"
                  [disabled]="isActionDisabled()"
                  (clicked)="openConfirmModal('reject')"
                >
                  <span class="flex items-center justify-center space-x-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    <span>Tolak Video (Reject)</span>
                  </span>
                </app-action-button>

                <!-- Edit Schedule Button -->
                <app-action-button
                  variant="ghost"
                  size="md"
                  [fullWidth]="true"
                  (clicked)="onEditSchedule()"
                >
                  <span class="flex items-center justify-center space-x-2">
                    <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span>Edit Jadwal Upload</span>
                  </span>
                </app-action-button>
              </div>

              <p class="text-[11px] text-center text-slate-400">
                Aksi peninjauan dicatat transparan di audit log database.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Confirm Modal with note input -->
      <app-confirm-modal
        [isOpen]="isModalOpen()"
        [title]="modalTitle()"
        [message]="modalMessage()"
        [confirmLabel]="modalConfirmLabel()"
        [variant]="modalVariant()"
        [showInput]="modalShowInput()"
        [inputLabel]="modalInputLabel()"
        [inputPlaceholder]="modalInputPlaceholder()"
        (confirmed)="onExecuteAction($event)"
        (cancelled)="isModalOpen.set(false)"
      ></app-confirm-modal>
    } @else {
      <div class="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200">
        <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-200">Video Tidak Ditemukan</h3>
        <p class="text-sm text-slate-500 mt-1">Video dengan ID ini mungkin sudah dihapus atau tidak valid.</p>
        <div class="mt-4">
          <a routerLink="/review" class="text-sm font-medium text-indigo-600 hover:underline">
            ← Kembali ke Review Queue
          </a>
        </div>
      </div>
    }
  `
})
export class ReviewDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  videoService = inject(VideoService);
  authService = inject(AuthService);
  toastService = inject(ToastService);

  videoId = signal<string>('');
  video = computed(() => this.videoService.getVideoById(this.videoId()));

  isPlaying = signal<boolean>(false);
  isScriptExpanded = signal<boolean>(true);
  isUpdatingAudience = signal<boolean>(false);

  // Modal state
  isModalOpen = signal<boolean>(false);
  pendingAction = signal<'approve' | 'reject' | 'revision'>('approve');

  modalTitle = computed(() => {
    if (this.pendingAction() === 'approve') return 'Konfirmasi Persetujuan Video';
    if (this.pendingAction() === 'revision') return 'Kirim Permintaan Revisi Video';
    return 'Konfirmasi Penolakan Video';
  });

  modalMessage = computed(() => {
    const v = this.video();
    if (!v) return '';
    if (this.pendingAction() === 'approve') {
      return `Apakah Anda yakin menyetujui video "${v.title}" untuk tahap ${v.currentLevel >= v.requiredMaxLevel ? 'publikasi final' : 'Level ' + (v.currentLevel + 1)}?`;
    }
    if (this.pendingAction() === 'revision') {
      return `Tuliskan catatan perbaikan atau feedback untuk video "${v.title}". Status video akan ditandai Perlu Revisi.`;
    }
    return `Apakah Anda yakin ingin menolak video "${v.title}"? Status akan berubah menjadi Ditolak.`;
  });

  modalConfirmLabel = computed(() => {
    if (this.pendingAction() === 'approve') return 'Ya, Setujui';
    if (this.pendingAction() === 'revision') return 'Kirim Catatan Revisi';
    return 'Ya, Tolak';
  });

  modalVariant = computed<'success' | 'danger' | 'warning'>(() => {
    if (this.pendingAction() === 'approve') return 'success';
    if (this.pendingAction() === 'revision') return 'warning';
    return 'danger';
  });

  modalShowInput = computed<boolean>(() => {
    return this.pendingAction() === 'revision' || this.pendingAction() === 'reject';
  });

  modalInputLabel = computed<string>(() => {
    return this.pendingAction() === 'revision' ? 'Catatan Perbaikan (Wajib)' : 'Alasan Penolakan (Opsional)';
  });

  modalInputPlaceholder = computed<string>(() => {
    return this.pendingAction() === 'revision'
      ? 'Contoh: Ubah hook naskah di 3 detik awal, perbaiki typo pada teks judul...'
      : 'Tuliskan alasan penolakan jika diperlukan...';
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.videoId.set(id);
        this.videoService.fetchVideoById(id);
      }
    });
  }

  canReviewCurrentLevel(): boolean {
    const v = this.video();
    if (!v) return false;
    return this.authService.canApproveAtLevel(v.currentLevel);
  }

  isActionDisabled(): boolean {
    const v = this.video();
    if (!v) return true;
    if (v.status !== 'pending_review') return true;
    if (v.lockedBy) return true;
    return !this.canReviewCurrentLevel();
  }

  openConfirmModal(action: 'approve' | 'reject' | 'revision') {
    this.pendingAction.set(action);
    this.isModalOpen.set(true);
  }

  async onExecuteAction(note?: string) {
    this.isModalOpen.set(false);
    const v = this.video();
    if (!v) return;

    if (this.pendingAction() === 'approve') {
      const result = await this.videoService.approveVideo(v.id, note);
      if (result.success) {
        this.toastService.success(result.message);
        this.router.navigate(['/review']);
      } else {
        this.toastService.error(result.message);
      }
    } else if (this.pendingAction() === 'revision') {
      const result = await this.videoService.requestRevision(v.id, note || 'Perlu revisi naskah/konten');
      if (result.success) {
        this.toastService.warning(result.message);
        this.router.navigate(['/review']);
      } else {
        this.toastService.error(result.message);
      }
    } else {
      const result = await this.videoService.rejectVideo(v.id, note || 'Ditolak via web dashboard');
      if (result.success) {
        this.toastService.error(result.message);
        this.router.navigate(['/review']);
      } else {
        this.toastService.error(result.message);
      }
    }
  }

  onEditSchedule() {
    this.router.navigate(['/schedule']);
  }

  onSimulateConflict() {
    const v = this.video();
    if (v) {
      this.videoService.simulateRaceCondition(v.id);
      this.toastService.warning('Simulasi benturan aktif: Video sekarang terkunci oleh aksi Telegram.');
    }
  }

  onResetConflict() {
    const v = this.video();
    if (v) {
      this.videoService.resetConflict(v.id);
      this.toastService.info('Simulasi benturan di-reset.');
    }
  }

  formatDateTime(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCategoryLabel(category?: string): string {
    switch (category) {
      case 'automotive': return '🚗 Otomotif & Mobil';
      case 'nature': return '🌿 Alam & Wisata';
      case 'technology': return '💻 Teknologi & Gadget';
      case 'city': return '🏙️ Kota & Urban';
      case 'kids': return '👶 Khusus Anak-Anak';
      default: return '🎯 Umum / Otomatis';
    }
  }

  async toggleMadeForKids(v: Video) {
    this.isUpdatingAudience.set(true);
    const nextState = !v.isForKids;
    const res = await this.videoService.updateAudienceSettings(v.id, nextState, v.category);
    if (res.success) {
      this.toastService.success(nextState ? 'Video ditandai khusus anak-anak (Made for Kids).' : 'Video diubah menjadi konten umum.');
    } else {
      this.toastService.error(res.message);
    }
    this.isUpdatingAudience.set(false);
  }
}
