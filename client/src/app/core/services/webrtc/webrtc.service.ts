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

  // State
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

  // ICE servers
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
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

    // Call rejected
    this.socketService.on('call:rejected', (data: { callId: string; reason?: string }) => {
      this.endCall();
    });

    // Receive offer
    this.socketService.on('call:offer', async (data: { callId: string; offer: RTCSessionDescriptionInit }) => {
      await this.handleOffer(data.callId, data.offer);
    });

    // Receive answer
    this.socketService.on('call:answer', async (data: { callId: string; answer: RTCSessionDescriptionInit }) => {
      await this.handleAnswer(data.answer);
    });

    // Receive ICE candidate
    this.socketService.on('call:ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    // Call ended
    this.socketService.on('call:ended', (data: { callId: string; reason?: string }) => {
      this.endCall();
    });

    // Peer video toggle
    this.socketService.on('peer:video-toggle', (data: { enabled: boolean }) => {
    });

    // Peer audio toggle
    this.socketService.on('peer:audio-toggle', (data: { enabled: boolean }) => {
    });

  }

  // Initialize local media
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
      console.error('Failed to get local media:', error);
      throw error;
    }
  }

  // Initiate outgoing call
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
      // Initialize local media
      await this.initializeMedia(callType === 'video');

      // Update state
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

  // Reject incoming call
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

  // Create peer connection
  private createPeerConnection(receiverId: string): RTCPeerConnection {
    this.peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socketService.emit('call:ice-candidate', {
          targetUserId: receiverId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

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
      if (this.peerConnection?.connectionState === 'connected') {
        this.callState.update(state => ({
          ...state,
          startTime: new Date(),
        }));
      } else if (this.peerConnection?.connectionState === 'disconnected' ||
        this.peerConnection?.connectionState === 'failed') {
        this.endCall();
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
    };

    return this.peerConnection;
  }

  private async createOffer(callId: string): Promise<void> {
    const receiverId = this.callState().receiver?.id;
    if (!receiverId) return;

    this.createPeerConnection(receiverId);

    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);

    this.socketService.emit('call:offer', {
      callId,
      receiverId,
      offer: offer,
    });

    this.callState.update(state => ({ ...state, callId }));
  }

  // Handle incoming offer
  private async handleOffer(callId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const callerId = this.callState().caller?.id;
    if (!callerId) return;

    this.createPeerConnection(callerId);

    await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await this.peerConnection!.createAnswer();
    await this.peerConnection!.setLocalDescription(answer);

    this.socketService.emit('call:answer', {
      callId,
      callerId,
      answer: answer,
    });
  }

  // Handle incoming answer
  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  // Toggle microphone
  toggleMute(): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.callState.update(state => ({
          ...state,
          isMuted: !audioTrack.enabled,
        }));

        // Notify peer
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

  // Toggle video
  toggleVideo(): void {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.callState.update(state => ({
          ...state,
          isVideoEnabled: videoTrack.enabled,
        }));

        // Notify peer
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

  // End call
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
