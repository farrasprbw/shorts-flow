import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center p-10 sm:p-16 my-2 text-center bg-white/80 dark:bg-slate-800/60 rounded-3xl border border-dashed border-slate-300/90 dark:border-slate-700/80 shadow-xs">
      <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700/60 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-5 ring-4 ring-slate-50 dark:ring-slate-800">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
        </svg>
      </div>
      <h4 class="text-base font-semibold text-slate-800 dark:text-slate-200">
        {{ title() }}
      </h4>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
        {{ description() }}
      </p>
      <div class="mt-4">
        <ng-content></ng-content>
      </div>
    </div>
  `
})
export class EmptyStateComponent {
  title = input<string>('Tidak Ada Data');
  description = input<string>('Belum ada item yang sesuai dengan kriteria atau filter saat ini.');
}
