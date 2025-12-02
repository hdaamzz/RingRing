import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, effect, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { WebrtcService } from '../../core/services/webrtc/webrtc.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { ToastService } from '../../core/services/toast/toast.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

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
  private remoteStreamSub?: Subscription;
  private localStreamAttached = false;
  private remoteStreamAttached = false;

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

    // Subscribe to remote stream updates
    this.remoteStreamSub = this.webrtcService.remoteStream$.subscribe({
      next: (stream) => {
        console.log('Remote stream received in component');
        this.attachRemoteStream(stream);
      },
      error: (error) => {
        console.error('Remote stream error:', error);
      }
    });

    this.scheduleHideControls();
  }

  ngAfterViewInit(): void {
    // Attach local stream after view is ready
    setTimeout(() => {
      this.attachLocalStream();
    }, 200);
  }

  ngOnDestroy(): void {
    // Clear intervals
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
    }
    if (this.hideControlsTimeout) {
      clearTimeout(this.hideControlsTimeout);
    }

    // Unsubscribe from remote stream
    this.remoteStreamSub?.unsubscribe();

    // Clean up video elements
    this.cleanupVideoElement(this.localVideo?.nativeElement);
    this.cleanupVideoElement(this.remoteVideo?.nativeElement);

    this.localStreamAttached = false;
    this.remoteStreamAttached = false;
  }

  private cleanupVideoElement(videoElement: HTMLVideoElement | undefined): void {
    if (videoElement) {
      videoElement.pause();
      videoElement.srcObject = null;
    }
  }

  private attachLocalStream(): void {
    const localStream = this.webrtcService.getLocalStream();
    const videoElement = this.localVideo?.nativeElement;

    if (!localStream || !videoElement) {
      console.warn('Local stream or video element not available');
      return;
    }

    // Only attach if not already attached
    if (this.localStreamAttached || videoElement.srcObject === localStream) {
      console.log('Local stream already attached');
      return;
    }

    try {
      console.log('Attaching local stream');
      videoElement.srcObject = localStream;
      videoElement.muted = true; // Ensure muted

      videoElement.onloadedmetadata = () => {
        videoElement.play().catch(err => {
          console.error('Error playing local video:', err);
        });
      };

      this.localStreamAttached = true;
    } catch (error) {
      console.error('Error attaching local stream:', error);
    }
  }

  private async attachRemoteStream(stream: MediaStream): Promise<void> {
    const videoElement = this.remoteVideo?.nativeElement;

    if (!videoElement || !stream) {
      console.warn('Remote video element or stream not available');
      return;
    }

    // Check if already attached to prevent AbortError
    if (this.remoteStreamAttached || videoElement.srcObject === stream) {
      console.log('Remote stream already attached');
      return;
    }

    try {
      const tracks = stream.getTracks();
      console.log('Attaching remote stream with tracks:', 
        tracks.map(t => `${t.kind}: ${t.enabled}`));

      if (tracks.length === 0) {
        console.warn('Remote stream has no tracks');
        return;
      }

      // Set srcObject
      videoElement.srcObject = stream;
      videoElement.muted = false; // Ensure NOT muted for remote

      // Wait for metadata to load
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video metadata load timeout'));
        }, 5000);

        videoElement.onloadedmetadata = () => {
          clearTimeout(timeout);
          console.log('Remote video metadata loaded');
          resolve();
        };

        videoElement.onerror = (error) => {
          clearTimeout(timeout);
          console.error('Video element error:', error);
          reject(error);
        };
      });

      // Play the video
      const playPromise = videoElement.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        console.log('Remote video playing successfully');
        this.remoteStreamAttached = true;
      }

    } catch (error: any) {
      console.error('Error attaching remote stream:', error);
      
      // Handle specific errors
      if (error.name === 'NotAllowedError') {
        console.warn('Autoplay blocked - user interaction required');
        this.toastService.warning('Click to enable audio/video');
      } else if (error.name === 'AbortError') {
        console.warn('Play interrupted, retrying...');
        // Retry once after a short delay
        setTimeout(() => {
          if (!this.remoteStreamAttached) {
            this.attachRemoteStream(stream);
          }
        }, 300);
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
      }).catch(err => {
        console.error('Error enabling fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        this.isFullscreen.set(false);
      }).catch(err => {
        console.error('Error exiting fullscreen:', err);
      });
    }
  }

  getContactInfo() {
    const state = this.callState();
    return state.isIncoming ? state.caller : state.receiver;
  }

  retryRemoteVideo(): void {
    const videoElement = this.remoteVideo?.nativeElement;
    if (videoElement && videoElement.srcObject) {
      videoElement.play().catch(err => {
        console.error('Manual play retry failed:', err);
      });
    }
  }
}
