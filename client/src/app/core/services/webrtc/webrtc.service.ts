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

  // Multiple TURN servers for reliability
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    
    {
      urls: 'turn:relay1.expressturn.com:3478',
      username: 'efV26T4OSQI1TDK8Y7',
      credential: 'uLzc9rH9K2AyXq3r',
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
      this.incomingCall.set(data);
    });

    this.socketService.on('call:accepted', async (data: { callId: string }) => {
      await this.createOffer(data.callId);
    });

    this.socketService.on('call:rejected', () => {
      this.endCall();
    });

    this.socketService.on('call:offer', async (data: { callId: string; offer: RTCSessionDescriptionInit }) => {
      await this.handleOffer(data.callId, data.offer);
    });

    this.socketService.on('call:answer', async (data: { answer: RTCSessionDescriptionInit }) => {
      await this.handleAnswer(data.answer);
    });

    this.socketService.on('call:ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
      if (this.peerConnection && this.isRemoteDescriptionSet) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('ICE candidate error:', error);
        }
      } else {
        this.pendingIceCandidates.push(data.candidate);
      }
    });

    this.socketService.on('call:ended', () => {
      this.endCall();
    });
  }

  async initializeMedia(videoEnabled: boolean = true): Promise<MediaStream> {
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

      return this.localStream;
    } catch (error) {
      console.error('Failed to get media:', error);
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
    } catch (error) {
      console.error('Failed to initiate call:', error);
      this.endCall();
      throw error;
    }
  }

  async acceptCall(currentUserId: string, currentUserName: string, currentUserPicture?: string): Promise<void> {
    const incoming = this.incomingCall();
    if (!incoming) return;

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
    } catch (error) {
      console.error('Failed to accept call:', error);
      this.rejectCall('Failed to initialize media');
      throw error;
    }
  }

  rejectCall(reason: string = 'Call declined'): void {
    const incoming = this.incomingCall();
    if (!incoming) return;

    this.socketService.emit('call:reject', {
      callId: incoming.callId,
      callerId: incoming.callerId,
      reason,
    });

    this.incomingCall.set(null);
  }

  private createPeerConnection(targetUserId: string): RTCPeerConnection {
    this.peerConnection = new RTCPeerConnection({ 
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    // ICE candidate handler
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socketService.emit('call:ice-candidate', {
          targetUserId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Track received handler
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
      }
    };

    // Connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      
      if (state === 'connected') {
        this.callState.update(s => ({ ...s, startTime: new Date() }));
      } else if (state === 'failed' || state === 'closed') {
        this.endCall();
      }
    };

    // ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      
      if (state === 'failed') {
        this.restartIce();
      } else if (state === 'disconnected') {
        setTimeout(() => {
          if (this.peerConnection?.iceConnectionState === 'disconnected') {
            this.endCall();
          }
        }, 5000);
      }
    };

    return this.peerConnection;
  }

  private async createOffer(callId: string): Promise<void> {
    const receiverId = this.callState().receiver?.id;
    if (!receiverId) return;

    this.createPeerConnection(receiverId);

    try {
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.callState().callType === 'video',
      });
      
      await this.peerConnection!.setLocalDescription(offer);

      this.socketService.emit('call:offer', {
        callId,
        receiverId,
        offer: offer,
      });

      this.callState.update(state => ({ ...state, callId }));
    } catch (error) {
      console.error('Error creating offer:', error);
      this.endCall();
    }
  }

  private async handleOffer(callId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const callerId = this.callState().caller?.id;
    if (!callerId) return;

    this.createPeerConnection(callerId);

    try {
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
      this.isRemoteDescriptionSet = true;

      await this.addPendingIceCandidates();

      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      this.socketService.emit('call:answer', {
        callId,
        callerId,
        answer: answer,
      });
    } catch (error) {
      console.error('Error handling offer:', error);
      this.endCall();
    }
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      this.isRemoteDescriptionSet = true;
      await this.addPendingIceCandidates();
    } catch (error) {
      console.error('Error handling answer:', error);
      this.endCall();
    }
  }

  private async addPendingIceCandidates(): Promise<void> {
    for (const candidate of this.pendingIceCandidates) {
      try {
        await this.peerConnection!.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding pending ICE candidate:', error);
      }
    }
    this.pendingIceCandidates = [];
  }

  private async restartIce(): Promise<void> {
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
      }
    } catch (error) {
      console.error('ICE restart failed:', error);
    }
  }

  toggleMute(): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        
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
      this.localStream.getTracks().forEach(track => track.stop());
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
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }
}
