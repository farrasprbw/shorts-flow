import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row text-slate-900 dark:text-slate-100 font-sans">
      <!-- Mobile Drawer Backdrop -->
      @if (isMobileMenuOpen()) {
        <div
          class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-30 md:hidden"
          (click)="isMobileMenuOpen.set(false)"
        ></div>
      }

      <!-- Sidebar (Desktop Fixed / Mobile Slide-in Drawer) -->
      <aside
        class="fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/80 flex flex-col justify-between transition-transform duration-300 md:translate-x-0"
        [class.translate-x-0]="isMobileMenuOpen()"
        [class.-translate-x-full]="!isMobileMenuOpen()"
      >
        <div>
          <!-- Brand Header -->
          <div class="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-700/60">
            <div class="flex items-center space-x-3">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                </svg>
              </div>
              <span class="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Shorts<span class="text-indigo-600 dark:text-indigo-400">Flow</span>
              </span>
            </div>
            <!-- Close button on mobile -->
            <button
              (click)="isMobileMenuOpen.set(false)"
              class="md:hidden text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Nav Items -->
          <nav class="p-4 space-x-0 space-y-1">
            <a
              routerLink="/review"
              routerLinkActive="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold shadow-xs"
              (click)="isMobileMenuOpen.set(false)"
              class="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 transition-colors"
            >
              <svg class="w-5 h-5 text-current shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
              </svg>
              <span>Review Queue</span>
            </a>

            <a
              routerLink="/schedule"
              routerLinkActive="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold shadow-xs"
              (click)="isMobileMenuOpen.set(false)"
              class="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 transition-colors"
            >
              <svg class="w-5 h-5 text-current shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <span>Jadwal Upload</span>
            </a>

            <a
              routerLink="/analytics"
              routerLinkActive="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold shadow-xs"
              (click)="isMobileMenuOpen.set(false)"
              class="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 transition-colors"
            >
              <svg class="w-5 h-5 text-current shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              <span>Analytics</span>
            </a>

            <!-- Admin Only Menu Item -->
            @if (authService.isAdmin()) {
              <div class="pt-4 pb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Administrasi
              </div>
              <a
                routerLink="/admin"
                routerLinkActive="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold shadow-xs"
                (click)="isMobileMenuOpen.set(false)"
                class="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 transition-colors"
              >
                <svg class="w-5 h-5 text-current shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
                <span>Users & Roles</span>
              </a>
            }
          </nav>
        </div>

        <!-- Testing Quick Persona Switcher in Sidebar -->
        <div class="p-3.5 mx-3 mb-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 shadow-xs">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Simulasi Akun Reviewer:</span>
            <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300">
              {{ authService.isAdmin() ? 'ADMIN & L2' : (authService.hasRole('reviewer_level_2') ? 'LEVEL 2' : (authService.hasRole('reviewer_level_1') ? 'LEVEL 1' : 'VIEWER')) }}
            </span>
          </div>
          <select
            [value]="currentSelectedUserId()"
            (change)="onSwitchUser($event)"
            class="w-full text-xs font-medium bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer shadow-xs"
          >
            @for (usr of authService.users(); track usr.id) {
              <option [value]="usr.id">
                {{ usr.name }}
              </option>
            }
          </select>
        </div>
      </aside>

      <!-- Main Content Area with Desktop Left Margin for Fixed Sidebar -->
      <div class="flex-1 md:ml-64 flex flex-col min-h-screen">
        <!-- Topbar -->
        <header class="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/80 px-4 sm:px-8 lg:px-10 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div class="flex items-center space-x-3">
            <!-- Mobile Menu Toggle Button -->
            <button
              (click)="isMobileMenuOpen.set(true)"
              class="md:hidden text-slate-600 dark:text-slate-300 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>

            <h1 class="text-lg font-bold text-slate-900 dark:text-white capitalize">
              {{ currentTitle() }}
            </h1>
          </div>

          <!-- Topbar Actions -->
          <div class="flex items-center space-x-3 sm:space-x-4">
            <!-- Telegram Bot Status Indicator -->
            <div class="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-medium border border-sky-200/60 dark:border-sky-800/60">
              <span class="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
              <span>Bot Telegram Aktif</span>
            </div>

            <!-- YouTube Channel Status Indicator -->
            @if (isYouTubeConnected()) {
              <div class="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-medium border border-red-200/60 dark:border-red-800/60">
                <span class="w-2 h-2 rounded-full bg-red-500"></span>
                <span>YouTube Terhubung</span>
              </div>
            } @else {
              <a
                href="http://localhost:3000/api/youtube/auth"
                target="_blank"
                class="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-all hover:scale-105"
                title="Klik untuk menghubungkan channel YouTube @FarrasPrabowo"
              >
                <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                <span>Hubungkan YouTube</span>
              </a>
            }

            <!-- User Avatar & Profile Dropdown -->
            <div class="relative">
              <button
                (click)="isUserDropdownOpen.set(!isUserDropdownOpen())"
                class="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <img
                  [src]="authService.currentUser()?.avatarUrl"
                  [alt]="authService.currentUser()?.name"
                  class="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/20"
                />
                <div class="hidden sm:block text-left text-xs">
                  <div class="font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                    {{ authService.currentUser()?.name }}
                  </div>
                  <div class="text-slate-400 capitalize">
                    {{ authService.currentUser()?.roles?.[0] }}
                  </div>
                </div>
                <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              @if (isUserDropdownOpen()) {
                <div class="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div class="px-4 py-2 border-b border-slate-100 dark:border-slate-700 text-xs">
                    <p class="font-medium text-slate-900 dark:text-white">{{ authService.currentUser()?.name }}</p>
                    <p class="text-slate-400 truncate">{{ authService.currentUser()?.email }}</p>
                  </div>
                  <a
                    routerLink="/admin"
                    (click)="isUserDropdownOpen.set(false)"
                    class="block px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    Pengaturan Akun
                  </a>
                  <button
                    (click)="onLogout()"
                    class="w-full text-left px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    Keluar (Logout)
                  </button>
                </div>
              }
            </div>
          </div>
        </header>

        <!-- Page Dynamic View -->
        <main class="flex-1 px-4 sm:px-8 lg:px-10 py-6 sm:py-8 max-w-7xl w-full mx-auto">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class MainLayoutComponent {
  authService = inject(AuthService);
  apiService = inject(ApiService);
  toastService = inject(ToastService);
  router = inject(Router);

  isMobileMenuOpen = signal<boolean>(false);
  isUserDropdownOpen = signal<boolean>(false);
  isYouTubeConnected = signal<boolean>(false);

  currentTitle = signal<string>('Review Queue');

  constructor() {
    this.checkYouTubeStatus();
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      const url = this.router.url;
      if (url.includes('/review/')) {
        this.currentTitle.set('Review Detail Video');
      } else if (url.includes('/review')) {
        this.currentTitle.set('Review Queue');
      } else if (url.includes('/schedule')) {
        this.currentTitle.set('Jadwal Upload');
      } else if (url.includes('/analytics')) {
        this.currentTitle.set('Analytics & Traffic');
      } else if (url.includes('/admin')) {
        this.currentTitle.set('Users & Roles Management');
      } else {
        this.currentTitle.set('Dashboard');
      }
      this.isUserDropdownOpen.set(false);
    });
  }

  currentSelectedUserId = computed(() => {
    const cur = this.authService.currentUser();
    const allUsers = this.authService.users();
    if (!cur) return allUsers[0]?.id || '';
    const match = allUsers.find(
      u => u.id === cur.id || u.email.toLowerCase() === cur.email.toLowerCase()
    );
    return match ? match.id : (allUsers[0]?.id || '');
  });

  async onSwitchUser(event: Event) {
    const target = event.target as HTMLSelectElement;
    await this.authService.switchUser(target.value);
    const user = this.authService.currentUser();
    this.toastService.info(`Beralih simulasi akun ke: ${user?.name}`);
  }

  async checkYouTubeStatus() {
    try {
      const res = await this.apiService.getYouTubeStatus();
      this.isYouTubeConnected.set(Boolean(res?.connected));
    } catch {
      this.isYouTubeConnected.set(false);
    }
  }

  onLogout() {
    this.authService.logout();
    this.toastService.info('Anda telah keluar dari sistem.');
  }
}
