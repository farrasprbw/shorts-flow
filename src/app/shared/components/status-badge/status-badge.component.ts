import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoStatus } from '../../../core/models/video.models';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    @switch (status()) {
      @case ('draft') {
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          <span class="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
          Draft
        </span>
      }
      @case ('pending_review') {
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
          Menunggu Review
        </span>
      }
      @case ('approved') {
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
          Disetujui
        </span>
      }
      @case ('rejected') {
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
          <span class="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
          Ditolak
        </span>
      }
      @case ('scheduled') {
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5"></span>
          Dijadwalkan
        </span>
      }
      @case ('published') {
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <span class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
          Terbit
        </span>
      }
      @case ('failed') {
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <span class="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
          Gagal
        </span>
      }
      @default {
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          {{ status() }}
        </span>
      }
    }
  `
})
export class StatusBadgeComponent {
  status = input<VideoStatus | string>('draft');
}
