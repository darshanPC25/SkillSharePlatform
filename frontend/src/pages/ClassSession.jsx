import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Send, MessageSquare, Users, Copy, Check, PenTool, Code, LayoutGrid, Download, Circle, Play, ChevronLeft, ChevronRight, Plus, BarChart2, MonitorUp, ChevronDown, Maximize2, Minimize2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';
import api from '../api';
import { jsPDF } from "jspdf";
import { Select } from '../components/ui/Select';

function VideoElement({ stream, isLocal, username, isPinned, onPin }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative bg-[#141414] rounded-2xl overflow-hidden border border-white/5 flex-shrink-0 group transition-all ${isPinned ? 'w-full h-full shadow-2xl' : 'flex-1 min-w-[200px] max-w-[400px] aspect-video'}`}>
      <video ref={videoRef} autoPlay playsInline muted={isLocal} className="w-full h-full object-cover" />
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-medium text-white flex items-center space-x-2">
        <span>{username ? <Link to={`/u/${username}`} target="_blank" className="hover:text-[#ea580c] transition-colors">{username}</Link> : 'Unknown Peer'}</span>
        {isLocal && <span className="w-2 h-2 rounded-full bg-[#ea580c] animate-pulse"></span>}
      </div>
      <button 
        onClick={onPin} 
        className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-md hover:bg-[#ea580c] opacity-0 group-hover:opacity-100 transition-all rounded-lg text-white"
        title={isPinned ? 'Unpin' : 'Pin'}
      >
        {isPinned ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function ClassSession() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [classInfo, setClassInfo] = useState(null);
  const [chatOpen, setChatOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('chat'); // chat | polls | eval
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('video'); // video | whiteboard | code
  const [pinnedUser, setPinnedUser] = useState(null);
  
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  // Poll State
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [activePoll, setActivePoll] = useState(null);

  // Wait queue (visible only to host)
  const [admitQueue, setAdmitQueue] = useState([]); // [{username, display_name}]

  // Live Assignment State
  const [hostAssignments, setHostAssignments] = useState([]);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [assignmentAnswers, setAssignmentAnswers] = useState({});
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const lastProcessedAssignment = useRef(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);

  // Rating State
  const [showRatingModal, setShowRatingModal] = useState(false);
  
  // Host Exit State
  const [showHostExitModal, setShowHostExitModal] = useState(false);

  const STARTER_CODES = {
    python: 'print("Hello from SkillSwap!")\n',
    javascript: 'console.log("Hello from SkillSwap!");\n',
    java: 'class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from SkillSwap!");\n    }\n}\n',
    cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello from SkillSwap!" << std::endl;\n    return 0;\n}\n'
  };

  // Code Editor State
  const [code, setCode] = useState(STARTER_CODES.python);
  const [language, setLanguage] = useState('python');
  const [codeOutput, setCodeOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Whiteboard State
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(2);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastProcessedPoll = useRef(null);

  // Pagination Architecture (Offscreen independent canvases)
  const [currentPage, setCurrentPage] = useState(0);
  const [boardTotalPages, setBoardTotalPages] = useState(1);
  const pageCanvasesRef = useRef({});
  const lastProcessedWhiteboard = useRef(null);

  const getPageCanvas = useCallback((idx) => {
     if (!pageCanvasesRef.current[idx]) {
         const c = document.createElement('canvas');
         const parent = canvasRef.current?.parentElement;
         // Give default sizes if UI isn't fully mounted
         c.width = parent ? parent.clientWidth : 800;
         c.height = parent ? (parent.clientHeight - 60) : 600;
         pageCanvasesRef.current[idx] = c;
     }
     return pageCanvasesRef.current[idx];
  }, []);

  const renderVisibleCanvas = useCallback((idx) => {
     if (!canvasRef.current) return;
     const ctx = canvasRef.current.getContext('2d');
     ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
     const pageCanvas = getPageCanvas(idx);
     ctx.drawImage(pageCanvas, 0, 0);
  }, [getPageCanvas]);

  const {
    localStream, remoteStreams, chatMessages, error, isConnected,
    whiteboardData, codeData, codeOutputData, pollData, assignmentData, admitRequest,
    sessionEnded,
    connect, disconnect, sendChatMessage,
    sendWhiteboardData, sendCodeChange, sendCodeOutput, sendPollUpdate, sendAssignmentPush,
    endSession,
    toggleAudio, toggleVideo, toggleScreenShare, isScreenSharing, admitUser
  } = useWebRTC(roomId);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatOpen]);

  useEffect(() => {
    let mounted = true;
    api.post(`video/class/${roomId}/join/`)
      .then(res => {
        if (!mounted) return;
        const { status, title, host, user } = res.data;

        // Waiting room: API returned 'waiting' — redirect to lobby, let host admit
        if (status === 'waiting') {
          localStorage.setItem('username_temp_cache', user);
          navigate(`/waiting/${roomId}`, { replace: true });
          return;
        }

        // Host or previously admitted — enter directly
        setClassInfo(res.data);
        localStorage.setItem('username_temp_cache', user);
        connect(user);
        
        // If Host, fetch assignments they can push
        if (host === user) {
           api.get('dashboard/assignments/').then(rData => {
              // We only want assignments they created
              setHostAssignments(rData.data); 
           });
        }
      })
      .catch(err => {
        if (!mounted) return;
        console.error('Failed to join class:', err);
        alert(err.response?.data?.error || 'Failed to join class session.');
        navigate('/dashboard');
      });
    return () => { mounted = false; disconnect(); };
  }, [roomId, connect, disconnect, navigate]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/class/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- External Data Sync Listeners ---
  useEffect(() => {
    if (codeData && codeData.sender !== localStorage.getItem('username_temp_cache')) {
      setCode(codeData.code);
    }
  }, [codeData]);

  useEffect(() => {
    if (codeOutputData && codeOutputData.sender !== localStorage.getItem('username_temp_cache')) {
      setCodeOutput(codeOutputData.output);
    }
  }, [codeOutputData]);

  useEffect(() => {
    if (whiteboardData && activeTab === 'whiteboard' && canvasRef.current) {
        if (whiteboardData.sender === localStorage.getItem('username_temp_cache')) return;
        if (whiteboardData.msgId && whiteboardData.msgId === lastProcessedWhiteboard.current) return;
        
        lastProcessedWhiteboard.current = whiteboardData.msgId;
        
        // Extract target page index from WS event, or default to sender's last known if undefined
        const targetPageIdx = whiteboardData.pageIndex !== undefined ? whiteboardData.pageIndex : currentPage;

        if (whiteboardData.type === 'whiteboard_clear') {
            const tCanvas = getPageCanvas(targetPageIdx);
            tCanvas.getContext('2d').clearRect(0, 0, tCanvas.width, tCanvas.height);
            if (targetPageIdx === currentPage) renderVisibleCanvas(currentPage);
            return;
        }

        // We completely ignore whiteboard_page (switch) events now, 
        // to allow independent collaborative workspaces across different pages!

        if (whiteboardData.type === 'whiteboard' && whiteboardData.action === 'draw') {
            const tCanvas = getPageCanvas(targetPageIdx);
            const ctx = tCanvas.getContext('2d');
            ctx.beginPath();
            ctx.moveTo(whiteboardData.lastX, whiteboardData.lastY);
            ctx.lineTo(whiteboardData.x, whiteboardData.y);
            ctx.strokeStyle = whiteboardData.color;
            ctx.lineWidth = whiteboardData.size;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.closePath();

            // Only redraw visual layer if we are actively looking at the modified page
            if (targetPageIdx === currentPage) {
               renderVisibleCanvas(currentPage);
            }

            // If a peer draws on a page index that doesn't exist for us yet, expand pagination limit
            setBoardTotalPages(prev => Math.max(prev, targetPageIdx + 1));
        }
    }
  }, [whiteboardData, activeTab, currentPage, renderVisibleCanvas, getPageCanvas]);

  useEffect(() => {
    if (!pollData) return;
    if (pollData.msgId && pollData.msgId === lastProcessedPoll.current) return;
    lastProcessedPoll.current = pollData.msgId;

    if (pollData.sender === localStorage.getItem('username_temp_cache')) return;

    const pd = pollData.pollData;
    if (pd.action === 'create') {
       setActivePoll({ ...pd.poll, hasVoted: false });
       setSidebarTab('polls');
       if (!chatOpen) setChatOpen(true);
    } else if (pd.action === 'vote') {
       setActivePoll(prev => {
          if (!prev) return prev;
          const updated = JSON.parse(JSON.stringify(prev));
          updated.options[pd.optionIndex].votes += 1;
          updated.totalVotes += 1;
          return updated;
       });
    } else if (pd.action === 'clear') {
       setActivePoll(null);
    }
  }, [pollData, chatOpen]);

  useEffect(() => {
    if (!assignmentData) return;
    if (assignmentData.msgId && assignmentData.msgId === lastProcessedAssignment.current) return;
    lastProcessedAssignment.current = assignmentData.msgId;
    if (assignmentData.sender === localStorage.getItem('username_temp_cache')) return;

    const ad = assignmentData.assignmentData;
    if (ad.action === 'push') {
       setActiveAssignment(ad.assignment);
    } else if (ad.action === 'clear') {
       setActiveAssignment(null);
    }
  }, [assignmentData]);

  // Host ended the session
  useEffect(() => {
    if (sessionEnded) {
       if (classInfo?.host && classInfo.host !== localStorage.getItem('username_temp_cache')) {
          disconnect(); // Instantly sever their WebRTC & socket
          setShowRatingModal(true);
       } else {
          disconnect();
          navigate('/dashboard');
       }
    }
  }, [sessionEnded, classInfo, disconnect, navigate]);

  // --- Admit Queue: when a user knocks, add to queue for host ---
  useEffect(() => {
    if (admitRequest && admitRequest.username) {
      setAdmitQueue(prev => {
        // Don't add duplicates
        if (prev.some(u => u.username === admitRequest.username)) return prev;
        return [...prev, { username: admitRequest.username, display_name: admitRequest.display_name || admitRequest.username }];
      });
    }
  }, [admitRequest]);

  const isHost = classInfo && classInfo.host === classInfo.user;

  const handleAdmit = (username) => {
    sendWhiteboardData({ type: 'admit_user', username });
    // Also call REST endpoint to persist admission
    api.post(`video/class/${roomId}/admit/`, { username }).catch(() => {});
    setAdmitQueue(q => q.filter(u => u.username !== username));
  };

  const handleDeny = (username) => {
    sendWhiteboardData({ type: 'deny_user', username });
    setAdmitQueue(q => q.filter(u => u.username !== username));
  };

  // --- Exam/Assignment Handlers --- //
  const handlePushAssignment = (assignment) => {
     setActiveAssignment(assignment); // Show for host too
     sendAssignmentPush({ action: 'push', assignment: assignment });
  };

  const handleClearAssignment = () => {
     setActiveAssignment(null);
     sendAssignmentPush({ action: 'clear' });
  };

  const submitLiveAssignment = async () => {
    if (!activeAssignment) return;
    setAssignmentSubmitting(true);
    try {
      const formattedAnswers = Object.entries(assignmentAnswers).map(([qId, text]) => ({
        question_id: parseInt(qId),
        answer_text: text
      }));
      
      await api.post(`dashboard/assignments/${activeAssignment.id}/submit/`, {
        answers: formattedAnswers
      });
      
      setActiveAssignment(null);
      alert("Live Assignment successfully uploaded and synchronized.");
    } catch (err) {
      alert(err.response?.data?.error || "Sync error: Failed to upload submission.");
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  // --- Poll Handlers ---

  const handleCreatePoll = (e) => {
     e.preventDefault();
     if (!pollQuestion.trim() || pollOptions.some(o => !o.trim())) return;
     
     const newPoll = {
        id: Date.now().toString(),
        question: pollQuestion,
        options: pollOptions.map(opt => ({ text: opt, votes: 0 })),
        totalVotes: 0,
        hasVoted: false
     };
     
     const msgId = `poll_${Date.now()}_${Math.random()}`;
     lastProcessedPoll.current = msgId; // Pre-register so our own echo is ignored
     setActivePoll(newPoll);
     sendPollUpdate({ action: 'create', poll: newPoll, msgId });
     setPollQuestion('');
     setPollOptions(['', '']);
  };

  const handleVote = (optionIndex) => {
     if (activePoll.hasVoted) return;
     
     const msgId = `vote_${Date.now()}_${Math.random()}`;
     lastProcessedPoll.current = msgId; // Pre-register so our own WS echo is skipped

     setActivePoll(prev => {
        const next = JSON.parse(JSON.stringify(prev)); // deep clone
        next.hasVoted = true;
        next.options[optionIndex].votes += 1;
        next.totalVotes += 1;
        return next;
     });

     sendPollUpdate({ action: 'vote', optionIndex, msgId });
  };

  // --- Whiteboard Handlers ---
  const handleEditorChange = (e) => {
    const newCode = e.target.value;
    setCode(newCode);
    sendCodeChange(newCode);
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    if (!code.trim() || Object.values(STARTER_CODES).includes(code)) {
      setCode(STARTER_CODES[newLang]);
      sendCodeChange(STARTER_CODES[newLang]);
    }
  };

  const executeCode = async () => {
    setIsExecuting(true);
    try {
      const res = await api.post('video/execute_code/', { code, language });
      const finalOutput = res.data.output || 'No output.';
      setCodeOutput(finalOutput);
      sendCodeOutput(finalOutput);
    } catch (err) {
      const errOutput = err.response?.data?.output || err.response?.data?.error || 'Execution failed.';
      setCodeOutput(errOutput);
      sendCodeOutput(errOutput);
    } finally {
      setIsExecuting(false);
    }
  };

  const getCanvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    lastPos.current = getCanvasPos(e);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const currentPos = getCanvasPos(e);
    
    // Draw on offscreen cache
    const targetCanvas = getPageCanvas(currentPage);
    const tCtx = targetCanvas.getContext('2d');
    tCtx.beginPath();
    tCtx.moveTo(lastPos.current.x, lastPos.current.y);
    tCtx.lineTo(currentPos.x, currentPos.y);
    tCtx.strokeStyle = color;
    tCtx.lineWidth = brushSize;
    tCtx.lineCap = 'round';
    tCtx.stroke();
    tCtx.closePath();

    // Render it visible
    renderVisibleCanvas(currentPage);

    // Broadcast explicitly linking to the currentPage index
    sendWhiteboardData({
      type: 'whiteboard', action: 'draw',
      x: currentPos.x, y: currentPos.y,
      lastX: lastPos.current.x, lastY: lastPos.current.y,
      color, size: brushSize,
      sender: localStorage.getItem('username_temp_cache'),
      msgId: Math.random(),
      pageIndex: currentPage
    });

    lastPos.current = currentPos;
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearWhiteboard = () => {
    // Clear only current offscreen cache
    const targetCanvas = getPageCanvas(currentPage);
    targetCanvas.getContext('2d').clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    renderVisibleCanvas(currentPage);

    sendWhiteboardData({ 
        type: 'whiteboard_clear', 
        pageIndex: currentPage, 
        sender: localStorage.getItem('username_temp_cache'), 
        msgId: Math.random() 
    });
  };

  const switchPage = (newIdx) => {
     if(newIdx < 0) return;
     setCurrentPage(newIdx);
     setBoardTotalPages(prev => Math.max(prev, newIdx + 1));
     // Draw the cached canvas for this page index
     renderVisibleCanvas(newIdx);
  };

  const downloadWhiteboardAsPDF = async () => {
    if (!canvasRef.current) return;
    
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvasRef.current.width, canvasRef.current.height]
    });

    for (let i = 0; i < boardTotalPages; i++) {
        if (i > 0) pdf.addPage();
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasRef.current.width;
        tempCanvas.height = canvasRef.current.height;
        const tCtx = tempCanvas.getContext('2d');
        
        // Solid black background layer mapping
        tCtx.fillStyle = '#1c1c1c';
        tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Access the native memory canvas layer for that specific page
        const offscreen = getPageCanvas(i);
        tCtx.drawImage(offscreen, 0, 0);
        
        // Add composite to PDF
        pdf.addImage(tempCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, tempCanvas.width, tempCanvas.height);
    }
    
    pdf.save(`skillswap-board-${roomId}.pdf`);
  };

  // --- Resize Canvas to fit container ---
  useEffect(() => {
    if (activeTab === 'whiteboard' && canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        canvasRef.current.width = parent.clientWidth;
        canvasRef.current.height = parent.clientHeight - 60; // Leave space for controls
        renderVisibleCanvas(currentPage);
    }
  }, [activeTab, currentPage, renderVisibleCanvas]);

  // --- Recording Handlers ---
  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
            video: { displaySurface: "browser" }, 
            audio: true,
            preferCurrentTab: true
        });
        mediaRecorderRef.current = new MediaRecorder(displayStream, { mimeType: 'video/webm' });
        
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunks.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `class-session-${roomId}.webm`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          recordedChunks.current = [];
          
          displayStream.getTracks().forEach(t => t.stop()); // Stop screen sharing
          setIsRecording(false);
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Failed to start recording:", err);
        alert("Recording failed. Browser permission required for screen sharing.");
      }
    }
  };


  const currentUsername = classInfo?.user || 'Connecting...';

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-2xl text-center max-w-md">
          <PhoneOff className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Connection Lost</h2>
          <p className="text-red-300 mb-6">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-4 mt-2">
      <div className="flex-1 flex flex-col bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden relative">
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/40">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="font-display font-bold text-lg text-white flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 mr-3 animate-pulse shadow-[0_0_10px_#22c55e]"></span>
                {classInfo?.title || 'Loading Session...'}
              </h2>
              <p className="text-xs text-gray-400">Host: {classInfo?.host || '...'} • Mesh Network</p>
            </div>
            
            <div className="hidden md:flex bg-black/50 border border-white/10 rounded-lg p-1 space-x-1">
              <button onClick={() => setActiveTab('video')} className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab==='video' ? 'bg-[#ea580c] text-white shadow' : 'text-gray-400 hover:text-white'}`}><LayoutGrid className="w-4 h-4 mr-2" /> Videos</button>
              <button onClick={() => setActiveTab('whiteboard')} className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab==='whiteboard' ? 'bg-[#ea580c] text-white shadow' : 'text-gray-400 hover:text-white'}`}><PenTool className="w-4 h-4 mr-2" /> Whiteboard</button>
              <button onClick={() => setActiveTab('code')} className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab==='code' ? 'bg-[#ea580c] text-white shadow' : 'text-gray-400 hover:text-white'}`}><Code className="w-4 h-4 mr-2" /> Code Editor</button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button onClick={toggleRecording} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${isRecording ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}>
              <Circle className={`w-4 h-4 ${isRecording ? 'animate-pulse fill-red-500' : ''}`} />
              <span className="hidden lg:inline">{isRecording ? 'Recording...' : 'Record'}</span>
            </button>
            <button onClick={toggleScreenShare} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${isScreenSharing ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}>
              <MonitorUp className={`w-4 h-4 ${isScreenSharing ? 'animate-pulse' : ''}`} />
              <span className="hidden lg:inline">{isScreenSharing ? 'Sharing...' : 'Share'}</span>
            </button>
            <button onClick={handleCopyLink} className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-sm text-gray-300">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Invite'}</span>
            </button>
            <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 flex items-center space-x-2 text-sm text-gray-300">
              <Users className="w-4 h-4" /><span>{Object.keys(remoteStreams).length + 1}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Main View Area */}
        <div className="flex-1 overflow-hidden relative">
          
          {/* VIDEO TAB (Always rendered but hidden if not active so media continues) */}
          <div className={`w-full h-full p-4 overflow-y-auto flex flex-col gap-4 ${activeTab === 'video' ? 'block' : 'hidden'}`}>
            
            {/* Pinned Video Section */}
            {pinnedUser && (
              <div className="w-full h-[60vh] lg:h-[70vh] flex-shrink-0">
                {pinnedUser === currentUsername ? (
                  <VideoElement stream={localStream} isLocal={true} username={currentUsername + " (You)"} isPinned={true} onPin={() => setPinnedUser(null)} />
                ) : (
                  <VideoElement stream={remoteStreams[pinnedUser]} isLocal={false} username={pinnedUser} isPinned={true} onPin={() => setPinnedUser(null)} />
                )}
              </div>
            )}

            {/* Grid of remaining videos */}
            <div className={`flex flex-wrap gap-4 ${pinnedUser ? 'justify-center items-start h-auto' : 'justify-center items-center h-full auto-rows-fr'}`}>
              {(pinnedUser !== currentUsername) && localStream && (
                <VideoElement stream={localStream} isLocal={true} username={currentUsername + " (You)"} isPinned={false} onPin={() => setPinnedUser(currentUsername)} />
              )}
              {Object.entries(remoteStreams)
                .filter(([peerName]) => peerName !== pinnedUser)
                .map(([peerName, stream]) => (
                  <VideoElement key={peerName} stream={stream} isLocal={false} username={peerName} isPinned={false} onPin={() => setPinnedUser(peerName)} />
              ))}
            </div>
          </div>

          {/* WHITEBOARD TAB */}
          <div className={`w-full h-full flex flex-col ${activeTab === 'whiteboard' ? 'block' : 'hidden'}`}>
            <div className="flex-1 w-full bg-[#1c1c1c] relative cursor-crosshair">
                <canvas 
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseOut={stopDrawing}
                  className="bg-[#1c1c1c] absolute top-0 left-0"
                />
            </div>
            <div className="h-14 bg-black/80 border-t border-white/10 flex items-center justify-between px-4">
              <div className="flex items-center space-x-4">
                <div className="flex space-x-2">
                  {['#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308'].map(c => (
                    <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{backgroundColor: c}}></button>
                  ))}
                </div>
                <div className="h-6 w-px bg-white/20"></div>
                <input type="range" min="1" max="20" value={brushSize} onChange={(e) => setBrushSize(e.target.value)} className="w-24 accent-[#ea580c]" />
              </div>
              <div className="flex items-center space-x-3">
                 <div className="flex items-center border border-white/10 rounded-lg overflow-hidden bg-black/50 text-white text-xs">
                    <button onClick={() => switchPage(currentPage - 1)} disabled={currentPage === 0} className="px-2 py-1.5 hover:bg-white/10 disabled:opacity-30"><ChevronLeft className="w-3 h-3"/></button>
                    <span className="px-2 font-mono">Pg {currentPage + 1} / {boardTotalPages}</span>
                    <button onClick={() => switchPage(currentPage + 1)} className="px-2 py-1.5 hover:bg-white/10"><ChevronRight className="w-3 h-3"/></button>
                    <button onClick={() => switchPage(boardTotalPages)} className="px-2 py-1.5 hover:bg-white/10 border-l border-white/10" title="New Page"><Plus className="w-3 h-3"/></button>
                 </div>
                <button onClick={clearWhiteboard} className="text-xs text-red-400 hover:text-red-300 ml-2">Clear Page</button>
                <button onClick={downloadWhiteboardAsPDF} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white ml-2" title="Export PDF"><Download className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {/* CODE EDITOR TAB */}
          <div className={`w-full h-full flex flex-col md:flex-row ${activeTab === 'code' ? 'flex' : 'hidden'}`}>
            <div className="flex-1 flex flex-col border-r border-white/10 bg-[#0d0d0d]">
              <div className="h-10 bg-black/60 border-b border-white/5 flex items-center px-4 justify-between">
                <div className="relative z-50">
                  <Select
                    value={language}
                    onChange={handleLanguageChange}
                    options={[
                      { value: 'python', label: '🐍 Python 3' },
                      { value: 'javascript', label: '⚡ Node.js' },
                      { value: 'java', label: '☕ Java 15' },
                      { value: 'cpp', label: '⚙️ C++ (GCC)' }
                    ]}
                  />
                </div>
                <span className="text-xs text-gray-500 font-tech">Live Sync</span>
              </div>
              <textarea 
                value={code} 
                onChange={handleEditorChange} 
                spellCheck="false" 
                className="flex-1 w-full p-4 bg-transparent text-gray-300 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#ea580c]/50" 
                placeholder="Write code here..."
              />
            </div>
            <div className="w-full md:w-1/3 flex flex-col bg-black">
              <div className="h-10 bg-black/80 border-b border-white/5 flex items-center px-4 justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Output</span>
                <button onClick={executeCode} disabled={isExecuting} className="flex items-center text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded disabled:opacity-50 transition-colors">
                  <Play className="w-3 h-3 mr-1" /> {isExecuting ? 'Running...' : 'Run Code'}
                </button>
              </div>
              <pre className="flex-1 p-4 overflow-auto text-xs font-mono text-green-400 whitespace-pre-wrap">
                {codeOutput || '// Hit Run Code to execute output'}
              </pre>
            </div>
          </div>

        </div>

        {/* Controls bar */}
        <div className="h-20 border-t border-white/5 bg-black/60 flex items-center justify-center space-x-4 px-6 z-10 shrink-0">
          <button onClick={() => { const s = toggleAudio(); setAudioEnabled(s); }} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${audioEnabled ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50'}`}>
            {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          <button onClick={() => { const s = toggleVideo(); setVideoEnabled(s); }} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${videoEnabled ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50'}`}>
            {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
          <button onClick={() => {
              if (classInfo?.host === currentUsername) {
                 setShowHostExitModal(true);
              } else if (classInfo?.host) {
                setShowRatingModal(true);
              } else {
                disconnect(); navigate('/dashboard');
              }
            }} className="w-16 h-12 rounded-2xl flex items-center justify-center bg-red-600 hover:bg-red-700 text-white transition-colors mx-4" title={classInfo?.host === currentUsername ? "Exit Options" : "Leave Session"}>
            <PhoneOff className="w-5 h-5" />
          </button>
          <button onClick={() => setChatOpen(!chatOpen)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${chatOpen ? 'bg-[#ea580c] text-white shadow-[0_0_20px_rgba(234,88,12,0.3)]' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Interactive Sidebar */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 350, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="h-full flex flex-col bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shrink-0">
            <div className="flex bg-black/40 border-b border-white/5 shrink-0">
              <button onClick={() => setSidebarTab('chat')} className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center transition-colors ${sidebarTab === 'chat' ? 'text-[#ea580c] border-b-2 border-[#ea580c] bg-white/5' : 'text-gray-400 hover:text-white'}`}>Chat</button>
              <button onClick={() => setSidebarTab('polls')} className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center transition-colors ${sidebarTab === 'polls' ? 'text-[#ea580c] border-b-2 border-[#ea580c] bg-white/5' : 'text-gray-400 hover:text-white'}`}>
                Polls
                {activePoll && !activePoll.hasVoted && sidebarTab !== 'polls' && <span className="absolute top-3 right-8 w-2 h-2 bg-red-500 rounded-full animate-bounce"></span>}
              </button>
              {classInfo?.host === currentUsername && (
                <button onClick={() => setSidebarTab('eval')} className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center transition-colors ${sidebarTab === 'eval' ? 'text-[#ea580c] border-b-2 border-[#ea580c] bg-white/5' : 'text-gray-400 hover:text-white'}`}>
                  Evals
                </button>
              )}
            </div>
            
            {sidebarTab === 'chat' ? (
               <>
                 <div className="flex-1 overflow-y-auto p-4 space-y-4 shadow-inner custom-scrollbar">
                   {chatMessages.length === 0 ? (
                     <div className="h-full flex items-center justify-center text-gray-500 text-sm italic">No messages yet. Say hello!</div>
                   ) : (
                     chatMessages.map(msg => (
                       <div key={msg.id} className={`flex flex-col ${msg.sender === currentUsername ? 'items-end' : 'items-start'}`}>
                         <span className="text-[10px] text-gray-500 mb-1 px-1"><Link to={`/u/${msg.sender}`} target="_blank" className="hover:text-[#ea580c] transition-colors">{msg.sender}</Link></span>
                         <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${msg.sender === currentUsername ? 'bg-[#ea580c] text-white rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none'}`}>{msg.text}</div>
                       </div>
                     ))
                   )}
                   <div ref={messagesEndRef} />
                 </div>
                 <div className="p-4 border-t border-white/5 shrink-0 bg-black/40">
                   <form onSubmit={e => { e.preventDefault(); if (chatInput.trim()) { sendChatMessage(chatInput.trim()); setChatInput(''); } }} className="flex items-center gap-2">
                     <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#ea580c]/50 transition-colors" />
                     <button type="submit" disabled={!chatInput.trim()} className="p-2.5 rounded-xl bg-[#ea580c] text-white hover:bg-orange-500 disabled:opacity-50 transition-colors"><Send className="w-4 h-4" /></button>
                   </form>
                 </div>
               </>
            ) : (
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col">
                   {activePoll ? (
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10 shadow-lg relative">
                         <h4 className="text-white font-semibold mb-4 text-center text-sm">{activePoll.question}</h4>
                         <div className="space-y-3">
                            {activePoll.options.map((opt, i) => {
                               const percentage = activePoll.totalVotes === 0 ? 0 : Math.round((opt.votes / activePoll.totalVotes) * 100);
                               const isWinner = activePoll.hasVoted && opt.votes === Math.max(...activePoll.options.map(o=>o.votes)) && opt.votes > 0;
                               return (
                                  <div key={i} className={`relative overflow-hidden rounded-lg bg-black/40 border transition-colors ${activePoll.hasVoted ? 'cursor-default' : 'cursor-pointer hover:border-[#ea580c]/50'} ${isWinner ? 'border-[#ea580c]/50' : 'border-white/5'}`} onClick={() => handleVote(i)}>
                                     <div className="absolute top-0 left-0 h-full bg-[#ea580c]/20 transition-all duration-1000" style={{width: `${activePoll.hasVoted ? percentage : 0}%`}}></div>
                                     <div className="relative z-10 px-4 py-3 flex justify-between items-center text-sm">
                                        <span className={`font-medium ${isWinner ? 'text-[#ea580c]' : 'text-gray-200'}`}>{opt.text}</span>
                                        <span className="text-gray-400 font-mono text-xs">{activePoll.hasVoted ? `${percentage}% (${opt.votes})` : ''}</span>
                                     </div>
                                  </div>
                               )
                            })}
                         </div>
                         <div className="mt-4 text-[10px] text-gray-500 text-center uppercase tracking-widest">{activePoll.totalVotes} Total Votes Cast</div>
                         <button onClick={() => {setActivePoll(null); sendPollUpdate({action: 'clear'});}} className="mt-4 w-full py-2 text-xs text-red-400 border border-transparent hover:border-red-500/30 hover:bg-red-500/10 rounded-lg transition-colors">End Poll For All</button>
                      </div>
                   ) : (
                      <form onSubmit={handleCreatePoll} className="flex flex-col space-y-4">
                         <div>
                            <label className="text-xs font-semibold text-gray-400 mb-1.5 block uppercase tracking-wider">Poll Question</label>
                            <input type="text" value={pollQuestion} onChange={e=>setPollQuestion(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-[#ea580c]/50 outline-none transition-colors" placeholder="e.g. Which framework is best?"/>
                         </div>
                         <div className="space-y-3">
                           <label className="text-xs font-semibold text-gray-400 block uppercase tracking-wider">Answers</label>
                           {pollOptions.map((opt, i) => (
                             <div key={i} className="flex space-x-2">
                                <input type="text" value={opt} onChange={e => { const updated = [...pollOptions]; updated[i] = e.target.value; setPollOptions(updated); }} className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#ea580c]/50 outline-none transition-colors" placeholder={`Option ${i+1}`}/>
                                {i > 1 && <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, idx)=>idx!==i))} className="px-3 text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 rounded-lg transition-colors">✕</button>}
                             </div>
                           ))}
                         </div>
                         <button type="button" onClick={()=>setPollOptions([...pollOptions, ''])} className="text-xs font-semibold text-[#ea580c] hover:text-white transition-colors self-start">+ ADD ANOTHER OPTION</button>
                         <div className="mt-auto pt-6 border-t border-white/10">
                            <button type="submit" disabled={!pollQuestion.trim() || pollOptions.some(o=>!o.trim())} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ea580c] to-orange-500 text-white text-sm font-bold shadow-lg disabled:opacity-50 transition-all hover:scale-[1.02]">
                               Launch Live Poll
                            </button>
                         </div>
                      </form>
                   )}
                </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Host Admit Panel ── */}
      <AnimatePresence>
        {isHost && admitQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-28 right-6 z-50 w-80 bg-[#111]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-white/5 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
              <span className="text-sm font-semibold text-white">Waiting to Join</span>
              <span className="ml-auto text-xs font-mono text-gray-400">{admitQueue.length} in queue</span>
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-white/5">
              {admitQueue.map(({ username: u, display_name }) => (
                <div key={u} className="flex items-center space-x-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-[#ea580c]/20 border border-[#ea580c]/30 flex items-center justify-center text-sm font-bold text-[#ea580c] shrink-0">
                    {display_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm text-gray-200 truncate">{display_name}</span>
                  <div className="flex space-x-2 shrink-0">
                    <button
                      onClick={() => handleAdmit(u)}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors"
                    >
                      Admit
                    </button>
                    <button
                      onClick={() => handleDeny(u)}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              ))}
              {/* Evals Tab */}
              {sidebarTab === 'eval' && classInfo?.host === currentUsername && (
                 <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4">
                    <h3 className="text-[#ea580c] font-tech text-xs tracking-widest mb-2">LIVE EVALUATIONS</h3>
                    {hostAssignments.length === 0 ? (
                       <p className="text-gray-500 text-xs font-tech">No assignments available to push. Create one in your dashboard.</p>
                    ) : (
                       hostAssignments.map(a => (
                          <div key={a.id} className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-3">
                             <div>
                                <div className="text-white font-bold text-sm tracking-wide">{a.title}</div>
                                <div className="text-gray-400 text-xs">{a.questions?.length} Questions • {a.total_points} Points</div>
                             </div>
                             {activeAssignment?.id === a.id ? (
                                <button onClick={handleClearAssignment} className="w-full py-1.5 border border-red-500/50 bg-red-500/10 text-red-500 rounded text-xs font-tech hover:bg-red-500 hover:text-white transition-colors">
                                   END ACTIVE EXAM
                                </button>
                             ) : (
                                <button onClick={() => handlePushAssignment(a)} disabled={activeAssignment !== null} className="w-full py-1.5 border border-[#ea580c]/50 bg-[#ea580c]/10 text-[#ea580c] rounded text-xs font-tech hover:bg-[#ea580c] hover:text-white transition-colors disabled:opacity-50">
                                   PUSH LIVE
                                </button>
                             )}
                          </div>
                       ))
                    )}
                 </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACTIVE ASSIGNMENT MODAL OVERLAY */}
      <AnimatePresence>
        {activeAssignment && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-[#0a0a0a] border border-[#ea580c]/50 rounded-2xl shadow-[0_0_50px_rgba(234,88,12,0.15)] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-black to-[#ea580c]/10">
                <div>
                  <h2 className="text-xl font-display font-bold text-white tracking-widest">LIVE PROTOCOL: {activeAssignment.title.toUpperCase()}</h2>
                  <p className="text-xs text-[#ea580c] font-tech mt-1 tracking-tighter cursor-pulse">BROADCASTING FROM HOST</p>
                </div>
                {classInfo?.host === currentUsername && (
                  <button onClick={handleClearAssignment} className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg text-xs font-tech transition-colors">
                    FORCE ABORT
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-gray-300 text-sm leading-relaxed italic">
                  "{activeAssignment.description}"
                </div>

                <div className="space-y-6">
                  {activeAssignment.questions.map((q, idx) => (
                    <div key={q.id} className="space-y-3">
                      <div className="flex items-start gap-4">
                        <div className="w-6 h-6 rounded bg-[#ea580c]/20 text-[#ea580c] flex items-center justify-center font-tech text-xs flex-shrink-0 mt-1">
                          {idx + 1}
                        </div>
                        <div className="text-white font-medium">{q.question_text}</div>
                      </div>

                      {q.question_type === 'text' ? (
                        <textarea
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-[#ea580c]/50 transition-colors min-h-[100px]"
                          placeholder="Initialize response..."
                          value={assignmentAnswers[q.id] || ''}
                          onChange={(e) => setAssignmentAnswers({...assignmentAnswers, [q.id]: e.target.value})}
                        />
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-10">
                          {['a', 'b', 'c', 'd'].map(optKey => {
                            const option = q[`option_${optKey}`];
                            if (!option) return null;
                            const isSelected = assignmentAnswers[q.id] === option;
                            return (
                              <button
                                key={optKey}
                                onClick={() => setAssignmentAnswers({...assignmentAnswers, [q.id]: option})}
                                className={`p-3 rounded-lg border text-left text-sm transition-all ${
                                  isSelected 
                                  ? 'bg-[#ea580c]/20 border-[#ea580c] text-white shadow-[0_0_15px_rgba(234,88,12,0.2)]' 
                                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                }`}
                              >
                                <span className="uppercase font-tech text-[#ea580c] mr-2">{optKey}.</span> {option}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-white/10 bg-black/60 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500 font-tech">
                  <AlertCircle className="w-3 h-3 text-blue-400" /> LIVE DATA UPLINK
                </div>
                <div className="flex gap-4">
                  {classInfo?.host !== currentUsername && (
                    <Button 
                      variant="primary" 
                      onClick={submitLiveAssignment} 
                      disabled={assignmentSubmitting || Object.keys(assignmentAnswers).length < activeAssignment.questions.length}
                      className="shadow-[0_0_20px_rgba(234,88,12,0.3)] min-w-[120px]"
                    >
                      {assignmentSubmitting ? 'UPLOADING...' : 'INITIALIZE SYNC'}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RATING MODAL OVERLAY */}
      <AnimatePresence>
        {showRatingModal && classInfo?.host && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-white/10 text-center">
                <h2 className="text-xl font-display font-bold text-white tracking-widest mb-2">SESSION ENDED</h2>
                <p className="text-sm text-gray-400">How was your experience with host <span className="text-[#ea580c] font-bold">@{classInfo.host}</span>?</p>
              </div>
              <div className="p-8 flex justify-center gap-6">
                 <button onClick={async () => {
                    try { await api.post(`users/profile/public/${classInfo.host}/rate/`, { is_positive: true }); } catch (e) {}
                    disconnect();
                    navigate('/dashboard');
                 }} className="flex flex-col items-center gap-3 p-4 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/30 rounded-xl transition-all">
                    <ThumbsUp className="w-8 h-8" />
                    <span className="text-xs font-bold tracking-widest uppercase">Commend</span>
                 </button>
                 <button onClick={async () => {
                    try { await api.post(`users/profile/public/${classInfo.host}/rate/`, { is_positive: false }); } catch (e) {}
                    disconnect();
                    navigate('/dashboard');
                 }} className="flex flex-col items-center gap-3 p-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-xl transition-all">
                    <ThumbsDown className="w-8 h-8" />
                    <span className="text-xs font-bold tracking-widest uppercase">Penalize</span>
                 </button>
              </div>
              <div className="p-4 border-t border-white/10 bg-black/60 text-center">
                 <button onClick={() => { disconnect(); navigate('/dashboard'); }} className="text-xs text-gray-500 hover:text-white transition-colors">Skip & Leave</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HOST EXIT OPTIONS MODAL */}
      <AnimatePresence>
        {showHostExitModal && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-[#0a0a0a] border border-[#ea580c]/50 rounded-2xl shadow-[0_0_50px_rgba(234,88,12,0.15)] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-white/10 text-center bg-gradient-to-r from-black to-[#ea580c]/10">
                <h2 className="text-xl font-display font-bold text-white tracking-widest mb-2">EXIT OPTIONS</h2>
                <p className="text-sm text-gray-400">As the Host, you have administrative privileges. How would you like to proceed?</p>
              </div>
              <div className="p-6 space-y-4">
                 <button onClick={() => {
                    endSession();
                    setTimeout(() => {
                      disconnect();
                      navigate('/dashboard');
                    }, 150); // delay to let WS message flush
                 }} className="w-full flex items-center gap-4 p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-all group">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                       <PhoneOff className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1">
                       <div className="text-red-400 font-bold mb-1 tracking-wider uppercase text-sm">Force End Session</div>
                       <div className="text-xs text-gray-400">Terminate the room and eject all active participants automatically.</div>
                    </div>
                 </button>
                 
                 <button onClick={() => {
                    disconnect();
                    navigate('/dashboard');
                 }} className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-400 group-hover:bg-white inline-flex group-hover:text-black transition-colors">
                       <ChevronLeft className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1">
                       <div className="text-white font-bold mb-1 tracking-wider uppercase text-sm">Leave Quietly</div>
                       <div className="text-xs text-gray-400">Exit the room yourself but allow remaining peers to stay connected in the mesh.</div>
                    </div>
                 </button>
              </div>
              <div className="p-4 border-t border-white/10 bg-black/60 text-center">
                 <button onClick={() => setShowHostExitModal(false)} className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 transition-colors uppercase tracking-widest">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
