import React, { useState, useEffect, useRef } from 'react';
import { collaborationService } from '../../services/collaborationService';
import './AudioPanel.css';

export default function AudioPanel() {
  const [audioStatus, setAudioStatus] = useState('idle'); // idle, joined, error
  const [isMuted, setIsMuted] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const streamsContainerRef = useRef(null);
  // Re-render when room status changes so it mounts/unmounts properly
  const [roomId, setRoomId] = useState(collaborationService.roomId);

  useEffect(() => {
    const statusCleanup = collaborationService.onChange('audio-status', (status) => {
      setAudioStatus(status);
      if (status === 'left') {
        setRemoteStreams(new Map());
        setIsMuted(false);
      }
    });

    const mutedCleanup = collaborationService.onChange('audio-muted', (muted) => {
      setIsMuted(muted);
    });

    const streamAddedCleanup = collaborationService.onChange('remote-stream-added', ({ peerId, stream }) => {
      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.set(peerId, stream);
        return next;
      });
    });

    const roomCleanup = collaborationService.onChange('status', () => {
      setRoomId(collaborationService.roomId);
    });

    return () => {
      statusCleanup();
      mutedCleanup();
      streamAddedCleanup();
      roomCleanup();
    };
  }, []);

  // Effect to attach streams to audio elements dynamically
  useEffect(() => {
    if (!streamsContainerRef.current) return;
    
    // Clear previous audio elements
    streamsContainerRef.current.innerHTML = '';
    
    remoteStreams.forEach((stream, peerId) => {
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.srcObject = stream;
      streamsContainerRef.current.appendChild(audioEl);
    });
  }, [remoteStreams]);

  if (!roomId) {
    return null; // Don't show if not in a room
  }

  const handleJoin = () => {
    collaborationService.joinAudio();
  };

  const handleLeave = () => {
    collaborationService.leaveAudio();
  };

  const handleToggleMute = () => {
    collaborationService.toggleMute();
  };

  return (
    <div className="audio-panel">
      {audioStatus === 'idle' || audioStatus === 'left' ? (
        <button className="audio-btn join-btn" onClick={handleJoin} title="Rejoindre l'appel vocal">
          📞 Appel Vocal
        </button>
      ) : (
        <div className="audio-controls">
          <div className="audio-indicator pulse"></div>
          <span className="audio-text">En Appel ({remoteStreams.size + 1})</span>
          <button 
            className={`audio-icon-btn ${isMuted ? 'muted' : ''}`} 
            onClick={handleToggleMute}
            title={isMuted ? "Activer le micro" : "Couper le micro"}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>
          <button className="audio-icon-btn leave-btn" onClick={handleLeave} title="Quitter l'appel">
            ❌
          </button>
        </div>
      )}
      
      {/* Hidden container for remote audio streams */}
      <div ref={streamsContainerRef} style={{ display: 'none' }}></div>
    </div>
  );
}
