import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { WebrtcService } from '../../core/services/webrtc/webrtc.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { ToastService } from '../../core/services/toast/toast.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-incoming-call',
  imports: [CommonModule],
  templateUrl: './incoming-call.component.html',
  styleUrl: './incoming-call.component.css'
})
export class IncomingCallComponent implements OnInit, OnDestroy{
  private webrtcService = inject(WebrtcService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  protected incomingCall = this.webrtcService.currentIncomingCall;
  protected currentUser = this.authService.currentUser;
  protected isRinging = signal<boolean>(false);

  private ringtoneAudio: HTMLAudioElement | null = null;
  private ringtoneInterval: any;

  constructor() {
    effect(() => {
      const call = this.incomingCall();
      if (call) {
        this.startRinging();
      } else {
        this.stopRinging();
      }
    });
  }

  ngOnInit(): void {
  }

  private startRinging(): void {
    this.isRinging.set(true);
    
    // Play ringtone (you can add an actual audio file later)
    // For now, we'll use the browser's notification sound or vibration
    if ('vibrate' in navigator) {
      // Vibration pattern: vibrate for 500ms, pause for 500ms, repeat
      this.ringtoneInterval = setInterval(() => {
        navigator.vibrate([500, 500]);
      }, 1000);
    }

    // Optional: Play custom ringtone
    // this.ringtoneAudio = new Audio('/assets/sounds/ringtone.mp3');
    // this.ringtoneAudio.loop = true;
    // this.ringtoneAudio.play();
  }

  private stopRinging(): void {
    this.isRinging.set(false);

    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
    }

    if (this.ringtoneAudio) {
      this.ringtoneAudio.pause();
      this.ringtoneAudio = null;
    }

    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }

  async acceptCall(): Promise<void> {
    const user = this.currentUser();
    if (!user) return;

    this.stopRinging();

    try {
      await this.webrtcService.acceptCall(
        user.email, 
        user.name,
        user.picture
      );

      this.router.navigate(['/call']);
      this.toastService.success('Call connected! 🎉');
    } catch (error) {
      console.error('Failed to accept call:', error);
      this.toastService.error('Failed to connect call. Please check camera/microphone permissions.');
    }
  }

  rejectCall(): void {
    this.stopRinging();
    this.webrtcService.rejectCall('Call declined');
    this.toastService.info('Call declined');
  }

  getCallTypeIcon(): string {
    const call = this.incomingCall();
    return call?.callType === 'video' ? 'video' : 'audio';
  }
  ngOnDestroy(): void {
    this.stopRinging();
  }
}
