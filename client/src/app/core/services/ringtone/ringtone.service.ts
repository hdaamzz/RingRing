import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RingtoneService {

private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private ringtoneAudio: HTMLAudioElement | null = null;
  private vibrationInterval: any = null;
  
  private isPlaying = signal(false);

  constructor() {
    if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
      this.audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    }
  }

  startRingtone(): void {
    const settings = this.getSettings();
    
    if (!settings.notifications.sound) {
      console.log('🔇 Ringtone disabled in settings');
      return;
    }

    if (this.isPlaying()) {
      console.log('⚠️ Ringtone already playing');
      return;
    }

    this.isPlaying.set(true);

    this.playAudioFileRingtone();

    if (settings.notifications.vibration) {
      this.startVibration();
    }

    console.log('🔔 Ringtone started');
  }

  private playBeepRingtone(): void {
    if (!this.audioContext) {
      console.warn('Web Audio API not supported');
      return;
    }

    this.oscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.oscillator.type = 'sine';
    this.gainNode.gain.value = 0.3; // Volume

    let isBeeping = true;
    let beepCount = 0;

    const playPattern = () => {
      if (!this.isPlaying()) return;

      if (isBeeping) {
        // Play beep
        this.oscillator!.frequency.setValueAtTime(800, this.audioContext!.currentTime); // High note
        this.gainNode!.gain.setValueAtTime(0.3, this.audioContext!.currentTime);
        
        beepCount++;
        
        if (beepCount >= 2) {
          isBeeping = false;
          beepCount = 0;
          setTimeout(playPattern, 1000); 
        } else {
          setTimeout(playPattern, 300); 
        }
      } else {
        this.gainNode!.gain.setValueAtTime(0, this.audioContext!.currentTime);
        isBeeping = true;
        setTimeout(playPattern, 100);
      }
    };

    this.oscillator.start();
    playPattern();
  }

  playAudioFileRingtone(): void {
    try {
      this.ringtoneAudio = new Audio('ennilerinjoru.mp3');
      this.ringtoneAudio.loop = true;
      this.ringtoneAudio.volume = 0.7;
      
      this.ringtoneAudio.play().catch(error => {
        console.error('Failed to play ringtone:', error);
        this.playBeepRingtone();
      });
    } catch (error) {
      console.error('Audio file not found, using beep sound:', error);
      this.playBeepRingtone();
    }
  }

  private startVibration(): void {
    if (!('vibrate' in navigator)) {
      console.log('Vibration not supported');
      return;
    }

    this.vibrationInterval = setInterval(() => {
      if (this.isPlaying()) {
        navigator.vibrate([500, 500, 500, 1000]); 
      }
    }, 2500);
  }

  stopRingtone(): void {
    if (!this.isPlaying()) return;

    this.isPlaying.set(false);

    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.ringtoneAudio) {
      this.ringtoneAudio.pause();
      this.ringtoneAudio.currentTime = 0;
      this.ringtoneAudio = null;
    }

    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }

    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }

    console.log('🔕 Ringtone stopped');
  }

  private getSettings() {
    const defaultSettings = {
      notifications: {
        sound: true,
        desktop: true,
        vibration: true,
      }
    };

    try {
      const saved = localStorage.getItem('ringring_settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  }

  testRingtone(): void {
    this.startRingtone();
    
    setTimeout(() => {
      this.stopRingtone();
    }, 3000);
  }
}
