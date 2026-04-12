import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_BASE_URL } from '../api';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function useWebRTC(roomId) {
  const [localStream, setLocalStream] = useState(null);
  // Map of username -> MediaStream
  const [remoteStreams, setRemoteStreams] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [whiteboardData, setWhiteboardData] = useState(null);
  const [codeData, setCodeData] = useState(null);
  const [codeOutputData, setCodeOutputData] = useState(null);
  const [pollData, setPollData] = useState(null);
  const [assignmentData, setAssignmentData] = useState(null);
  const [admitRequest, setAdmitRequest] = useState(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const ws = useRef(null);
  // Map of username -> RTCPeerConnection
  // const peers = useRef({});
  const peers = useRef({});
  const localStreamRef = useRef(null);
  const webcamStreamRef = useRef(null); // Keep reference to original webcam so we can revert

  const connect = useCallback(async () => {
    try {
      // 1. Get local media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      webcamStreamRef.current = stream;

      // 2. Connect WebSocket
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('No auth token found');

      const isProd = !window.location.hostname.includes('localhost');
      
      // In production (AWS), we use query parameters for room identification.
      // In local (Daphne), we use the traditional path-based URL.
      const wsUrl = isProd 
        ? `${WS_BASE_URL}/?room_id=${roomId}&token=${token}`
        : `ws://127.0.0.1:8000/ws/video/${roomId}/?token=${token}`;
        
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => setIsConnected(true);

      ws.current.onmessage = async (e) => {
        const msg = JSON.parse(e.data);
        const { type, sender, payload } = msg;

        // Don't process our own generic broadcasts
        if (type !== 'chat' && msg.target && msg.target !== localStorage.getItem('username_temp_cache')) {
            // Wait, we don't have our own username reliably cached here, but backend filters for us based on target.
        }

        switch (type) {
          case 'participant_joined':
            handleParticipantJoined(sender);
            break;
          case 'participant_left':
            handleParticipantLeft(sender);
            break;
          case 'offer':
            await handleOffer(sender, payload);
            break;
          case 'answer':
            await handleAnswer(sender, payload);
            break;
          case 'ice_candidate':
            await handleIceCandidate(sender, payload);
            break;
          case 'chat':
            setChatMessages(prev => [...prev, { sender, text: msg.message, id: Date.now() + Math.random() }]);
            break;
          case 'whiteboard':
          case 'whiteboard_clear':
          case 'whiteboard_page':
            setWhiteboardData(msg);
            break;
          case 'code_change':
            setCodeData(msg);
            break;
          case 'code_output':
            setCodeOutputData(msg);
            break;
          case 'poll_update':
            setPollData(msg);
            break;
          case 'assignment_push':
            setAssignmentData(msg);
            break;
          case 'session_ended':
            setSessionEnded(true);
            break;
          case 'admit_request':
            setAdmitRequest(msg); // msg: { username, display_name }
            break;
          case 'error':
            setError(msg.message);
            disconnect();
            break;
          default:
            break;
        }
      };

      ws.current.onerror = (err) => {
        console.error('WebSocket Error:', err);
        setError('Lost connection to signaling server.');
      };

    } catch (err) {
      console.error('Failed to get local stream or connect:', err);
      setError('Could not access camera/microphone or connect to server.');
    }
  }, [roomId]);

  const disconnect = useCallback(() => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (localStreamRef.current && localStreamRef.current !== webcamStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    Object.values(peers.current).forEach(pc => pc.close());
    peers.current = {};
    if (ws.current) {
      ws.current.close();
    }
    setLocalStream(null);
    setRemoteStreams({});
    setIsConnected(false);
  }, []);

  // -- WebRTC Signaling Handlers -- //

  const createPeerConnection = (remoteUser) => {
    if (peers.current[remoteUser]) {
      return peers.current[remoteUser];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peers.current[remoteUser] = pc;

    // Add local tracks to this peer
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'ice_candidate',
          target: remoteUser,
          payload: event.candidate
        }));
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({
        ...prev,
        [remoteUser]: event.streams[0]
      }));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handleParticipantLeft(remoteUser);
      }
    };

    return pc;
  };

  const handleParticipantJoined = async (sender) => {
    // When someone joins, whoever is already in the room creates an offer for them
    const pc = createPeerConnection(sender);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.current.send(JSON.stringify({
        type: 'offer',
        target: sender,
        payload: pc.localDescription
      }));
    } catch (err) {
      console.error('Error creating offer for', sender, err);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        
        // Listen to browser's native "Stop Sharing" button
        screenStream.getVideoTracks()[0].onended = () => {
          revertToWebcam();
        };

        const videoTrack = screenStream.getVideoTracks()[0];
        
        // Replace video track in all existing peer connections
        Object.values(peers.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        });

        // Create new local stream with screen video + existing audio
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        const newStream = new MediaStream([videoTrack]);
        if (audioTrack) newStream.addTrack(audioTrack);
        
        setLocalStream(newStream);
        localStreamRef.current = newStream;
        setIsScreenSharing(true);
      } catch (err) {
        console.error("Failed to share screen", err);
      }
    } else {
      revertToWebcam();
    }
  };

  const revertToWebcam = () => {
    if (!webcamStreamRef.current) return;
    
    // Stop the screen track completely
    if (localStreamRef.current && localStreamRef.current !== webcamStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => t.stop());
    }

    const webcamVideoTrack = webcamStreamRef.current.getVideoTracks()[0];
    
    Object.values(peers.current).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender && webcamVideoTrack) sender.replaceTrack(webcamVideoTrack);
    });

    setLocalStream(webcamStreamRef.current);
    localStreamRef.current = webcamStreamRef.current;
    setIsScreenSharing(false);
  };

  const admitUser = (username) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'admit_user', username }));
    }
  };

  const handleOffer = async (sender, offerParams) => {
    const pc = createPeerConnection(sender);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offerParams));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.current.send(JSON.stringify({
        type: 'answer',
        target: sender,
        payload: pc.localDescription
      }));
    } catch (err) {
      console.error('Error handling offer from', sender, err);
    }
  };

  const handleAnswer = async (sender, answerParams) => {
    const pc = peers.current[sender];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answerParams));
      } catch (err) {
        console.error('Error setting remote answer from', sender, err);
      }
    }
  };

  const handleIceCandidate = async (sender, candidateParams) => {
    const pc = peers.current[sender];
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidateParams));
      } catch (err) {
        console.error('Error adding ICE candidate from', sender, err);
      }
    }
  };

  const handleParticipantLeft = (sender) => {
    if (peers.current[sender]) {
      peers.current[sender].close();
      delete peers.current[sender];
    }
    setRemoteStreams(prev => {
      const updated = { ...prev };
      delete updated[sender];
      return updated;
    });
  };

  // -- Chat & Controls -- //

  const sendChatMessage = (message) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'chat', message }));
    }
  };

  const sendWhiteboardData = (data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  };

  const sendCodeChange = (code) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'code_change', code }));
    }
  };

  const sendCodeOutput = (output) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'code_output', output }));
    }
  };

  const sendPollUpdate = (data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'poll_update', pollData: data }));
    }
  };

  const sendAssignmentPush = (data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'assignment_push', assignmentData: data }));
    }
  };

  const endSession = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'session_ended' }));
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  };

  return {
    localStream,
    remoteStreams,
    chatMessages,
    whiteboardData,
    codeData,
    codeOutputData,
    pollData,
    assignmentData,
    admitRequest,
    sessionEnded,
    error,
    isConnected,
    isScreenSharing,
    connect,
    disconnect,
    sendChatMessage,
    sendWhiteboardData,
    sendCodeChange,
    sendCodeOutput,
    sendPollUpdate,
    sendAssignmentPush,
    endSession,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    admitUser
  };
}
