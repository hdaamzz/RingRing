export interface MediaDevice {
  deviceId: string;
  label: string;
}

export interface AppSettings {
  notifications: {
    sound: boolean;
    desktop: boolean;
    vibration: boolean;
  };
  video: {
    quality: 'auto' | 'high' | 'medium' | 'low';
    enableMirror: boolean;
    enableBeautyMode: boolean;
  };
  audio: {
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    allowCallsFromStrangers: boolean;
    saveCallHistory: boolean;
  };
  appearance: {
    theme: 'dark' | 'light' | 'auto';
    language: string;
  };
}