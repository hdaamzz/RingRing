import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, effect, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { WebrtcService } from '../../core/services/webrtc/webrtc.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { ToastService } from '../../core/services/toast/toast.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-call',
  imports: [CommonModule],
  templateUrl: './call.component.html',
  styleUrl: './call.component.css'
})
export class CallComponent implements OnInit, OnDestroy, AfterViewInit {
  private webrtcService = inject(WebrtcService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  protected callState = this.webrtcService.currentCallState;
  protected currentUser = this.authService.currentUser;
  
  protected callDuration = signal<string>('00:00');
  protected showControls = signal<boolean>(true);
  protected isFullscreen = signal<boolean>(false);

  private durationInterval: any;
  private hideControlsTimeout: any;
  private streamCheckInterval: any;

  constructor() {
    effect(() => {
      const state = this.callState();
      
      if (!state.isInCall) {
        this.router.navigate(['/profile']);
      }

      if (state.startTime && state.isInCall) {
        this.startDurationTimer();
      }
    });
  }

  ngOnInit(): void {
    if (!this.callState().isInCall) {
      this.router.navigate(['/profile']);
      return;
    }

    this.scheduleHideControls();
  }

  ngAfterViewInit(): void {
  this.startStreamCheck();
  if (this.localVideo?.nativeElement) {
    this.localVideo.nativeElement.muted = true;
  }
}

  ngOnDestroy(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
    }
    if (this.hideControlsTimeout) {
      clearTimeout(this.hideControlsTimeout);
    }
    if (this.streamCheckInterval) {
      clearInterval(this.streamCheckInterval);
    }
  }

  private startStreamCheck(): void {
    this.streamCheckInterval = setInterval(() => {
      this.updateVideoStreams();
    }, 500); 
  }

  private updateVideoStreams(): void {
    const localStream = this.webrtcService.getLocalStream();
    const remoteStream = this.webrtcService.getRemoteStream();

    if (this.localVideo?.nativeElement && localStream) {
      if (this.localVideo.nativeElement.srcObject !== localStream) {
        this.localVideo.nativeElement.srcObject = localStream;
        this.localVideo.nativeElement.play().catch(err => 
          console.error('Error playing local video:', err)
        );
      }
    }

    if (this.remoteVideo?.nativeElement && remoteStream) {
      if (this.remoteVideo.nativeElement.srcObject !== remoteStream) {
        this.remoteVideo.nativeElement.srcObject = remoteStream;
        this.remoteVideo.nativeElement.play().catch(err => 
          console.error('Error playing remote video:', err)
        );
      }
    }
  }

  private startDurationTimer(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
    }

    this.durationInterval = setInterval(() => {
      const state = this.callState();
      if (state.startTime) {
        const elapsed = Math.floor((Date.now() - state.startTime.getTime()) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        this.callDuration.set(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }
    }, 1000);
  }

  private scheduleHideControls(): void {
    if (this.hideControlsTimeout) {
      clearTimeout(this.hideControlsTimeout);
    }

    this.hideControlsTimeout = setTimeout(() => {
      this.showControls.set(false);
    }, 3000);
  }

  showControlsTemporarily(): void {
    this.showControls.set(true);
    this.scheduleHideControls();
  }

  toggleMute(): void {
    this.webrtcService.toggleMute();
    this.showControlsTemporarily();
  }

  toggleVideo(): void {
    this.webrtcService.toggleVideo();
    this.showControlsTemporarily();
  }

  endCall(): void {
    this.webrtcService.endCall();
    this.toastService.info('Call ended');
    this.router.navigate(['/profile']);
  }

  toggleFullscreen(): void {
    const elem = document.documentElement;

    if (!document.fullscreenElement) {
      elem.requestFullscreen().then(() => {
        this.isFullscreen.set(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        this.isFullscreen.set(false);
      });
    }
  }

  getContactInfo() {
    const state = this.callState();
    return state.isIncoming ? state.caller : state.receiver;
  }
}
