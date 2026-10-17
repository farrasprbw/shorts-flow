import { Component, HostListener, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionButtonComponent } from '../action-button/action-button.component';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, ActionButtonComponent],
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 !m-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all duration-200"
        (click)="onBackdropClick($event)"
      >
        <div
          class="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200/80 dark:border-slate-700/80 transform transition-all animate-in zoom-in-95 duration-200"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start space-x-4">
            @if (variant() === 'danger') {
              <div class="w-10 h-10 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 flex items-center justify-center shrink-0">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
            } @else {
              <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            }

            <div class="flex-1">
              <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {{ title() }}
              </h3>
              <p class="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {{ message() }}
              </p>
            </div>
          </div>

          <div class="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <app-action-button
              variant="ghost"
              (clicked)="onCancel()"
            >
              {{ cancelLabel() }}
            </app-action-button>
            <app-action-button
              [variant]="variant()"
              (clicked)="onConfirm()"
            >
              {{ confirmLabel() }}
            </app-action-button>
          </div>
        </div>
      </div>
    }
  `
})
export class ConfirmModalComponent {
  isOpen = input<boolean>(false);
  title = input<string>('Konfirmasi Aksi');
  message = input<string>('Apakah Anda yakin ingin melanjutkan aksi ini?');
  confirmLabel = input<string>('Konfirmasi');
  cancelLabel = input<string>('Batal');
  variant = input<'success' | 'danger'>('success');

  confirmed = output<void>();
  cancelled = output<void>();

  @HostListener('document:keydown.escape')
  handleEscape() {
    if (this.isOpen()) {
      this.onCancel();
    }
  }

  onBackdropClick(event: MouseEvent) {
    this.onCancel();
  }

  onConfirm() {
    this.confirmed.emit();
  }

  onCancel() {
    this.cancelled.emit();
  }
}
