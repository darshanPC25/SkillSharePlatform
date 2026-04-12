import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useNotifications — Real-time notification hook.
 * Connects to ws/notifications/ and manages the notification bell state.
 * Also exposes:
 *  - `toasts`          for the bottom-right toast banners
 *  - `popupRoom`       the chat room currently shown in the floating popup
 *  - `popupMessages`   messages in that popup room
 *  - `openChatPopup`   fn(room, currentMessages) — opens the popup
 *  - `dismissPopup`    fn() — closes the popup
 *  - `sendPopupMsg`    fn(text) — sends a message via the popup WebSocket
 *  - `addPopupMessage` fn(msg) — appends a received message to popupMessages
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  // ── Chat Popup state ──────────────────────────────────────────────────────
  const [popupRoom, setPopupRoom] = useState(null);         // { id, name, other_user }
  const [popupMessages, setPopupMessages] = useState([]);
  const popupWs = useRef(null);                              // dedicated WS for the popup room
  // ─────────────────────────────────────────────────────────────────────────

  const ws = useRef(null);
  const intentionalClose = useRef(false);

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addChatToast = useCallback((senderUsername, messageText) => {
    const toastId = `chat_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, {
      id: toastId,
      type: 'chat',
      message: `💬 ${senderUsername}: ${messageText.length > 60 ? messageText.slice(0, 60) + '…' : messageText}`,
      link: '/chat',
      is_read: false,
      created_at: new Date().toISOString(),
      _senderName: senderUsername,
    }]);
  }, []);

  // ── Chat Popup helpers ────────────────────────────────────────────────────
  /** Close the popup WebSocket cleanly */
  const closePopupWs = useCallback(() => {
    if (popupWs.current) {
      popupWs.current.close();
      popupWs.current = null;
    }
  }, []);

  /** Open popup for a room, optionally seeding with existing messages */
  const openChatPopup = useCallback((room, initialMessages = []) => {
    // Close any previous popup connection
    closePopupWs();

    setPopupRoom(room);
    setPopupMessages(initialMessages);

    const token = localStorage.getItem('access_token');
    if (!token || !room?.name) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//127.0.0.1:8000/ws/chat/${room.name}/?token=${token}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      const msg = {
        id: 'popup-ws-' + Date.now() + Math.random(),
        sender_username: data.username,
        content: data.message,
        attachment: data.attachment || null,
        timestamp: new Date().toISOString(),
        is_read: true,
      };
      setPopupMessages(prev => [...prev, msg]);
    };

    socket.onerror = (err) => console.warn('[ChatPopup] WS error:', err);
    popupWs.current = socket;
  }, [closePopupWs]);

  /** Dismiss / close the popup */
  const dismissPopup = useCallback(() => {
    closePopupWs();
    setPopupRoom(null);
    setPopupMessages([]);
  }, [closePopupWs]);

  /** Send a message through the popup WebSocket */
  const sendPopupMsg = useCallback((text) => {
    if (popupWs.current?.readyState === WebSocket.OPEN && text.trim()) {
      popupWs.current.send(JSON.stringify({ message: text }));
    }
  }, []);

  /** Append a message received externally (e.g. from useChatWebSocket) */
  const addPopupMessage = useCallback((msg) => {
    setPopupMessages(prev => [...prev, msg]);
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  const markAllRead = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: 'mark_all_read' }));
    }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  const markRead = useCallback((id) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: 'mark_read', id }));
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    intentionalClose.current = false;

    function createSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//127.0.0.1:8000/ws/notifications/?token=${token}`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('[Notifications] WS connected');
      };

      socket.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'initial_notifications') {
          setNotifications(msg.notifications);
          setUnreadCount(msg.notifications.filter(n => !n.is_read).length);
        } else if (msg.type === 'new_notification') {
          const notif = msg.notification;
          setNotifications(prev => [notif, ...prev]);
          setUnreadCount(prev => prev + 1);
          // Spawn toast
          const toastId = `toast_${Date.now()}_${Math.random()}`;
          setToasts(prev => [...prev, { ...notif, id: toastId }]);
        } else if (msg.type === 'incoming_call') {
          const notif = {
            id: `call_${Date.now()}_${Math.random()}`,
            type: 'video',
            message: `🎥 Incoming call from ${msg.caller}`,
            link: msg.room_url || `/class/${msg.room_id}`,
            is_read: false,
            created_at: new Date().toISOString(),
          };
          setNotifications(prev => [notif, ...prev]);
          setUnreadCount(prev => prev + 1);
          setToasts(prev => [...prev, notif]);
        }
      };

      socket.onerror = (err) => console.warn('[Notifications] WS error:', err);

      socket.onclose = () => {
        if (!intentionalClose.current) {
          setTimeout(() => {
            if (localStorage.getItem('access_token') && !intentionalClose.current) {
              ws.current = createSocket();
            }
          }, 5000);
        }
      };

      return socket;
    }

    ws.current = createSocket();

    return () => {
      intentionalClose.current = true;
      ws.current?.close();
      closePopupWs();
    };
  }, [closePopupWs]);

  return {
    notifications, unreadCount, markAllRead, markRead,
    toasts, dismissToast, addChatToast,
    // Chat popup
    popupRoom, popupMessages,
    openChatPopup, dismissPopup, sendPopupMsg, addPopupMessage,
  };
}
