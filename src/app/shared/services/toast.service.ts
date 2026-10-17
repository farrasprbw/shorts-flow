import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly _toasts = signal<ToastItem[]>([]);
  public readonly toasts = this._toasts.asReadonly();

  show(message: string, type: ToastType = 'info', durationMs: number = 4000) {
    const id = Math.random().toString(36).substring(2, 9);
    const item: ToastItem = { id, type, message };

    this._toasts.update(current => [...current, item]);

    setTimeout(() => {
      this.dismiss(id);
    }, durationMs);
  }

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error', 5000);
  }

  warning(message: string) {
    this.show(message, 'warning', 4500);
  }

  info(message: string) {
    this.show(message, 'info');
  }

  dismiss(id: string) {
    this._toasts.update(current => current.filter(t => t.id !== id));
  }
}
