import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastItem } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-4 right-4 flex flex-col gap-2 z-50 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto bg-white dark:bg-slate-800 rounded-lg shadow-xl p-4 border-l-4 transition-all duration-300 transform translate-y-0 flex items-start justify-between"
          [class.border-emerald-500]="toast.type === 'success'"
          [class.border-rose-500]="toast.type === 'error'"
          [class.border-amber-500]="toast.type === 'warning'"
          [class.border-indigo-500]="toast.type === 'info'"
        >
          <div class="flex items-start space-x-3">
            @if (toast.type === 'success') {
              <div class="text-emerald-500 mt-0.5">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            } @else if (toast.type === 'error') {
              <div class="text-rose-500 mt-0.5">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
            } @else if (toast.type === 'warning') {
              <div class="text-amber-500 mt-0.5">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
            } @else {
              <div class="text-indigo-500 mt-0.5">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            }
            <div class="text-sm font-medium text-slate-800 dark:text-slate-100">
              {{ toast.message }}
            </div>
          </div>
          <button
            (click)="toastService.dismiss(toast.id)"
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-3 -mr-1 -mt-1 p-1"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      }
    </div>
  `
})
export class ToastComponent {
  toastService = inject(ToastService);
}
