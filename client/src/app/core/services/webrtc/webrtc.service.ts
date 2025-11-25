import { inject, Injectable, signal } from '@angular/core';
import { SocketService } from '../socket/socket.service';
import { CallState, IncomingCall } from '../../interfaces/call';

@Injectable({
  providedIn: 'root'
})
export class WebrtcService {
  private socketService = inject(SocketService);

  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  // Keep track of pending ICE candidates
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private isRemoteDescriptionSet = false;

  private callState = signal<CallState>({
    callId: null,
    isInCall: false,
    isIncoming: false,
    callType: 'video',
    caller: null,
    receiver: null,
    startTime: null,
    duration: 0,
    isMuted: false,
    isVideoEnabled: true,
    isScreenSharing: false,
  });

  private incomingCall = signal<IncomingCall | null>(null);

  public currentCallState = this.callState.asReadonly();
  public currentIncomingCall = this.incomingCall.asReadonly();

  private iceServers: RTCIceServer[] = [
    // STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    
    // Primary TURN - Metered (port 80/443)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    
    // Fallback TURN - FreeTurn.net
    {
      urls: 'turn:freeturn.net:3478',
      username: 'free',
      credential: 'free',
    },
    {
      urls: 'turn:freeturn.net:5349',
      username: 'free',
      credential: 'free',
    },
    
    // Fallback TURN - Numb (if working)
    {
      urls: 'turn:numb.viagenie.ca',
      username: 'webrtc@live.com',
      credential: 'muazkh',
    },
  ];
  constructor() {
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    const socket = this.socketService.getSocket();

    if (!socket) {
      setTimeout(() => this.setupSocketListeners(), 1000);
      return;
    }

    this.socketService.on('call:incoming', (data: IncomingCall) => {
      console.log('📞 Incoming call received:', data);
      this.incomingCall.set(data);
    });

    this.socketService.on('call:accepted', async (data: { callId: string }) => {
      console.log('✅ Call accepted:', data);
      await this.createOffer(data.callId);
    });

    this.socketService.on('call:rejected', (data: { callId: string; reason?: string }) => {
      console.log('❌ Call rejected:', data);
      this.endCall();
    });

    this.socketService.on('call:offer', async (data: { callId: string; offer: RTCSessionDescriptionInit }) => {
      console.log('📨 Received offer:', data);
      await this.handleOffer(data.callId, data.offer);
    });

    this.socketService.on('call:answer', async (data: { callId: string; answer: RTCSessionDescriptionInit }) => {
      console.log('📨 Received answer:', data);
      await this.handleAnswer(data.answer);
    });

    this.socketService.on('call:ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
      console.log('🧊 Received ICE candidate:', data.candidate);
      
      if (this.peerConnection && this.isRemoteDescriptionSet) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log('✅ ICE candidate added successfully');
        } catch (error) {
          console.error('❌ Error adding ICE candidate:', error);
        }
      } else {
        console.log('⏳ Queueing ICE candidate (remote description not set yet)');
        this.pendingIceCandidates.push(data.candidate);
      }
    });

    this.socketService.on('call:ended', (data: { callId: string; reason?: string }) => {
      console.log('📵 Call ended:', data);
      this.endCall();
    });

    this.socketService.on('peer:video-toggle', (data: { enabled: boolean }) => {
      console.log('📹 Peer video toggled:', data);
    });

    this.socketService.on('peer:audio-toggle', (data: { enabled: boolean }) => {
      console.log('🎤 Peer audio toggled:', data);
    });
  }

  async initializeMedia(videoEnabled: boolean = true): Promise<MediaStream> {
    console.log('🎥 Initializing media - video enabled:', videoEnabled);
    
    const settings = JSON.parse(localStorage.getItem('ringring_settings') || '{}');
    const selectedCamera = localStorage.getItem('selected_camera');
    const selectedMicrophone = localStorage.getItem('selected_microphone');

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled ? { 
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false,
        audio: {
          deviceId: selectedMicrophone ? { exact: selectedMicrophone } : undefined,
          echoCancellation: settings.audio?.echoCancellation ?? true,
          noiseSuppression: settings.audio?.noiseSuppression ?? true,
          autoGainControl: settings.audio?.autoGainControl ?? true,
        },
      });

      console.log('✅ Media initialized successfully');
      console.log('Audio tracks:', this.localStream.getAudioTracks().length);
      console.log('Video tracks:', this.localStream.getVideoTracks().length);
      
      return this.localStream;
    } catch (error) {
      console.error('❌ Failed to get local media:', error);
      throw error;
    }
  }

  async initiateCall(
    receiverId: string,
    receiverName: string,
    receiverPicture: string | undefined,
    currentUserId: string,
    currentUserName: string,
    currentUserPicture: string | undefined,
    callType: 'video' | 'audio' = 'video'
  ): Promise<void> {
    console.log('🚀 Initiating call to:', receiverName);
    
    try {
      await this.initializeMedia(callType === 'video');

      this.callState.update(state => ({
        ...state,
        isInCall: true,
        isIncoming: false,
        callType,
        caller: {
          id: currentUserId,
          name: currentUserName,
          picture: currentUserPicture,
        },
        receiver: {
          id: receiverId,
          name: receiverName,
          picture: receiverPicture,
        },
        isVideoEnabled: callType === 'video',
      }));

      this.socketService.emit('call:initiate', {
        callerId: currentUserId,
        callerName: currentUserName,
        callerPicture: currentUserPicture,
        receiverId: receiverId, 
        callType,
      });

      console.log('✅ Call initiation sent');
    } catch (error) {
      console.error('❌ Failed to initiate call:', error);
      this.endCall();
      throw error;
    }
  }

  async acceptCall(currentUserId: string, currentUserName: string, currentUserPicture?: string): Promise<void> {
    const incoming = this.incomingCall();
    if (!incoming) return;

    console.log('✅ Accepting call from:', incoming.callerName);

    try {
      await this.initializeMedia(incoming.callType === 'video');

      this.callState.update(state => ({
        ...state,
        callId: incoming.callId,
        isInCall: true,
        isIncoming: true,
        callType: incoming.callType,
        caller: {
          id: incoming.callerId,
          name: incoming.callerName,
          picture: incoming.callerPicture,
        },
        receiver: {
          id: currentUserId,
          name: currentUserName,
          picture: currentUserPicture,
        },
        startTime: new Date(),
        isVideoEnabled: incoming.callType === 'video',
      }));

      this.incomingCall.set(null);

      this.socketService.emit('call:accept', {
        callId: incoming.callId,
        callerId: incoming.callerId,
      });

      console.log('✅ Call accept sent');
    } catch (error) {
      console.error('❌ Failed to accept call:', error);
      this.rejectCall('Failed to initialize media');
      throw error;
    }
  }

  rejectCall(reason: string = 'Call declined'): void {
    const incoming = this.incomingCall();
    if (!incoming) return;

    console.log('❌ Rejecting call:', reason);

    this.socketService.emit('call:reject', {
      callId: incoming.callId,
      callerId: incoming.callerId,
      reason,
    });

    this.incomingCall.set(null);
  }

  private createPeerConnection(receiverId: string): RTCPeerConnection {
    console.log('🔗 Creating peer connection with ICE servers:', this.iceServers);

    this.peerConnection = new RTCPeerConnection({ 
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10,
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        console.log('➕ Adding track:', track.kind, track.label);
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 ICE candidate generated:', {
          type: event.candidate.type,
          protocol: event.candidate.protocol,
          address: event.candidate.address,
          port: event.candidate.port,
        });
        
        this.socketService.emit('call:ice-candidate', {
          targetUserId: receiverId,
          candidate: event.candidate.toJSON(),
        });
      } else {
        console.log('✅ ICE gathering complete');
      }
    };

    // ICE gathering state
    this.peerConnection.onicegatheringstatechange = () => {
      console.log('🧊 ICE gathering state:', this.peerConnection?.iceGatheringState);
    };

    // ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('🧊 ICE connection state:', state);
      
      if (state === 'connected' || state === 'completed') {
        console.log('✅ ICE connection established!');
      } else if (state === 'failed') {
        console.error('❌ ICE connection failed');
        // Try ICE restart
        this.restartIce();
      } else if (state === 'disconnected') {
        console.warn('⚠️ ICE disconnected - waiting for recovery...');
        // Give it some time to recover before ending call
        setTimeout(() => {
          if (this.peerConnection?.iceConnectionState === 'disconnected') {
            console.error('❌ ICE still disconnected after timeout');
            this.endCall();
          }
        }, 5000);
      }
    };

    // Track handler
    this.peerConnection.ontrack = (event) => {
      console.log('📺 Received track:', event.track.kind, event.track.label);
      
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        console.log('✅ Remote stream set');
      } else {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
        console.log('✅ Track added to remote stream');
      }
    };


    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('🔗 Connection state:', state);
      
      if (state === 'connected') {
        console.log('✅ Peer connection established!');
        this.callState.update(s => ({ ...s, startTime: new Date() }));
      } else if (state === 'failed') {
        console.error('❌ Connection failed');
        this.endCall();
      } else if (state === 'disconnected') {
        console.warn('⚠️ Connection disconnected');
      }
    };

    // Signaling state
    this.peerConnection.onsignalingstatechange = () => {
      console.log('📡 Signaling state:', this.peerConnection?.signalingState);
    };

    return this.peerConnection;
  }

  private async createOffer(callId: string): Promise<void> {
    const receiverId = this.callState().receiver?.id;
    if (!receiverId) {
      console.error('❌ No receiver ID found');
      return;
    }

    console.log('📤 Creating offer for call:', callId);

    this.createPeerConnection(receiverId);

    try {
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.callState().callType === 'video',
      });
      
      console.log('📤 Offer created:', offer.type);
      
      await this.peerConnection!.setLocalDescription(offer);
      console.log('✅ Local description set');

      this.socketService.emit('call:offer', {
        callId,
        receiverId,
        offer: offer,
      });

      console.log('📤 Offer sent to receiver');
      this.callState.update(state => ({ ...state, callId }));
    } catch (error) {
      console.error('❌ Error creating offer:', error);
      this.endCall();
    }
  }

  private async handleOffer(callId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const callerId = this.callState().caller?.id;
    if (!callerId) {
      console.error('❌ No caller ID found');
      return;
    }

    console.log('📥 Handling offer');

    this.createPeerConnection(callerId);

    try {
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('✅ Remote description set (offer)');
      this.isRemoteDescriptionSet = true;

      // Add any pending ICE candidates
      await this.addPendingIceCandidates();

      const answer = await this.peerConnection!.createAnswer();
      console.log('📥 Answer created');
      
      await this.peerConnection!.setLocalDescription(answer);
      console.log('✅ Local description set (answer)');

      this.socketService.emit('call:answer', {
        callId,
        callerId,
        answer: answer,
      });

      console.log('📥 Answer sent to caller');
    } catch (error) {
      console.error('❌ Error handling offer:', error);
      this.endCall();
    }
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      console.error('❌ No peer connection found');
      return;
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('✅ Remote description set (answer)');
      this.isRemoteDescriptionSet = true;

      // Add any pending ICE candidates
      await this.addPendingIceCandidates();
    } catch (error) {
      console.error('❌ Error handling answer:', error);
      this.endCall();
    }
  }

  private async addPendingIceCandidates(): Promise<void> {
    if (this.pendingIceCandidates.length > 0) {
      console.log(`🧊 Adding ${this.pendingIceCandidates.length} pending ICE candidates`);
      
      for (const candidate of this.pendingIceCandidates) {
        try {
          await this.peerConnection!.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('✅ Pending ICE candidate added');
        } catch (error) {
          console.error('❌ Error adding pending ICE candidate:', error);
        }
      }
      
      this.pendingIceCandidates = [];
    }
  }

  private async restartIce(): Promise<void> {
    console.log('🔄 Attempting ICE restart...');
    
    if (!this.peerConnection) return;

    try {
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);
      
      const targetUserId = this.callState().isIncoming 
        ? this.callState().caller?.id 
        : this.callState().receiver?.id;

      if (targetUserId) {
        this.socketService.emit('call:offer', {
          callId: this.callState().callId,
          receiverId: targetUserId,
          offer: offer,
        });
        console.log('✅ ICE restart offer sent');
      }
    } catch (error) {
      console.error('❌ ICE restart failed:', error);
    }
  }

  toggleMute(): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        console.log('🎤 Audio toggled:', audioTrack.enabled ? 'ON' : 'OFF');
        
        this.callState.update(state => ({
          ...state,
          isMuted: !audioTrack.enabled,
        }));

        const targetUserId = this.callState().isIncoming
          ? this.callState().caller?.id
          : this.callState().receiver?.id;

        if (targetUserId) {
          this.socketService.emit('call:toggle-audio', {
            targetUserId,
            enabled: audioTrack.enabled,
          });
        }
      }
    }
  }

  toggleVideo(): void {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        console.log('📹 Video toggled:', videoTrack.enabled ? 'ON' : 'OFF');
        
        this.callState.update(state => ({
          ...state,
          isVideoEnabled: videoTrack.enabled,
        }));

        const targetUserId = this.callState().isIncoming
          ? this.callState().caller?.id
          : this.callState().receiver?.id;

        if (targetUserId) {
          this.socketService.emit('call:toggle-video', {
            targetUserId,
            enabled: videoTrack.enabled,
          });
        }
      }
    }
  }

  endCall(): void {
    console.log('📵 Ending call...');
    
    const state = this.callState();

    if (state.callId) {
      const targetUserId = state.isIncoming ? state.caller?.id : state.receiver?.id;

      if (targetUserId) {
        this.socketService.emit('call:end', {
          callId: state.callId,
          userId: state.isIncoming ? state.receiver?.id : state.caller?.id,
          targetUserId,
        });
      }
    }

    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('⏹️ Stopped track:', track.kind);
      });
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
      console.log('🔌 Peer connection closed');
    }
    // Reset state
    this.isRemoteDescriptionSet = false;
    this.pendingIceCandidates = [];

    this.callState.set({
      callId: null,
      isInCall: false,
      isIncoming: false,
      callType: 'video',
      caller: null,
      receiver: null,
      startTime: null,
      duration: 0,
      isMuted: false,
      isVideoEnabled: true,
      isScreenSharing: false,
    });

    console.log('✅ Call ended successfully');
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }
}
