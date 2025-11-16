import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CallService } from '../../core/services/call/call.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { ToastService } from '../../core/services/toast/toast.service';
import { WebrtcService } from '../../core/services/webrtc/webrtc.service';
import { CallHistoryItem } from '../../core/interfaces/call';

@Component({
  selector: 'app-call-history',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './call-history.component.html',
  styleUrl: './call-history.component.css'
})
export class CallHistoryComponent implements OnInit{
  private callService = inject(CallService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private webrtcService = inject(WebrtcService);
  private router = inject(Router);

  protected currentUser = this.authService.currentUser;
  protected calls = signal<CallHistoryItem[]>([]);
  protected isLoading = signal<boolean>(false);
  protected currentPage = signal<number>(1);
  protected totalPages = signal<number>(1);
  protected filterType = signal<'all' | 'video' | 'audio' | 'missed'>('all');
  protected searchQuery = signal<string>('');

  protected filteredCalls = computed(() => {
    const allCalls = this.calls();
    const filter = this.filterType();
    const query = this.searchQuery().toLowerCase();

    let filtered = allCalls;

    // Filter by type
    if (filter === 'video') {
      filtered = filtered.filter(c => c.type === 'video');
    } else if (filter === 'audio') {
      filtered = filtered.filter(c => c.type === 'audio');
    } else if (filter === 'missed') {
      filtered = filtered.filter(c => c.status === 'missed' || c.status === 'rejected');
    }

    // Filter by search query
    if (query) {
      filtered = filtered.filter(c =>
        c.contact.name.toLowerCase().includes(query) ||
        c.contact.ringNumber.includes(query)
      );
    }

    return filtered;
  });

  protected callStats = computed(() => {
    const allCalls = this.calls();
    return {
      total: allCalls.length,
      completed: allCalls.filter(c => c.status === 'completed').length,
      missed: allCalls.filter(c => c.status === 'missed' || c.status === 'rejected').length,
      totalDuration: allCalls.reduce((sum, c) => sum + (c.duration || 0), 0),
    };
  });

  ngOnInit(): void {
    this.loadCallHistory();
  }

  private loadCallHistory(): void {
    this.isLoading.set(true);
    
    this.callService.getCallHistory(this.currentPage(), 20).subscribe({
      next: (response) => {
        this.calls.set(response.calls);
        this.totalPages.set(response.pages);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load call history:', error);
        this.toastService.error('Failed to load call history');
        this.isLoading.set(false);
      }
    });
  }

  setFilterType(type: 'all' | 'video' | 'audio' | 'missed'): void {
    this.filterType.set(type);
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  formatDate(date: Date): string {
    const callDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (callDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (callDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return callDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getCallIcon(call: CallHistoryItem): string {
    if (call.status === 'missed' || call.status === 'rejected') {
      return call.isIncoming ? 'missed-incoming' : 'missed-outgoing';
    }
    return call.isIncoming ? 'incoming' : 'outgoing';
  }

  getCallStatusColor(call: CallHistoryItem): string {
    if (call.status === 'completed') return 'text-green-400';
    if (call.status === 'missed') return 'text-red-400';
    if (call.status === 'rejected') return 'text-orange-400';
    return 'text-gray-400';
  }

  async callContact(call: CallHistoryItem): Promise<void> {
    const user = this.currentUser();
    if (!user) {
      this.toastService.error('User not authenticated');
      return;
    }

    try {
      await this.webrtcService.initiateCall(
        call.contact.id,
        call.contact.name,
        call.contact.picture,
        user.email,
        user.name,
        user.picture,
        'video'
      );

      this.router.navigate(['/call']);
      this.toastService.info(`Calling ${call.contact.name}... 📞`);
    } catch (error) {
      console.error('Failed to initiate call:', error);
      this.toastService.error('Failed to start call');
    }
  }

  loadMore(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadCallHistory();
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
