import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, XCircle, Wifi } from 'lucide-react';
import api, { WS_BASE_URL } from '../api';

export function WaitingRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('connecting'); // connecting | waiting | denied | error
  const [roomTitle, setRoomTitle] = useState('');
  const [hostName, setHostName] = useState('');
  const wsRef = useRef(null);
  const username = localStorage.getItem('username_temp_cache');

  useEffect(() => {
    let mounted = true;

    // Step 1: Confirm the room exists and we need to wait
    api.post(`video/class/${roomId}/join/`)
      .then(res => {
        if (!mounted) return;

        if (res.data.status === 'host' || res.data.status === 'joined') {
          // Already admitted or is the host — go straight in
          navigate(`/class/${roomId}`, { replace: true });
          return;
        }

        if (res.data.status === 'waiting') {
          setRoomTitle(res.data.title);
          setHostName(res.data.host);
          setStatus('waiting');

          // Step 2: Open personal WS channel and wait for host decision
          const token = localStorage.getItem('access_token');
          const isProd = !window.location.hostname.includes('localhost');
          const wsUrl = isProd
            ? `${WS_BASE_URL}/waiting/${roomId}/?token=${token}`
            : `ws://127.0.0.1:8000/ws/waiting/${roomId}/?token=${token}`;
          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;

          ws.onopen = () => {
            // Step 3: Signal to the room that we're knocking
            connectToRoomAndKnock(roomId, res.data.user, token);
          };

          ws.onmessage = (e) => {
            const msg = JSON.parse(e.data);
            if (msg.type === 'admission_result') {
              if (msg.result === 'admitted') {
                // Mark ourselves as an admitted participant then enter
                api.post(`video/class/${roomId}/admit/`, { username: res.data.user })
                  .catch(() => {}) // Best effort — the host already admitted us server-side
                  .finally(() => {
                    navigate(`/class/${roomId}`, { replace: true });
                  });
              } else {
                setStatus('denied');
              }
            }
          };

          ws.onerror = () => setStatus('error');
        }
      })
      .catch(err => {
        if (!mounted) return;
        const msg = err.response?.data?.error || 'Could not connect to the session.';
        alert(msg);
        navigate('/dashboard');
      });

    return () => {
      mounted = false;
      if (wsRef.current) wsRef.current.close();
    };
  }, [roomId, navigate]);

  // Temporarily connect to the MAIN room WebSocket just to knock
  function connectToRoomAndKnock(roomId, user, token) {
    const isProd = !window.location.hostname.includes('localhost');
    const knockUrl = isProd
      ? `${WS_BASE_URL}/video/${roomId}/?token=${token}`
      : `ws://127.0.0.1:8000/ws/video/${roomId}/?token=${token}`;
    const knockWs = new WebSocket(knockUrl);
    knockWs.onopen = () => {
      knockWs.send(JSON.stringify({
        type: 'admit_request',
        username: user,
        display_name: user,
      }));
      // Close this temporary signaling connection immediately after knocking
      setTimeout(() => knockWs.close(), 1000);
    };
  }

  const dots = ['●', '●', '●'];

  return (
    <div className="min-h-[85vh] flex items-center justify-center">
      <AnimatePresence mode="wait">
        {status === 'waiting' && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center max-w-md w-full"
          >
            {/* Animated waiting icon */}
            <div className="relative mb-8">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#ea580c]/20 to-orange-900/10 border-2 border-[#ea580c]/30 flex items-center justify-center shadow-[0_0_60px_rgba(234,88,12,0.15)]">
                <Clock className="w-12 h-12 text-[#ea580c]" />
              </div>
              {/* Pulsing ring */}
              <div className="absolute inset-0 rounded-full border-2 border-[#ea580c]/20 animate-ping" />
            </div>

            <h1 className="text-3xl font-display font-bold text-white mb-2">Waiting to Join</h1>
            <p className="text-gray-400 mb-1">
              You're in the lobby for <span className="text-white font-semibold">"{roomTitle}"</span>
            </p>
            <p className="text-gray-500 text-sm mb-8">
              Waiting for <span className="text-[#ea580c]">{hostName}</span> to admit you…
            </p>

            {/* Animated dots */}
            <div className="flex space-x-2 text-[#ea580c] text-2xl">
              {dots.map((dot, i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.3 }}
                >
                  {dot}
                </motion.span>
              ))}
            </div>

            <div className="mt-10 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-left w-full">
              <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                <Wifi className="w-3 h-3" /> <span className="uppercase tracking-widest">Session Info</span>
              </div>
              <p className="text-sm text-gray-300">Room: <span className="font-mono text-gray-400">{roomId}</span></p>
              <p className="text-sm text-gray-300 mt-1">Your name: <span className="text-white font-semibold">{username || 'Unknown'}</span></p>
            </div>

            <button
              onClick={() => { if (wsRef.current) wsRef.current.close(); navigate('/dashboard'); }}
              className="mt-6 text-sm text-red-400 hover:text-red-300 transition-colors flex items-center"
            >
              <XCircle className="w-4 h-4 mr-1" /> Leave Queue
            </button>
          </motion.div>
        )}

        {status === 'denied' && (
          <motion.div
            key="denied"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center max-w-md"
          >
            <div className="w-24 h-24 rounded-full bg-red-900/20 border-2 border-red-500/40 flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Request Declined</h2>
            <p className="text-gray-400 text-sm mb-6">The host has declined your request to join this session.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors"
            >
              Return to Dashboard
            </button>
          </motion.div>
        )}

        {status === 'connecting' && (
          <motion.div key="connecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-500 text-sm">
            Verifying session…
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
