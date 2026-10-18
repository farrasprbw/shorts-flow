import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Video } from '../../../core/models/video.models';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { ActionButtonComponent } from '../action-button/action-button.component';

@Component({
  selector: 'app-video-card',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, ActionButtonComponent],
  template: `
    <div class="group bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md border border-slate-200/80 dark:border-slate-700/80 transition-all p-3 flex flex-col justify-between">
      <div>
        <!-- 9:16 Video Thumbnail Container with Gradient Overlay on Hover -->
        <div class="relative aspect-[9/16] w-full rounded-lg overflow-hidden bg-slate-900 shadow-inner">
          <img
            [src]="video().thumbnailUrl"
            [alt]="video().title"
            class="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          <!-- Duration Badge -->
          <div class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] font-mono text-white font-medium">
            0:{{ video().durationSeconds < 10 ? '0' : '' }}{{ video().durationSeconds }}s
          </div>

          <!-- Level Tag -->
          <div class="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-xs text-[11px] font-medium text-white flex items-center space-x-1 shadow-sm">
            <span>Level {{ video().currentLevel }}</span>
          </div>

          <!-- Select Checkbox for Batch Review -->
          @if (selectable()) {
            <label
              (click)="$event.stopPropagation()"
              class="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/60 backdrop-blur-xs flex items-center justify-center cursor-pointer border border-white/20 z-10 hover:bg-black/80 transition-all"
            >
              <input
                type="checkbox"
                [checked]="selected()"
                (change)="selectToggled.emit(!selected())"
                class="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
              />
            </label>
          }
        </div>

        <!-- Video Title -->
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 mt-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" [title]="video().title">
          {{ video().title }}
        </h3>

        <!-- Status & Level Info -->
        <div class="flex items-center justify-between mt-2.5">
          <app-status-badge [status]="video().status"></app-status-badge>
          <span class="text-xs text-slate-400 dark:text-slate-500">
            {{ formatDate(video().createdAt) }}
          </span>
        </div>

        <!-- Target Platforms Badges -->
        <div class="flex flex-wrap gap-1.5 mt-2.5">
          @for (platform of video().platforms; track platform) {
            <span
              class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
              [class]="getPlatformBadgeClass(platform)"
            >
              {{ platform.toUpperCase() }}
            </span>
          }
        </div>
      </div>

      <!-- Action Button -->
      <div class="mt-4 pt-2 border-t border-slate-100 dark:border-slate-700/50">
        @if (video().status === 'pending_review') {
          <app-action-button
            variant="primary"
            size="md"
            [fullWidth]="true"
            (clicked)="onReview()"
          >
            <span class="flex items-center space-x-1.5">
              <span>Review Video</span>
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </span>
          </app-action-button>
        } @else {
          <app-action-button
            variant="ghost"
            size="md"
            [fullWidth]="true"
            (clicked)="onReview()"
          >
            <span>Lihat Detail</span>
          </app-action-button>
        }
      </div>
    </div>
  `
})
export class VideoCardComponent {
  video = input.required<Video>();
  selectable = input<boolean>(false);
  selected = input<boolean>(false);
  reviewClicked = output<Video>();
  selectToggled = output<boolean>();

  onReview() {
    this.reviewClicked.emit(this.video());
  }

  getPlatformBadgeClass(platform: string): string {
    switch (platform) {
      case 'youtube':
        return 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-200/50';
      case 'instagram':
        return 'bg-pink-50 text-pink-600 dark:bg-pink-950/50 dark:text-pink-400 border border-pink-200/50';
      case 'facebook':
        return 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200/50';
      case 'tiktok':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }
}
