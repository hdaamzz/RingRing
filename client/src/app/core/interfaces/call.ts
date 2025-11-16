export interface CallState {
  callId: string | null;
  isInCall: boolean;
  isIncoming: boolean;
  callType: 'video' | 'audio';
  caller: {
    id: string;
    name: string;
    picture?: string;
  } | null;
  receiver: {
    id: string;
    name: string;
    picture?: string;
  } | null;
  startTime: Date | null;
  duration: number;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
}

export interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  callerPicture?: string;
  callType: 'video' | 'audio';
}

export interface CallHistoryItem {
  id: string;
  type: 'video' | 'audio';
  status: 'completed' | 'missed' | 'rejected' | 'cancelled';
  duration: number;
  startTime: Date;
  endTime?: Date;
  isIncoming: boolean;
  contact: {
    id: string;
    name: string;
    picture?: string;
    ringNumber: string;
  };
}

export interface CallHistoryResponse {
  calls: CallHistoryItem[];
  total: number;
  page: number;
  pages: number;
}