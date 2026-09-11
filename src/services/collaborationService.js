import { io } from 'socket.io-client';
import { fileService } from './fileService';

class CollaborationService {
  constructor() {
    this.socket = null;
    this.isHost = false;
    this.roomId = null;
    this.listeners = new Map();
    this.pendingRequests = new Map();
    this.requestIdCounter = 0;
    this.guests = new Map(); // guestId -> { username, permission: 'read' | 'write' }
    this.username = '';
    this.isConnected = false;
    
    // WebRTC Peer Connections mapping: guestId -> RTCPeerConnection
    this.peerConnections = new Map();
    this.localStream = null;

    // Attach local AI electron listeners once
    this.attachLocalAIListeners();
  }

  attachLocalAIListeners() {
    if (window.electronAPI && window.electronAPI.ai) {
      window.electronAPI.ai.onAgentMessageChunk((chunk) => {
        if (this.isHost && this.roomId && this.socket) {
           this.socket.emit('host-ai-chunk', chunk);
        }
      });
      window.electronAPI.ai.onAgentStatus((status) => {
        if (this.isHost && this.roomId && this.socket) {
           this.socket.emit('host-ai-status', { type: 'agent', ...status });
        }
      });
      window.electronAPI.ai.onOrchestratorStatus((status) => {
        if (this.isHost && this.roomId && this.socket) {
           this.socket.emit('host-ai-status', { type: 'orchestrator', status });
        }
      });
    }
  }

  connect() {
    if (this.socket) return;
    
    // Connect to the backend
    const isDev = process.env.NODE_ENV === 'development' || !window.electronAPI;
    const BACKEND_URL = isDev ? 'http://localhost:3000' : 'https://skj-ide.onrender.com';
    
    this.socket = io(BACKEND_URL);

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.emitChange('status', 'connected');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.emitChange('status', 'disconnected');
    });

    this.socket.on('guest-joined', (data) => {
      console.log('Guest joined:', data.username);
      if (this.isHost) {
        this.guests.set(data.guestId, { username: data.username, permission: 'read' });
        this.emitChange('guests-updated', Array.from(this.guests.entries()));
      }
      this.emitChange('guest-joined', data);
    });

    this.socket.on('guest-left', (data) => {
      console.log('Guest left:', data.guestId);
      if (this.isHost) {
        this.guests.delete(data.guestId);
        this.emitChange('guests-updated', Array.from(this.guests.entries()));
      }
      this.emitChange('guest-left', data.guestId);
    });

    this.socket.on('host-disconnected', () => {
      alert('The host has disconnected. Collaboration session ended.');
      this.leaveRoom();
    });

    // --- Host Listeners ---
    this.socket.on('host-request-file-tree', async (data) => {
      if (!this.isHost) return;
      try {
        const currentRoot = window.collaborationRoot;
        if (!currentRoot) return;
        
        // Use the raw electron API so we bypass any proxy logic
        const tree = await window.electronAPI.fs.readDir(currentRoot);
        this.socket.emit('response-file-tree', { guestId: data.guestId, tree });
      } catch (e) {
        console.error(e);
      }
    });

    this.socket.on('host-request-file-content', async (data) => {
      if (!this.isHost) return;
      try {
        const { content } = await window.electronAPI.fs.readFile(data.path);
        this.socket.emit('response-file-content', { guestId: data.guestId, path: data.path, content, originalContent: content });
      } catch (e) {
        console.error(e);
      }
    });

    this.socket.on('host-file-save', async (data) => {
      if (!this.isHost) return;
      const guest = this.guests.get(data.guestId);
      if (!guest || guest.permission !== 'write') {
        console.warn(`Blocked write attempt from ${guest ? guest.username : 'unknown'} (read-only)`);
        return; // Alternatively, emit an error back to the guest
      }
      try {
        await window.electronAPI.fs.writeFile(data.path, data.content);
        // Broadcast change
        this.socket.emit('file-edit', { path: data.path, content: data.content });
      } catch (e) {
        console.error(e);
      }
    });

    this.socket.on('host-file-action', async (data) => {
      if (!this.isHost) return;
      const guest = this.guests.get(data.guestId);
      if (!guest || guest.permission !== 'write') {
        console.warn(`Blocked file action attempt from ${guest ? guest.username : 'unknown'} (read-only)`);
        return;
      }
      try {
        if (data.action === 'createFile') {
          await window.electronAPI.fs.createFile(data.args[0]);
        } else if (data.action === 'createFolder') {
          await window.electronAPI.fs.createFolder(data.args[0]);
        } else if (data.action === 'rename') {
          await window.electronAPI.fs.rename(data.args[0], data.args[1]);
        } else if (data.action === 'delete') {
          await window.electronAPI.fs.delete(data.args[0], data.args[1]);
        }
        this.broadcastFileTree();
      } catch (e) {
        console.error(e);
      }
    });

    // --- Guest Listeners ---
    this.socket.on('guest-receive-file-tree', (data) => {
      const callback = this.pendingRequests.get('tree');
      if (callback) {
        callback(data.tree);
        this.pendingRequests.delete('tree');
      }
      this.emitChange('file-tree', data.tree);
    });

    this.socket.on('guest-receive-file-content', (data) => {
      const callback = this.pendingRequests.get(`read-${data.path}`);
      if (callback) {
        callback({ content: data.content, originalContent: data.originalContent });
        this.pendingRequests.delete(`read-${data.path}`);
      }
    });

    this.socket.on('sync-file-edit', (data) => {
      this.emitChange('file-edit', data);
    });

    this.socket.on('cursor-update', (data) => {
      this.emitChange('cursor-update', data);
    });

    // --- AI Relays ---
    this.socket.on('host-receive-ai-request', async (data) => {
      if (!this.isHost) return;
      try {
        // Run AI locally for the room
        const response = await window.electronAPI.ai.runAgent(data.messages, window.collaborationRoot, data.sessionId);
        this.socket.emit('host-ai-response', { sessionId: data.sessionId, response });
      } catch (e) {
        console.error("AI execution failed on Host", e);
      }
    });

    this.socket.on('guest-receive-ai-chunk', (data) => {
      this.emitChange('ai-chunk', data);
    });

    this.socket.on('guest-receive-ai-status', (data) => {
      this.emitChange('ai-status', data);
    });

    this.socket.on('guest-receive-ai-response', (data) => {
      this.emitChange('ai-response', data);
    });

    // --- WebRTC Relays ---
    this.socket.on('webrtc-peer-joined', async (data) => {
      if (!this.localStream) return;
      const { peerId } = data;
      const pc = this.createPeerConnection(peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.socket.emit('webrtc-offer', { targetId: peerId, offer });
    });

    this.socket.on('webrtc-offer', async (data) => {
      if (!this.localStream) return;
      const { senderId, offer } = data;
      const pc = this.createPeerConnection(senderId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.socket.emit('webrtc-answer', { targetId: senderId, answer });
    });

    this.socket.on('webrtc-answer', async (data) => {
      if (!this.localStream) return;
      const { senderId, answer } = data;
      const pc = this.peerConnections.get(senderId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    this.socket.on('webrtc-ice-candidate', async (data) => {
      if (!this.localStream) return;
      const { senderId, candidate } = data;
      const pc = this.peerConnections.get(senderId);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  }

  updateGuestPermission(guestId, permission) {
    if (!this.isHost) return;
    const guest = this.guests.get(guestId);
    if (guest) {
      guest.permission = permission;
      this.guests.set(guestId, guest);
      this.emitChange('guests-updated', Array.from(this.guests.entries()));
      // Optional: notify guest about permission change
    }
  }

  async broadcastFileTree() {
    if (!this.isHost || !window.collaborationRoot) return;
    try {
      const tree = await window.electronAPI.fs.readDir(window.collaborationRoot);
      this.socket.emit('sync-file-tree', { tree });
    } catch (e) {
      console.error(e);
    }
  }

  generateCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  createRoom(projectRoot, username) {
    this.connect();
    this.username = username;
    return new Promise((resolve) => {
      const code = this.generateCode();
      this.socket.emit('create-room', { roomId: code, username }, (response) => {
        if (response.success) {
          this.isHost = true;
          this.roomId = code;
          this.guests.clear();
          window.collaborationRoot = projectRoot;
          this.emitChange('status', 'hosting');
          resolve(code);
        } else {
          resolve(null);
        }
      });
    });
  }

  joinRoom(code, username) {
    this.connect();
    this.username = username;
    return new Promise((resolve) => {
      this.socket.emit('join-room', { roomId: code, username }, (response) => {
        if (response.success) {
          this.isHost = false;
          this.roomId = code;
          this.emitChange('status', 'joined');
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  leaveRoom() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isHost = false;
    this.roomId = null;
    window.collaborationRoot = null;
    this.emitChange('status', 'idle');
  }

  // --- API for Guest File Service ---
  requestFileTree() {
    return new Promise((resolve) => {
      this.pendingRequests.set('tree', resolve);
      this.socket.emit('request-file-tree', {});
    });
  }

  requestFileContent(path) {
    return new Promise((resolve) => {
      this.pendingRequests.set(`read-${path}`, resolve);
      this.socket.emit('request-file-content', { path });
    });
  }

  saveFile(path, content) {
    this.socket.emit('file-save', { path, content });
  }

  syncFileEdit(path, content) {
    if (this.socket && this.roomId) {
      this.socket.emit('file-edit', { path, content });
    }
  }

  performFileAction(action, args) {
    return new Promise((resolve) => {
      this.socket.emit('file-action', { action, args }, (res) => {
        resolve(res);
      });
    });
  }

  sendCursorMove(path, position) {
    if (this.socket && this.roomId) {
      this.socket.emit('cursor-move', { path, position });
    }
  }

  // --- API for Shared AI ---
  sendAIRequest(messages, sessionId) {
    if (this.socket && this.roomId && !this.isHost) {
      this.socket.emit('guest-ai-request', { messages, sessionId });
    }
  }

  // --- WebRTC Audio Logic ---
  async joinAudio() {
    if (!this.socket || !this.roomId) return;
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.socket.emit('webrtc-join');
      this.emitChange('audio-status', 'joined');
    } catch (e) {
      console.error('Failed to get local audio', e);
      this.emitChange('audio-status', 'error');
    }
  }

  leaveAudio() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.emitChange('audio-status', 'left');
    this.emitChange('remote-streams-updated', []); // Clear all streams
  }

  toggleMute() {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !audioTracks[0].enabled;
        this.emitChange('audio-muted', !audioTracks[0].enabled);
      }
    }
  }

  createPeerConnection(peerId) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc-ice-candidate', { targetId: peerId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      this.emitChange('remote-stream-added', { peerId, stream: event.streams[0] });
    };

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  onChange(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event).delete(callback);
  }

  emitChange(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }
}

export const collaborationService = new CollaborationService();
