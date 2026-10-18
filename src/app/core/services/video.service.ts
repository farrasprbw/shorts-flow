import { Injectable, signal, computed, inject } from '@angular/core';
import { Video, VideoStatus } from '../models/video.models';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private authService = inject(AuthService);
  private apiService = inject(ApiService);

  constructor() {
    this.loadFromApi();
  }

  async loadFromApi() {
    try {
      const res = await this.apiService.getVideos();
      if (res && res.success && Array.isArray(res.data)) {
        const liveVideos = res.data.map((v: Video) => ({
          ...v,
          approvalHistory: v.approvalHistory || []
        }));
        this._videos.set(liveVideos);
      }
    } catch (err) {
      console.warn('[VideoService] Cannot connect to API server:', err);
    }
  }

  // Live videos signal (cleared of dummy data; populated from PostgreSQL API)
  private readonly _videos = signal<Video[]>([]);

  public readonly videos = this._videos.asReadonly();

  // Filter signals
  public readonly searchQuery = signal<string>('');
  public readonly statusFilter = signal<string>('all');
  public readonly levelFilter = signal<string>('all');

  // Computed pending count for header (only counts videos actionable by current user)
  public readonly pendingCount = computed(() => {
    return this.filteredVideos().filter(v => v.status === 'pending_review').length;
  });

  // Filtered video list computed signal
  public readonly filteredVideos = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const st = this.statusFilter();
    const lvl = this.levelFilter();
    // Dependency on current user for reactive re-computation on user switch
    const curUser = this.authService.currentUser();

    return this._videos().filter(video => {
      // Strict role-level filtering:
      // Reviewer Level 1 (Michael) ONLY sees Level 1 videos!
      // Reviewer Level 2 (Farras / Sarah) ONLY sees Level 2 videos!
      const isL1 = curUser?.roles.includes('reviewer_level_1');
      const isL2 = curUser?.roles.includes('reviewer_level_2');

      if (isL1 && !isL2) {
        if (video.currentLevel !== 1) {
          return false;
        }
      } else if (isL2 && !isL1) {
        if (video.currentLevel !== 2) {
          return false;
        }
      }

      // Search matching
      const matchesSearch = !q || video.title.toLowerCase().includes(q) || video.script.toLowerCase().includes(q);

      // Status matching
      let matchesStatus = true;
      if (st === 'pending') {
        matchesStatus = video.status === 'pending_review';
      } else if (st === 'approved') {
        matchesStatus = video.status === 'approved';
      } else if (st === 'rejected') {
        matchesStatus = video.status === 'rejected';
      } else if (st !== 'all') {
        matchesStatus = video.status === st;
      }

      // Level matching
      let matchesLevel = true;
      if (lvl === 'L1') {
        matchesLevel = video.currentLevel === 1;
      } else if (lvl === 'L2') {
        matchesLevel = video.currentLevel === 2;
      }

      return matchesSearch && matchesStatus && matchesLevel;
    });
  });

  getVideoById(id: string): Video | undefined {
    return this._videos().find(v => v.id === id);
  }

  async fetchVideoById(id: string): Promise<Video | undefined> {
    try {
      const res = await this.apiService.getVideoById(id);
      if (res && res.success && res.data) {
        const v = res.data;
        this._videos.update(items => {
          const idx = items.findIndex(item => item.id === id);
          if (idx >= 0) {
            const next = [...items];
            next[idx] = v;
            return next;
          }
          return [v, ...items];
        });
        return v;
      }
    } catch (err) {
      console.warn('[VideoService] Cannot fetch video detail:', err);
    }
    return this.getVideoById(id);
  }

  /**
   * Multi-tier approval logic:
   * Level 1 approved -> progresses to Level 2
   * Level 2 approved -> progresses to 'approved'
   */
  async approveVideo(id: string, note: string = ''): Promise<{ success: boolean; message: string }> {
    const currentUser = this.authService.currentUser();
    const video = this.getVideoById(id);

    if (!video || !currentUser) {
      return { success: false, message: 'Video atau user tidak ditemukan.' };
    }

    if (video.lockedBy) {
      return {
        success: false,
        message: `Aksi ditolak: Video sudah diproses oleh ${video.lockedBy.userName} (${video.lockedBy.action}) pada ${video.lockedBy.timestamp}.`
      };
    }

    if (!this.authService.canApproveAtLevel(video.currentLevel)) {
      return { success: false, message: `User tidak memiliki hak akses reviewer Level ${video.currentLevel}.` };
    }

    try {
      const apiRes = await this.apiService.approveVideo(id, video.currentLevel, note);
      if (apiRes && apiRes.success) {
        await this.loadFromApi();
        return { success: true, message: apiRes.message || 'Disetujui.' };
      }
      return { success: false, message: apiRes?.message || 'Gagal menyetujui video.' };
    } catch (err: unknown) {
      const httpErr = err as { status?: number; error?: { message?: string } };
      if (httpErr?.status === 409) {
        const conflictMsg = httpErr.error?.message || 'Benturan approval terdeteksi: Video sudah diproses di server.';
        return { success: false, message: `⚠️ ${conflictMsg}` };
      }
      return { success: false, message: httpErr?.error?.message || 'Gagal memproses approval di server.' };
    }
  }

  async rejectVideo(id: string, note: string = 'Ditolak saat peninjauan.'): Promise<{ success: boolean; message: string }> {
    const currentUser = this.authService.currentUser();
    const video = this.getVideoById(id);

    if (!video || !currentUser) {
      return { success: false, message: 'Video atau user tidak ditemukan.' };
    }

    if (video.lockedBy) {
      return {
        success: false,
        message: `Aksi ditolak: Video sudah diproses oleh ${video.lockedBy.userName} (${video.lockedBy.action}) pada ${video.lockedBy.timestamp}.`
      };
    }

    if (!this.authService.canApproveAtLevel(video.currentLevel)) {
      return { success: false, message: `User tidak memiliki hak akses reviewer Level ${video.currentLevel}.` };
    }

    try {
      const apiRes = await this.apiService.rejectVideo(id, video.currentLevel, note);
      if (apiRes && apiRes.success) {
        await this.loadFromApi();
        return { success: true, message: apiRes.message || 'Ditolak.' };
      }
      return { success: false, message: apiRes?.message || 'Gagal menolak video.' };
    } catch (err: unknown) {
      const httpErr = err as { status?: number; error?: { message?: string } };
      if (httpErr?.status === 409) {
        const conflictMsg = httpErr.error?.message || 'Benturan approval terdeteksi: Video sudah diproses di server.';
        return { success: false, message: `⚠️ ${conflictMsg}` };
      }
      return { success: false, message: httpErr?.error?.message || 'Gagal memproses penolakan di server.' };
    }
  }

  async requestRevision(id: string, note: string): Promise<{ success: boolean; message: string }> {
    const currentUser = this.authService.currentUser();
    const video = this.getVideoById(id);

    if (!video || !currentUser) {
      return { success: false, message: 'Video atau user tidak ditemukan.' };
    }

    if (video.lockedBy) {
      return {
        success: false,
        message: `Aksi ditolak: Video sudah diproses oleh ${video.lockedBy.userName}.`
      };
    }

    if (!this.authService.canApproveAtLevel(video.currentLevel)) {
      return { success: false, message: `User tidak memiliki hak akses reviewer Level ${video.currentLevel}.` };
    }

    try {
      const apiRes = await this.apiService.requestRevision(id, video.currentLevel, note);
      if (apiRes && apiRes.success) {
        await this.loadFromApi();
        return { success: true, message: apiRes.message || 'Permintaan revisi berhasil dikirim.' };
      }
      return { success: false, message: apiRes?.message || 'Gagal mengirim permintaan revisi.' };
    } catch (err: unknown) {
      const httpErr = err as { status?: number; error?: { message?: string } };
      if (httpErr?.status === 409) {
        return { success: false, message: `⚠️ ${httpErr.error?.message || 'Konflik terdeteksi.'}` };
      }
      return { success: false, message: httpErr?.error?.message || 'Gagal memproses revisi di server.' };
    }
  }

  async batchAction(videoIds: string[], action: 'approve' | 'reject', note?: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await this.apiService.batchActionVideos(videoIds, action, note);
      await this.loadFromApi();
      return { success: res.success, message: res.message };
    } catch (err: unknown) {
      const httpErr = err as { error?: { message?: string } };
      return { success: false, message: httpErr?.error?.message || 'Gagal memproses aksi batch.' };
    }
  }

  // Simulate a concurrent action from another reviewer to test anti-race condition UI
  simulateRaceCondition(id: string) {
    const current = this.authService.currentUser();
    const otherName = current?.name.includes('Farras')
      ? 'Michael (via Telegram)'
      : 'Farras (via Telegram)';

    this._videos.update(items =>
      items.map(v => {
        if (v.id === id) {
          return {
            ...v,
            status: 'rejected',
            lockedBy: {
              userName: otherName,
              action: 'reject',
              timestamp: '2 menit yang lalu'
            }
          };
        }
        return v;
      })
    );
  }

  async updateAudienceSettings(id: string, isForKids: boolean, category?: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.apiService.updateAudienceSettings(id, { isForKids, category });
      this._videos.update(items =>
        items.map(v => (v.id === id ? { ...v, isForKids, category: category || v.category } : v))
      );
      return { success: true, message: 'Pengaturan kategori & YouTube Kids berhasil disimpan.' };
    } catch (err: unknown) {
      const httpErr = err as { error?: { message?: string } };
      return { success: false, message: httpErr?.error?.message || 'Gagal memperbarui pengaturan audiens.' };
    }
  }

  resetConflict(id: string) {
    this._videos.update(items =>
      items.map(v => {
        if (v.id === id) {
          return {
            ...v,
            status: 'pending_review',
            lockedBy: undefined
          };
        }
        return v;
      })
    );
  }
}
