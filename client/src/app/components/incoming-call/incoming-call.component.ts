import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { WebrtcService } from '../../core/services/webrtc/webrtc.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { ToastService } from '../../core/services/toast/toast.service';
import { Router } from '@angular/router';
import { RingtoneService } from '../../core/services/ringtone/ringtone.service';

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
  private ringtoneService = inject(RingtoneService); 
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
    
    this.ringtoneService.startRingtone();
    
    console.log('📱 Ringing started');
  }

  private stopRinging(): void {
    this.isRinging.set(false);
    
    this.ringtoneService.stopRingtone();
    
    console.log('📱 Ringing stopped');
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
