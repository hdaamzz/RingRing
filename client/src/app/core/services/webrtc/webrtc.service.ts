import { inject, Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
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
    private qualityMonitorInterval: any = null;

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
    private remoteStreamSubject = new Subject<MediaStream>();

    public currentCallState = this.callState.asReadonly();
    public currentIncomingCall = this.incomingCall.asReadonly();
    public remoteStream$ = this.remoteStreamSubject.asObservable();

    private iceServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
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
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
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

        this.socketService.on('call:rejected', (data: { callId: string; reason?: string }) => {
            this.endCall();
        });

        this.socketService.on('call:offer', async (data: { callId: string; offer: RTCSessionDescriptionInit }) => {
            await this.handleOffer(data.callId, data.offer);
        });

        this.socketService.on('call:answer', async (data: { callId: string; answer: RTCSessionDescriptionInit }) => {
            await this.handleAnswer(data.answer);
        });

        this.socketService.on('call:ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
            if (this.peerConnection && this.peerConnection.remoteDescription) {
                try {
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                    console.log('ICE candidate added successfully');
                } catch (error) {
                    console.error('Error adding ICE candidate:', error);
                }
            } else {
                console.log('Buffering ICE candidate - remote description not set yet');
                this.pendingIceCandidates.push(data.candidate);
            }
        });

        this.socketService.on('call:ended', (data: { callId: string; reason?: string }) => {
            this.endCall();
        });

        this.socketService.on('peer:video-toggle', (data: { enabled: boolean }) => {
            // Handle peer video toggle
        });

        this.socketService.on('peer:audio-toggle', (data: { enabled: boolean }) => {
            // Handle peer audio toggle
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
                    width: { ideal: 1280, max: 1280 },
                    height: { ideal: 720, max: 720 },
                    frameRate: { ideal: 30, max: 30 },
                    facingMode: 'user'
                } : false,
                audio: {
                    deviceId: selectedMicrophone ? { exact: selectedMicrophone } : undefined,
                    echoCancellation: settings.audio?.echoCancellation ?? true,
                    noiseSuppression: settings.audio?.noiseSuppression ?? true,
                    autoGainControl: settings.audio?.autoGainControl ?? true,
                    sampleRate: 48000,
                    channelCount: 1,
                },
            });

            return this.localStream;
        } catch (error) {
            console.error('Failed to get local media:', error);
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

    private createPeerConnection(receiverId: string): RTCPeerConnection {
        this.peerConnection = new RTCPeerConnection({
            iceServers: this.iceServers,
            iceCandidatePoolSize: 10,
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
        });

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                const sender = this.peerConnection!.addTrack(track, this.localStream!);

                // Apply encoding parameters for low latency
                if (track.kind === 'video') {
                    const parameters = sender.getParameters();
                    if (!parameters.encodings || parameters.encodings.length === 0) {
                        parameters.encodings = [{}];
                    }

                    parameters.encodings[0].maxBitrate = 1500000; // 1.5 Mbps
                    parameters.encodings[0].maxFramerate = 30;

                    sender.setParameters(parameters).catch(err => {
                        console.warn('Failed to set encoding parameters:', err);
                    });
                }
            });
        }

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate:', event.candidate.type);
                this.socketService.emit('call:ice-candidate', {
                    targetUserId: receiverId,
                    candidate: event.candidate.toJSON(),
                });
            } else {
                console.log('ICE candidate gathering complete');
            }
        };

        this.peerConnection.ontrack = (event) => {
            console.log('Remote track received:', event.track.kind);

            if (event.streams && event.streams[0]) {
                this.remoteStream = event.streams[0];
            } else {
                if (!this.remoteStream) {
                    this.remoteStream = new MediaStream();
                }
                this.remoteStream.addTrack(event.track);
            }

            this.remoteStreamSubject.next(this.remoteStream);
        };

        this.peerConnection.oniceconnectionstatechange = () => {
            const iceState = this.peerConnection?.iceConnectionState;
            console.log('ICE connection state:', iceState);

            if (iceState === 'failed') {
                console.log('ICE connection failed, attempting restart');
                this.restartIce();
            } else if (iceState === 'disconnected') {
                console.log('ICE disconnected, waiting for reconnection...');
                setTimeout(() => {
                    if (this.peerConnection?.iceConnectionState === 'disconnected') {
                        console.log('Still disconnected after 3s, restarting ICE');
                        this.restartIce();
                    }
                }, 3000);
            } else if (iceState === 'connected' || iceState === 'completed') {
                console.log('ICE connection established successfully');
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            const connState = this.peerConnection?.connectionState;
            console.log('Connection state:', connState);

            if (connState === 'connected') {
                this.callState.update(state => ({
                    ...state,
                    startTime: new Date(),
                }));
                this.startQualityMonitoring();
            } else if (connState === 'failed') {
                console.error('Connection failed completely');
                this.endCall();
            }
        };

        this.peerConnection.onicegatheringstatechange = () => {
            console.log('ICE gathering state:', this.peerConnection?.iceGatheringState);
        };

        return this.peerConnection;
    }

    private async addPendingIceCandidates(): Promise<void> {
        if (this.pendingIceCandidates.length > 0 && this.peerConnection) {
            console.log(`Adding ${this.pendingIceCandidates.length} buffered ICE candidates`);

            for (const candidate of this.pendingIceCandidates) {
                try {
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log('Buffered ICE candidate added');
                } catch (error) {
                    console.error('Error adding buffered ICE candidate:', error);
                }
            }

            this.pendingIceCandidates = [];
        }
    }

    private preferCodec(sdp: string, type: 'audio' | 'video', codec: string): string {
        const sdpLines = sdp.split('\r\n');
        const mLineIndex = sdpLines.findIndex(line => line.startsWith(`m=${type}`));

        if (mLineIndex === -1) return sdp;

        const codecPattern = new RegExp(`a=rtpmap:(\\d+) ${codec}/`, 'i');
        let codecPayloadType: string | null = null;

        for (let i = mLineIndex + 1; i < sdpLines.length; i++) {
            const line = sdpLines[i];
            if (line.startsWith('m=')) break;

            const match = line.match(codecPattern);
            if (match) {
                codecPayloadType = match[1];
                break;
            }
        }

        if (!codecPayloadType) return sdp;

        const mLine = sdpLines[mLineIndex];
        const elements = mLine.split(' ');
        const codecIndex = elements.indexOf(codecPayloadType);

        if (codecIndex > 3) {
            elements.splice(codecIndex, 1);
            elements.splice(3, 0, codecPayloadType);
            sdpLines[mLineIndex] = elements.join(' ');
        }

        return sdpLines.join('\r\n');
    }

    private async createOffer(callId: string): Promise<void> {
        const receiverId = this.callState().receiver?.id;
        if (!receiverId) return;

        this.createPeerConnection(receiverId);

        const offer = await this.peerConnection!.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });

        // Prefer H.264 for video and Opus for audio
        if (offer.sdp) {
            offer.sdp = this.preferCodec(offer.sdp, 'video', 'H264');
            offer.sdp = this.preferCodec(offer.sdp, 'audio', 'opus');
        }

        await this.peerConnection!.setLocalDescription(offer);

        this.socketService.emit('call:offer', {
            callId,
            receiverId,
            offer: offer,
        });

        this.callState.update(state => ({ ...state, callId }));
    }

    private async handleOffer(callId: string, offer: RTCSessionDescriptionInit): Promise<void> {
        const callerId = this.callState().caller?.id;
        if (!callerId) return;

        this.createPeerConnection(callerId);

        await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
        await this.addPendingIceCandidates();

        const answer = await this.peerConnection!.createAnswer();

        // Prefer codecs in answer as well
        if (answer.sdp) {
            answer.sdp = this.preferCodec(answer.sdp, 'video', 'H264');
            answer.sdp = this.preferCodec(answer.sdp, 'audio', 'opus');
        }

        await this.peerConnection!.setLocalDescription(answer);

        this.socketService.emit('call:answer', {
            callId,
            callerId,
            answer: answer,
        });
    }

    private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        if (this.peerConnection) {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            await this.addPendingIceCandidates();
        }
    }

    private async restartIce(): Promise<void> {
        if (!this.peerConnection) return;

        const state = this.callState();
        if (!state.callId) return;

        try {
            const offer = await this.peerConnection.createOffer({ iceRestart: true });
            await this.peerConnection.setLocalDescription(offer);

            const targetUserId = state.isIncoming ? state.caller?.id : state.receiver?.id;

            if (targetUserId) {
                this.socketService.emit('call:offer', {
                    callId: state.callId,
                    receiverId: targetUserId,
                    offer: offer,
                });

                console.log('ICE restart initiated');
            }
        } catch (error) {
            console.error('ICE restart failed:', error);
            this.endCall();
        }
    }

    private startQualityMonitoring(): void {
        if (this.qualityMonitorInterval) {
            clearInterval(this.qualityMonitorInterval);
        }

        this.qualityMonitorInterval = setInterval(async () => {
            if (!this.peerConnection) return;

            try {
                const stats = await this.peerConnection.getStats();
                let packetsLost = 0;
                let packetsReceived = 0;

                stats.forEach(report => {
                    if (report.type === 'inbound-rtp' && report.kind === 'video') {
                        packetsLost = report.packetsLost || 0;
                        packetsReceived = report.packetsReceived || 0;
                    }
                });

                if (packetsReceived > 0) {
                    const lossRate = (packetsLost / packetsReceived) * 100;

                    if (lossRate > 5) {
                        console.log(`High packet loss detected: ${lossRate.toFixed(2)}%`);
                        this.adjustVideoQuality(lossRate);
                    }
                }
            } catch (error) {
                console.error('Error monitoring quality:', error);
            }
        }, 5000);
    }

    private adjustVideoQuality(lossRate: number): void {
        const videoSender = this.peerConnection
            ?.getSenders()
            .find(sender => sender.track?.kind === 'video');

        if (!videoSender) return;

        const parameters = videoSender.getParameters();
        if (parameters.encodings && parameters.encodings.length > 0) {
            const currentBitrate = parameters.encodings[0].maxBitrate || 1500000;
            
            // Reduce bitrate by 20% but don't go below 500kbps
            const newBitrate = Math.max(500000, currentBitrate * 0.8);
            parameters.encodings[0].maxBitrate = newBitrate;

            videoSender.setParameters(parameters)
                .then(() => {
                    console.log(`Video bitrate adjusted to ${(newBitrate / 1000000).toFixed(2)} Mbps`);
                })
                .catch(err => {
                    console.warn('Failed to adjust video quality:', err);
                });
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

        // Stop quality monitoring
        if (this.qualityMonitorInterval) {
            clearInterval(this.qualityMonitorInterval);
            this.qualityMonitorInterval = null;
        }

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        if (this.remoteStream) {
            this.remoteStream.getTracks().forEach(track => track.stop());
            this.remoteStream = null;
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

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
