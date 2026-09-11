const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const authMiddleware = require('./middleware/auth');
const aiRoutes = require('./routes/ai');

const app = express();

app.use(cors()); // Configure according to your needs
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Protect AI routes with our token verification
app.use('/api/ai', authMiddleware, aiRoutes);

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  maxHttpBufferSize: 5e7, // 50 MB
  cors: {
    origin: "*", // Adjust for security in production if needed
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Host creates a room
  socket.on('create-room', ({ roomId, username }, callback) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.isHost = true;
    socket.username = username || 'Host';
    console.log(`Room created: ${roomId} by host ${socket.id} (${socket.username})`);
    if (callback) callback({ success: true, roomId });
  });

  // Guest joins a room
  socket.on('join-room', ({ roomId, username }, callback) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room) {
      if (callback) callback({ success: false, error: 'Room not found' });
      return;
    }
    
    socket.join(roomId);
    socket.roomId = roomId;
    socket.isHost = false;
    socket.username = username || 'Guest';
    console.log(`Guest ${socket.id} (${socket.username}) joined room ${roomId}`);
    
    // Notify host that a guest joined
    socket.to(roomId).emit('guest-joined', { guestId: socket.id, username: socket.username });
    
    if (callback) callback({ success: true, roomId });
  });

  // Relay requests from Guest to Host
  socket.on('request-file-tree', (data, callback) => {
    if (!socket.roomId) return;
    // Broadcast to the room (which includes the host)
    // The host will listen for 'request-file-tree'
    socket.to(socket.roomId).emit('host-request-file-tree', { guestId: socket.id });
    if (callback) callback({ pending: true });
  });

  socket.on('request-file-content', (data, callback) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('host-request-file-content', { guestId: socket.id, path: data.path });
    if (callback) callback({ pending: true });
  });

  // Host responds to Guest
  socket.on('response-file-tree', (data) => {
    if (!socket.roomId) return;
    // Send specifically to the requesting guest
    io.to(data.guestId).emit('guest-receive-file-tree', { tree: data.tree });
  });

  socket.on('response-file-content', (data) => {
    if (!socket.roomId) return;
    io.to(data.guestId).emit('guest-receive-file-content', { path: data.path, content: data.content, originalContent: data.originalContent });
  });

  // Relay file edits (Host to Guests, or Guest to Host/Guests)
  socket.on('file-edit', (data) => {
    if (!socket.roomId) return;
    // For now, broadcast to everyone else in the room
    socket.to(socket.roomId).emit('sync-file-edit', data);
  });
  
  socket.on('file-save', (data) => {
    if (!socket.roomId) return;
    // Guest wants to save a file, send to Host to write to disk
    socket.to(socket.roomId).emit('host-file-save', data);
  });

  socket.on('file-action', (data, callback) => {
    if (!socket.roomId) return;
    // Guest wants to create/delete/rename, send to Host
    // data: { action: 'createFile'|'createFolder'|'rename'|'delete', args: [...] }
    socket.to(socket.roomId).emit('host-file-action', { guestId: socket.id, ...data });
    if (callback) callback({ pending: true });
  });
  
  socket.on('sync-file-tree', (data) => {
    if (!socket.roomId) return;
    // Host broadcasts new file tree to guests
    socket.to(socket.roomId).emit('guest-receive-file-tree', { tree: data.tree });
  });

  socket.on('cursor-move', (data) => {
    if (!socket.roomId) return;
    // Broadcast cursor to everyone else in the room
    socket.to(socket.roomId).emit('cursor-update', { ...data, userId: socket.id, username: socket.username });
  });

  // --- WebRTC Audio Signaling ---
  socket.on('webrtc-offer', (data) => {
    if (!socket.roomId) return;
    socket.to(data.targetId).emit('webrtc-offer', { ...data, senderId: socket.id });
  });

  socket.on('webrtc-answer', (data) => {
    if (!socket.roomId) return;
    socket.to(data.targetId).emit('webrtc-answer', { ...data, senderId: socket.id });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    if (!socket.roomId) return;
    socket.to(data.targetId).emit('webrtc-ice-candidate', { ...data, senderId: socket.id });
  });

  socket.on('webrtc-join', () => {
    if (!socket.roomId) return;
    // Broadcast to everyone else that we joined the audio call
    socket.to(socket.roomId).emit('webrtc-peer-joined', { peerId: socket.id });
  });

  // --- AI Collaboration Relays ---
  socket.on('guest-ai-request', (data) => {
    if (!socket.roomId) return;
    // Guest asks Host to run AI
    socket.to(socket.roomId).emit('host-receive-ai-request', { ...data, guestId: socket.id });
  });

  socket.on('host-ai-chunk', (data) => {
    if (!socket.roomId) return;
    // Host broadcasts AI text chunks to all guests
    socket.to(socket.roomId).emit('guest-receive-ai-chunk', data);
  });

  socket.on('host-ai-status', (data) => {
    if (!socket.roomId) return;
    // Host broadcasts AI status updates
    socket.to(socket.roomId).emit('guest-receive-ai-status', data);
  });

  socket.on('host-ai-response', (data) => {
    if (!socket.roomId) return;
    // Host broadcasts final AI response
    socket.to(socket.roomId).emit('guest-receive-ai-response', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.roomId) {
      if (socket.isHost) {
        // Host disconnected, notify guests
        socket.to(socket.roomId).emit('host-disconnected');
      } else {
        // Guest disconnected, notify host
        socket.to(socket.roomId).emit('guest-left', { guestId: socket.id });
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend SKJ IDE is running on port ${PORT}`);
});
