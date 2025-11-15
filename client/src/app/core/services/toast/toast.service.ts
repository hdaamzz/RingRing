import { Injectable, signal } from '@angular/core';
import { Toast } from '../../interfaces/util';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
private toasts = signal<Toast[]>([]);
  public toasts$ = this.toasts.asReadonly();

  show(message: string, type: Toast['type'] = 'info', duration: number = 3000): void {
    const id = Math.random().toString(36).substring(7);
    const toast: Toast = { id, type, message, duration };

    this.toasts.update(toasts => [...toasts, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  success(message: string, duration: number = 3000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration: number = 4000): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration: number = 3000): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration: number = 3000): void {
    this.show(message, 'warning', duration);
  }

  remove(id: string): void {
    this.toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }
}
