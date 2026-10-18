import { Component, HostListener, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActionButtonComponent } from '../action-button/action-button.component';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionButtonComponent],
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
            } @else if (variant() === 'warning') {
              <div class="w-10 h-10 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 flex items-center justify-center shrink-0">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
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

          @if (showInput()) {
            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{{ inputLabel() }}</label>
              <textarea
                [(ngModel)]="inputValue"
                rows="3"
                [placeholder]="inputPlaceholder()"
                class="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              ></textarea>
            </div>
          }

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
  variant = input<'success' | 'danger' | 'warning'>('success');
  showInput = input<boolean>(false);
  inputLabel = input<string>('Catatan / Alasan');
  inputPlaceholder = input<string>('Tuliskan catatan...');

  inputValue = '';

  confirmed = output<string>();
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
    const val = this.inputValue;
    this.inputValue = '';
    this.confirmed.emit(val);
  }

  onCancel() {
    this.inputValue = '';
    this.cancelled.emit();
  }
}
