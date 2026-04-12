import { useState, useEffect, useRef } from 'react';
import { WS_BASE_URL } from '../api';

export function useChatWebSocket(roomName, { onNewMessage } = {}) {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage; // always up-to-date without re-running effect

  useEffect(() => {
    if (!roomName) {
      setMessages([]);
      return;
    }

    const token = localStorage.getItem('access_token');
    const isProd = !window.location.hostname.includes('localhost');
    
    // In production (AWS), we use query parameters for room identification.
    // In local (Daphne), we use the traditional path-based URL.
    const wsUrl = isProd 
      ? `${WS_BASE_URL}/?room_id=${roomName}&token=${token}`
      : `ws://127.0.0.1:8000/ws/chat/${roomName}/?token=${token}`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => setIsConnected(true);

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      const msg = {
        id: 'ws-' + Date.now() + Math.random(),
        sender_username: data.username,
        content: data.message,
        timestamp: new Date().toISOString(),
        is_read: true
      };
      setMessages(prev => [...prev, msg]);

      // Fire callback so callers can show toasts etc.
      if (onNewMessageRef.current) {
        onNewMessageRef.current(msg);
      }
    };

    ws.current.onclose = () => setIsConnected(false);

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [roomName]);

  const sendMessage = (content) => {
    if (ws.current?.readyState === WebSocket.OPEN && content.trim() !== '') {
      ws.current.send(JSON.stringify({ message: content }));
    }
  };

  return { messages, setMessages, isConnected, sendMessage };
}
