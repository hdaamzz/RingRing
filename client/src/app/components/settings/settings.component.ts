import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';
import { ToastService } from '../../core/services/toast/toast.service';
import { AppSettings, MediaDevice } from '../../core/interfaces/settings';
import { RingtoneService } from '../../core/services/ringtone/ringtone.service';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private ringtoneService = inject(RingtoneService);
  private router = inject(Router);

  protected currentUser = this.authService.currentUser;
  protected activeTab = signal<'general' | 'devices' | 'privacy' | 'account'>('general');

  // Device lists
  protected cameras = signal<MediaDevice[]>([]);
  protected microphones = signal<MediaDevice[]>([]);
  protected speakers = signal<MediaDevice[]>([]);

  // Selected devices
  protected selectedCamera = signal<string>('');
  protected selectedMicrophone = signal<string>('');
  protected selectedSpeaker = signal<string>('');

  // Settings
  protected settings = signal<AppSettings>({
    notifications: {
      sound: true,
      desktop: true,
      vibration: true,
    },
    video: {
      quality: 'auto',
      enableMirror: true,
      enableBeautyMode: false,
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    privacy: {
      showOnlineStatus: true,
      allowCallsFromStrangers: false,
      saveCallHistory: true,
    },
    appearance: {
      theme: 'dark',
      language: 'en',
    },
  });

  ngOnInit(): void {
    this.loadSettings();
    this.loadDevices();
  }

  private loadSettings(): void {
    const saved = localStorage.getItem('ringring_settings');
    if (saved) {
      this.settings.set(JSON.parse(saved));
    }
  }
  testRingtone(): void {
    this.ringtoneService.testRingtone();
  }

  private saveSettings(): void {
    localStorage.setItem('ringring_settings', JSON.stringify(this.settings()));
    this.toastService.success('Settings saved successfully! ⚙️');
  }

  async loadDevices(): Promise<void> {
    try {
      let devices = await navigator.mediaDevices.enumerateDevices();

      const hasLabels = devices.some(d => d.label !== '');

      if (!hasLabels) {
        const videoDevices = devices
          .filter(d => d.kind === 'videoinput')
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: `Camera ${i + 1}`
          }));

        const audioInputDevices = devices
          .filter(d => d.kind === 'audioinput')
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: `Microphone ${i + 1}`
          }));

        const audioOutputDevices = devices
          .filter(d => d.kind === 'audiooutput')
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: `Speaker ${i + 1}`
          }));

        this.cameras.set(videoDevices);
        this.microphones.set(audioInputDevices);
        this.speakers.set(audioOutputDevices);

        // Set defaults
        if (videoDevices.length > 0) this.selectedCamera.set(videoDevices[0].deviceId);
        if (audioInputDevices.length > 0) this.selectedMicrophone.set(audioInputDevices[0].deviceId);
        if (audioOutputDevices.length > 0) this.selectedSpeaker.set(audioOutputDevices[0].deviceId);

        return;
      }

      const videoDevices = devices
        .filter(d => d.kind === 'videoinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label }));

      const audioInputDevices = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label }));

      const audioOutputDevices = devices
        .filter(d => d.kind === 'audiooutput')
        .map(d => ({ deviceId: d.deviceId, label: d.label }));

      this.cameras.set(videoDevices);
      this.microphones.set(audioInputDevices);
      this.speakers.set(audioOutputDevices);

      // Set defaults
      if (videoDevices.length > 0) this.selectedCamera.set(videoDevices[0].deviceId);
      if (audioInputDevices.length > 0) this.selectedMicrophone.set(audioInputDevices[0].deviceId);
      if (audioOutputDevices.length > 0) this.selectedSpeaker.set(audioOutputDevices[0].deviceId);

    } catch (error) {
      console.error('Failed to enumerate devices:', error);
    }
  }

  async testCamera(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: this.selectedCamera() }
      });

      stream.getTracks().forEach(track => track.stop());

      this.toastService.success('Camera is working! 📹');
    } catch (error) {
      this.toastService.error('Camera test failed');
    }
  }

  async testMicrophone(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: this.selectedMicrophone() }
      });

      stream.getTracks().forEach(track => track.stop());

      this.toastService.success('Microphone is working! 🎤');
    } catch (error) {
      this.toastService.error('Microphone test failed');
    }
  }

  async requestNotificationPermission(): Promise<void> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.toastService.success('Notification permission granted! 🔔');
      } else {
        this.toastService.error('Notification permission denied');
      }
    }
  }

  updateSetting(path: string, value: any): void {
    const current = this.settings();
    const keys = path.split('.');

    let obj: any = { ...current };
    let ref = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      ref[keys[i]] = { ...ref[keys[i]] };
      ref = ref[keys[i]];
    }

    ref[keys[keys.length - 1]] = value;

    this.settings.set(obj);
    this.saveSettings();
  }

  clearCallHistory(): void {
    if (confirm('Are you sure you want to clear your call history? This cannot be undone.')) {
      this.toastService.success('Call history cleared');
    }
  }

  clearCache(): void {
    localStorage.removeItem('ringring_settings');
    this.toastService.success('Cache cleared');
  }

  deleteAccount(): void {
    if (confirm('⚠️ WARNING: This will permanently delete your account and all data. Are you absolutely sure?')) {
      const confirmation = prompt('Type "DELETE" to confirm account deletion:');
      if (confirmation === 'DELETE') {
        // TODO: API call to delete account
        this.toastService.error('Account deletion is not implemented yet');
      }
    }
  }

  setActiveTab(tab: 'general' | 'devices' | 'privacy' | 'account'): void {
    this.activeTab.set(tab);
    if (tab === 'devices' && this.cameras().length === 0) {
      this.loadDevices();
    }
  }
  async requestDevicePermissionsAndRefresh(): Promise<void> {
  try {
    // Request permissions
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: true, 
      audio: true 
    });
    
    // Stop the stream immediately
    stream.getTracks().forEach(track => track.stop());
    
    // Now enumerate devices with labels
    await this.loadDevicesWithLabels();
    
    this.toastService.success('Devices loaded successfully! 🎥');
  } catch (error) {
    console.error('Failed to get device permissions:', error);
    this.toastService.error('Please grant camera and microphone permissions');
  }
}

private async loadDevicesWithLabels(): Promise<void> {
    const devices = await navigator.mediaDevices.enumerateDevices();

    const videoDevices = devices
      .filter(d => d.kind === 'videoinput')
      .map(d => ({ deviceId: d.deviceId, label: d.label }));

    const audioInputDevices = devices
      .filter(d => d.kind === 'audioinput')
      .map(d => ({ deviceId: d.deviceId, label: d.label }));

    const audioOutputDevices = devices
      .filter(d => d.kind === 'audiooutput')
      .map(d => ({ deviceId: d.deviceId, label: d.label }));

    this.cameras.set(videoDevices);
    this.microphones.set(audioInputDevices);
    this.speakers.set(audioOutputDevices);

    if (videoDevices.length > 0) this.selectedCamera.set(videoDevices[0].deviceId);
    if (audioInputDevices.length > 0) this.selectedMicrophone.set(audioInputDevices[0].deviceId);
    if (audioOutputDevices.length > 0) this.selectedSpeaker.set(audioOutputDevices[0].deviceId);
  }

  logout(): void {
    this.authService.logout();
  }
}
