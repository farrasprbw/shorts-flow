import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ActionButtonComponent } from '../../../shared/components/action-button/action-button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionButtonComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 font-sans">
      <div class="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 p-6 sm:p-8">
        <!-- Logo & Header -->
        <div class="text-center mb-8">
          <div class="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 items-center justify-center text-white shadow-lg shadow-indigo-500/25 mb-3">
            <svg class="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
            </svg>
          </div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Shorts<span class="text-indigo-600 dark:text-indigo-400">Flow</span>
          </h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sistem Otomasi & Review YouTube Shorts Multi-Platform
          </p>
        </div>

        <!-- Form -->
        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <!-- Email Input -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Email Akun
            </label>
            <div class="relative">
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                (input)="emailError.set('')"
                placeholder="nama@shortsflow.ai"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/60 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                [class.border-rose-500]="emailError()"
              />
            </div>
            @if (emailError()) {
              <p class="text-xs text-rose-500 mt-1 font-medium">{{ emailError() }}</p>
            }
          </div>

          <!-- Password Input -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                (click)="onForgotPassword()"
                class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Lupa password?
              </button>
            </div>
            <div class="relative">
              <input
                [type]="showPassword() ? 'text' : 'password'"
                [(ngModel)]="password"
                name="password"
                (input)="passwordError.set('')"
                placeholder="••••••••"
                class="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/60 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                [class.border-rose-500]="passwordError()"
              />
              <button
                type="button"
                (click)="showPassword.set(!showPassword())"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                @if (showPassword()) {
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"></path>
                  </svg>
                } @else {
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                }
              </button>
            </div>
            @if (passwordError()) {
              <p class="text-xs text-rose-500 mt-1 font-medium">{{ passwordError() }}</p>
            }
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <app-action-button
              type="submit"
              variant="primary"
              size="lg"
              [fullWidth]="true"
              [loading]="isLoading()"
            >
              Masuk ke Dashboard
            </app-action-button>
          </div>
        </form>

        <!-- Quick Demo Accounts Helper -->
        <div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/60">
          <p class="text-xs text-center text-slate-400 mb-2">
            Akun uji cepat untuk verifikasi:
          </p>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              (click)="fillCredentials('farras@shortsflow.ai')"
              class="p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors text-left"
            >
              <div class="font-semibold">Farras</div>
              <div class="text-[10px] text-slate-400">Admin & L2</div>
            </button>
            <button
              type="button"
              (click)="fillCredentials('michael@shortsflow.ai')"
              class="p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors text-left"
            >
              <div class="font-semibold">Michael</div>
              <div class="text-[10px] text-slate-400">Reviewer L1</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  authService = inject(AuthService);
  toastService = inject(ToastService);
  router = inject(Router);

  email = 'farras@shortsflow.ai';
  password = 'password123';
  showPassword = signal(false);
  isLoading = signal(false);

  emailError = signal('');
  passwordError = signal('');

  fillCredentials(selectedEmail: string) {
    this.email = selectedEmail;
    this.password = 'password123';
    this.emailError.set('');
    this.passwordError.set('');
  }

  onForgotPassword() {
    this.toastService.info('Silakan hubungi administrator tim untuk reset kredensial akun.');
  }

  async onSubmit() {
    let valid = true;

    if (!this.email || !this.email.includes('@')) {
      this.emailError.set('Format email tidak valid.');
      valid = false;
    }

    if (!this.password || this.password.length < 6) {
      this.passwordError.set('Password minimal 6 karakter.');
      valid = false;
    }

    if (!valid) return;

    this.isLoading.set(true);

    try {
      await this.authService.login(this.email, this.password);
      this.toastService.success(`Selamat datang kembali, ${this.authService.currentUser()?.name}!`);
      this.router.navigate(['/review']);
    } finally {
      this.isLoading.set(false);
    }
  }
}
