import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Call } from '../models/call.model.js';

export interface SocketUser {
    userId: string;
    socketId: string;
    name: string;
    picture?: string;
}
interface RTCSessionDescriptionInit {
    type: 'offer' | 'answer';
    sdp?: string;
}

interface RTCIceCandidateInit {
    candidate?: string;
    sdpMLineIndex?: number;
    sdpMid?: string;
}


// Store active users
const activeUsers = new Map<string, SocketUser>();

// Store active calls with timestamps
const activeCalls = new Map<string, {
  callerId: string;
  receiverId: string;
  startTime: Date;
  callType: 'video' | 'audio';
  callDocumentId?: string; // ✅ Store MongoDB document ID
}>();

export const initializeSocket = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:4200',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    socket.on('user:join', (data: { userId: string; name: string; picture?: string }) => {
      const { userId, name, picture } = data;
      
      activeUsers.set(userId, {
        userId,
        socketId: socket.id,
        name,
        picture,
      });

      io.emit('user:online', { userId, name, picture });

      const onlineUsers = Array.from(activeUsers.values()).map(u => ({
        userId: u.userId,
        name: u.name,
        picture: u.picture,
      }));
      socket.emit('users:online', onlineUsers);
    });

    socket.on('call:initiate', async (data: {
      callerId: string;
      callerName: string;
      callerPicture?: string;
      receiverId: string;
      callType: 'video' | 'audio';
    }) => {
      const { callerId, callerName, callerPicture, receiverId, callType } = data;
      const receiver = activeUsers.get(receiverId);

      if (!receiver) {
        socket.emit('call:error', { message: 'User is offline' });
        return;
      }

      const callId = `${callerId}-${receiverId}-${Date.now()}`;
      
      try {
        const callDocument = await Call.create({
          callerId,
          receiverId,
          callType,
          status: 'completed', 
          startTime: new Date(),
        });

        activeCalls.set(callId, {
          callerId,
          receiverId,
          startTime: new Date(),
          callType,
          callDocumentId: callDocument._id?.toString(),
        });


        io.to(receiver.socketId).emit('call:incoming', {
          callId,
          callerId,
          callerName,
          callerPicture,
          callType,
        });

      } catch (error) {
        console.error('❌ Failed to create call record:', error);
        socket.emit('call:error', { message: 'Failed to initiate call' });
      }
    });

    socket.on('call:accept', (data: { callId: string; callerId: string }) => {
      const { callId, callerId } = data;
      const caller = activeUsers.get(callerId);

      if (!caller) {
        socket.emit('call:error', { message: 'Caller is offline' });
        return;
      }

      io.to(caller.socketId).emit('call:accepted', { callId });
    });

    socket.on('call:reject', async (data: { callId: string; callerId: string; reason?: string }) => {
      const { callId, callerId, reason } = data;
      const caller = activeUsers.get(callerId);

      if (caller) {
        io.to(caller.socketId).emit('call:rejected', { callId, reason });
      }

      const callInfo = activeCalls.get(callId);
      if (callInfo?.callDocumentId) {
        try {
          await Call.findByIdAndUpdate(callInfo.callDocumentId, {
            status: 'rejected',
            endTime: new Date(),
            duration: 0,
          });
        } catch (error) {
          console.error('❌ Failed to update call status:', error);
        }
      }

      activeCalls.delete(callId);
    });

    socket.on('call:end', async (data: { callId: string; userId: string; targetUserId: string }) => {
      const { callId, targetUserId } = data;
      const targetUser = activeUsers.get(targetUserId);

      if (targetUser) {
        io.to(targetUser.socketId).emit('call:ended', { callId });
      }

      const callInfo = activeCalls.get(callId);
      if (callInfo?.callDocumentId) {
        try {
          const endTime = new Date();
          const duration = Math.floor((endTime.getTime() - callInfo.startTime.getTime()) / 1000);

          await Call.findByIdAndUpdate(callInfo.callDocumentId, {
            status: 'completed',
            endTime,
            duration,
          });

        } catch (error) {
          console.error('❌ Failed to update call record:', error);
        }
      }

      activeCalls.delete(callId);
    });

    socket.on('call:offer', (data: {
      callId: string;
      receiverId: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      const { callId, receiverId, offer } = data;
      const receiver = activeUsers.get(receiverId);

      if (!receiver) {
        socket.emit('call:error', { message: 'User is offline' });
        return;
      }

      io.to(receiver.socketId).emit('call:offer', { callId, offer });
    });

    socket.on('call:answer', (data: {
      callId: string;
      callerId: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      const { callId, callerId, answer } = data;
      const caller = activeUsers.get(callerId);

      if (!caller) {
        socket.emit('call:error', { message: 'Caller is offline' });
        return;
      }

      io.to(caller.socketId).emit('call:answer', { callId, answer });
    });

    socket.on('call:ice-candidate', (data: {
      targetUserId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const { targetUserId, candidate } = data;
      const targetUser = activeUsers.get(targetUserId);

      if (targetUser) {
        io.to(targetUser.socketId).emit('call:ice-candidate', { candidate });
      }
    });

    socket.on('call:toggle-video', (data: { targetUserId: string; enabled: boolean }) => {
      const { targetUserId, enabled } = data;
      const targetUser = activeUsers.get(targetUserId);

      if (targetUser) {
        io.to(targetUser.socketId).emit('peer:video-toggle', { enabled });
      }
    });

    socket.on('call:toggle-audio', (data: { targetUserId: string; enabled: boolean }) => {
      const { targetUserId, enabled } = data;
      const targetUser = activeUsers.get(targetUserId);

      if (targetUser) {
        io.to(targetUser.socketId).emit('peer:audio-toggle', { enabled });
      }
    });

    socket.on('disconnect', async () => {
      let disconnectedUserId: string | null = null;
      
      for (const [userId, user] of activeUsers.entries()) {
        if (user.socketId === socket.id) {
          disconnectedUserId = userId;
          activeUsers.delete(userId);
          break;
        }
      }

      if (disconnectedUserId) {
        io.emit('user:offline', { userId: disconnectedUserId });

        for (const [callId, call] of activeCalls.entries()) {
          if (call.callerId === disconnectedUserId || call.receiverId === disconnectedUserId) {
            const otherUserId = call.callerId === disconnectedUserId ? call.receiverId : call.callerId;
            const otherUser = activeUsers.get(otherUserId);
            
            if (otherUser) {
              io.to(otherUser.socketId).emit('call:ended', { callId, reason: 'User disconnected' });
            }

            if (call.callDocumentId) {
              try {
                const endTime = new Date();
                const duration = Math.floor((endTime.getTime() - call.startTime.getTime()) / 1000);

                await Call.findByIdAndUpdate(call.callDocumentId, {
                  status: 'cancelled',
                  endTime,
                  duration,
                });

              } catch (error) {
                console.error('❌ Failed to update call on disconnect:', error);
              }
            }
            
            activeCalls.delete(callId);
          }
        }
      }
    });
  });

  return io;
};

export { activeUsers, activeCalls };