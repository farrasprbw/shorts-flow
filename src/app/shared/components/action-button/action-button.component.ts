import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'success' | 'danger' | 'ghost' | 'secondary';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-action-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      (click)="onClick($event)"
      [class]="getClasses()"
    >
      @if (loading()) {
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      }
      <ng-content></ng-content>
    </button>
  `
})
export class ActionButtonComponent {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  disabled = input<boolean>(false);
  loading = input<boolean>(false);
  fullWidth = input<boolean>(false);
  type = input<'button' | 'submit' | 'reset'>('button');

  clicked = output<MouseEvent>();

  onClick(event: MouseEvent) {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit(event);
    }
  }

  getClasses(): string {
    const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';
    
    // Sizes: ensure min-height 44px on mobile/desktop for accessibility
    const sizes = {
      sm: 'px-3 py-1.5 text-xs min-h-[36px]',
      md: 'px-4 py-2.5 text-sm min-h-[44px]',
      lg: 'px-5 py-3 text-base min-h-[48px]'
    }[this.size()];

    const variants = {
      primary: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 shadow-sm',
      success: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-sm',
      danger: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-sm',
      ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-600',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white'
    }[this.variant()];

    const width = this.fullWidth() ? 'w-full' : '';

    return `${base} ${sizes} ${variants} ${width}`;
  }
}
