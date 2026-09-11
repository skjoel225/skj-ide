import React, { useState, useRef, useEffect } from 'react';
import './ChatPanel.css';

export default function ChatInput({ onSend, isLoading }) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'fr-FR';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => {
          const sep = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
          return prev + sep + transcript;
        });
      };

      recognitionRef.current.onend = () => setIsRecording(false);
      recognitionRef.current.onerror = (event) => {
        setIsRecording(false);
        alert("Erreur du micro (Electron/Chrome) : " + event.error);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("La reconnaissance vocale n'est pas supportée dans ce navigateur.");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput('');
      if (isRecording && recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  return (
    <div className="chat-input-container">
      <textarea
        ref={textareaRef}
        className="chat-textarea selectable"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Posez une question sur votre projet..."
        disabled={isLoading}
        rows={1}
      />
      <button 
        className={`chat-mic-btn ${isRecording ? 'recording' : ''}`} 
        onClick={toggleRecording}
        title="Parler au microphone"
      >
        🎤
      </button>
      <button 
        className="chat-send-btn" 
        onClick={handleSend} 
        disabled={!input.trim() || isLoading}
      >
        ➤
      </button>
    </div>
  );
}
