import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Role, RoleName, User } from '../../../core/models/auth.models';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionButtonComponent],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Users & Roles Management
          </h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Konfigurasi tim, hak akses reviewer berjenjang, dan manajemen role dinamis tanpa redeploy aplikasi.
          </p>
        </div>

        <app-action-button
          variant="primary"
          (clicked)="openUserModal()"
        >
          <span class="flex items-center space-x-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
            </svg>
            <span>+ Tambah User</span>
          </span>
        </app-action-button>
      </div>

      <!-- Users Table Card -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
        <div class="p-6 border-b border-slate-100 dark:border-slate-700/60">
          <h3 class="text-base font-bold text-slate-900 dark:text-white">
            Daftar Pengguna Sistem
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">
            Pengguna terdaftar dengan kewenangan approval video vertikal
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-100/75 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs uppercase font-semibold">
              <tr>
                <th class="py-3 px-6">Nama</th>
                <th class="py-3 px-4">Email</th>
                <th class="py-3 px-4">Role Terpasang</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
              @for (user of adminService.users(); track user.id) {
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                  <td class="py-4 px-6">
                    <div class="flex items-center space-x-3">
                      <img
                        [src]="user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'"
                        [alt]="user.name"
                        class="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                      />
                      <div>
                        <div class="font-semibold text-slate-900 dark:text-white">{{ user.name }}</div>
                        <div class="text-[11px] text-slate-400">{{ user.telegramUsername || 'Telegram: -' }}</div>
                      </div>
                    </div>
                  </td>

                  <td class="py-4 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                    {{ user.email }}
                  </td>

                  <td class="py-4 px-4">
                    <div class="flex flex-wrap gap-1.5">
                      @for (roleName of user.roles; track roleName) {
                        <span
                          class="px-2 py-0.5 rounded-full text-xs font-semibold"
                          [class]="getRoleBadgeClass(roleName)"
                        >
                          {{ formatRoleLabel(roleName) }}
                        </span>
                      }
                    </div>
                  </td>

                  <td class="py-4 px-4">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      [class.bg-emerald-100]="user.isActive"
                      [class.text-emerald-700]="user.isActive"
                      [class.bg-slate-100]="!user.isActive"
                      [class.text-slate-600]="!user.isActive"
                    >
                      <span class="w-1.5 h-1.5 rounded-full mr-1.5" [class.bg-emerald-500]="user.isActive" [class.bg-slate-400]="!user.isActive"></span>
                      {{ user.isActive ? 'Aktif' : 'Nonaktif' }}
                    </span>
                  </td>

                  <td class="py-4 px-6 text-right space-x-2">
                    <button
                      (click)="openUserModal(user)"
                      class="text-xs font-medium text-indigo-600 hover:text-indigo-800 p-1.5 rounded hover:bg-indigo-50"
                    >
                      Edit
                    </button>
                    <button
                      (click)="onToggleUserStatus(user)"
                      class="text-xs font-medium p-1.5 rounded"
                      [class.text-rose-600]="user.isActive"
                      [class.hover:bg-rose-50]="user.isActive"
                      [class.text-emerald-600]="!user.isActive"
                      [class.hover:bg-emerald-50]="!user.isActive"
                    >
                      {{ user.isActive ? 'Nonaktifkan' : 'Aktifkan' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Roles Configuration Matrix Section -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">
              Tingkat Role & Level Approval (Dinamis)
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">
              Klik chip role untuk mengubah label atau tingkat hierarki approval
            </p>
          </div>

          <app-action-button
            variant="ghost"
            size="sm"
            (clicked)="openRoleModal()"
          >
            + Tambah Role
          </app-action-button>
        </div>

        <!-- Role Chips Matrix -->
        <div class="flex flex-wrap gap-2.5 pt-2">
          @for (role of adminService.roles(); track role.id) {
            <button
              (click)="openRoleModal(role)"
              class="group flex items-center space-x-2 px-3.5 py-2 rounded-xl border transition-all text-xs font-medium"
              [class.bg-indigo-50]="role.isActive"
              [class.border-indigo-200]="role.isActive"
              [class.text-indigo-700]="role.isActive"
              [class.bg-slate-100]="!role.isActive"
              [class.border-slate-300]="!role.isActive"
              [class.text-slate-500]="!role.isActive"
            >
              <span>{{ role.label }}</span>
              <span class="px-1.5 py-0.2 rounded bg-white/80 dark:bg-slate-800 text-[10px] font-mono">
                Level {{ role.level }}
              </span>
              <svg class="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
              </svg>
            </button>
          }
        </div>

        <p class="text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          * Perubahan hierarki role akan langsung dievaluasi oleh conditional database lock pada request approval berikutnya. Perubahan label role berlaku setelah user login ulang.
        </p>
      </div>
    </div>

    <!-- Modal: Edit / Tambah User -->
    @if (isUserModalOpen()) {
      <div
        class="fixed inset-0 !m-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all duration-200"
        (click)="isUserModalOpen.set(false)"
      >
          <div
            class="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">
                {{ editingUserId ? 'Edit Pengguna' : 'Tambah Pengguna Baru' }}
              </h3>
              <button (click)="isUserModalOpen.set(false)" class="text-slate-400 hover:text-slate-600 p-1">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  [(ngModel)]="userForm.name"
                  class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">Email</label>
                <input
                  type="email"
                  [(ngModel)]="userForm.email"
                  class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <!-- Roles Multi-select Checkboxes -->
              <div>
                <label class="block text-xs font-semibold uppercase text-slate-500 mb-2">Penugasan Role</label>
                <div class="space-y-2">
                  @for (role of adminService.roles(); track role.id) {
                    <label class="flex items-center space-x-2 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        [checked]="isRoleSelected(role.name)"
                        (change)="toggleRoleSelection(role.name)"
                        class="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span class="text-slate-800 dark:text-slate-200">{{ role.label }} (Level {{ role.level }})</span>
                    </label>
                  }
                </div>
              </div>

              <!-- Active Status Toggle -->
              <div class="pt-2">
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="userForm.isActive" class="rounded text-indigo-600 focus:ring-indigo-500" />
                  <span class="text-sm font-medium text-slate-800 dark:text-slate-200">Akun Aktif</span>
                </label>
              </div>
            </div>

            <div class="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <app-action-button variant="ghost" (clicked)="isUserModalOpen.set(false)">Batal</app-action-button>
              <app-action-button variant="primary" (clicked)="onSaveUser()">Simpan Pengguna</app-action-button>
            </div>
          </div>
        </div>
      }

      <!-- Modal: Edit / Tambah Role -->
      @if (isRoleModalOpen()) {
        <div
          class="fixed inset-0 !m-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all duration-200"
          (click)="isRoleModalOpen.set(false)"
        >
          <div
            class="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">
                {{ editingRoleId ? 'Edit Role Dinamis' : 'Tambah Role Baru' }}
              </h3>
              <button (click)="isRoleModalOpen.set(false)" class="text-slate-400 hover:text-slate-600 p-1">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">Label Role (Tampilan)</label>
                <input
                  type="text"
                  [(ngModel)]="roleForm.label"
                  placeholder="e.g. Reviewer Level 3"
                  class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">Level Hierarki Approval</label>
                <input
                  type="number"
                  [(ngModel)]="roleForm.level"
                  class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <p class="text-[11px] text-slate-400 mt-1">1 = Reviewer Tahap 1, 2 = Reviewer Tahap 2, 0 = Superadmin</p>
              </div>

              <div class="pt-2">
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="roleForm.isActive" class="rounded text-indigo-600 focus:ring-indigo-500" />
                  <span class="text-sm font-medium text-slate-800 dark:text-slate-200">Role Aktif</span>
                </label>
              </div>
            </div>

            <div class="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <app-action-button variant="ghost" (clicked)="isRoleModalOpen.set(false)">Batal</app-action-button>
              <app-action-button variant="primary" (clicked)="onSaveRole()">Simpan Role</app-action-button>
            </div>
          </div>
        </div>
      }
  `
})
export class AdminUsersComponent {
  adminService = inject(AdminService);
  toastService = inject(ToastService);

  isUserModalOpen = signal(false);
  editingUserId: string | null = null;
  userForm = {
    name: '',
    email: '',
    roles: [] as RoleName[],
    isActive: true
  };

  isRoleModalOpen = signal(false);
  editingRoleId: string | null = null;
  roleForm = {
    name: 'reviewer_custom',
    label: '',
    level: 1,
    isActive: true
  };

  openUserModal(user?: User) {
    if (user) {
      this.editingUserId = user.id;
      this.userForm = {
        name: user.name,
        email: user.email,
        roles: [...user.roles],
        isActive: user.isActive
      };
    } else {
      this.editingUserId = null;
      this.userForm = {
        name: '',
        email: '',
        roles: ['reviewer_level_1'],
        isActive: true
      };
    }
    this.isUserModalOpen.set(true);
  }

  isRoleSelected(roleName: RoleName): boolean {
    return this.userForm.roles.includes(roleName);
  }

  toggleRoleSelection(roleName: RoleName) {
    if (this.isRoleSelected(roleName)) {
      this.userForm.roles = this.userForm.roles.filter(r => r !== roleName);
    } else {
      this.userForm.roles.push(roleName);
    }
  }

  onSaveUser() {
    if (!this.userForm.name || !this.userForm.email) {
      this.toastService.warning('Nama dan email wajib diisi.');
      return;
    }

    this.adminService.saveUser({
      id: this.editingUserId || undefined,
      ...this.userForm
    });

    this.isUserModalOpen.set(false);
    this.toastService.success(this.editingUserId ? 'Data user berhasil diperbarui.' : 'User baru berhasil ditambahkan.');
  }

  onToggleUserStatus(user: User) {
    this.adminService.toggleUserStatus(user.id);
    this.toastService.info(`Status akun ${user.name} diubah.`);
  }

  openRoleModal(role?: Role) {
    if (role) {
      this.editingRoleId = role.id;
      this.roleForm = {
        name: role.name,
        label: role.label,
        level: role.level,
        isActive: role.isActive
      };
    } else {
      this.editingRoleId = null;
      this.roleForm = {
        name: 'reviewer_l3',
        label: 'Reviewer Level 3',
        level: 3,
        isActive: true
      };
    }
    this.isRoleModalOpen.set(true);
  }

  onSaveRole() {
    if (!this.roleForm.label) {
      this.toastService.warning('Label role tidak boleh kosong.');
      return;
    }

    this.adminService.saveRole({
      id: this.editingRoleId || undefined,
      ...this.roleForm
    });

    this.isRoleModalOpen.set(false);
    this.toastService.success('Konfigurasi role dinamis berhasil disimpan.');
  }

  getRoleBadgeClass(roleName: RoleName): string {
    switch (roleName) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300';
      case 'reviewer_level_1':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300';
      case 'reviewer_level_2':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  }

  formatRoleLabel(roleName: RoleName): string {
    switch (roleName) {
      case 'admin': return 'Admin';
      case 'reviewer_level_1': return 'Reviewer L1';
      case 'reviewer_level_2': return 'Reviewer L2';
      case 'viewer': return 'Viewer';
      default: return roleName;
    }
  }
}
