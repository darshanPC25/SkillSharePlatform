import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { PlusCircle, Search, Trash2, Cpu, Activity, BookOpen, Video, ChevronRight, CheckCircle, Clock, AlertCircle, X, FileText, Award, BarChart2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import api from '../api';

export function Dashboard() {
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modals / State
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [assignmentAnswers, setAssignmentAnswers] = useState({});
  // Exam state
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [examAnswers, setExamAnswers] = useState({});
  const [examResult, setExamResult] = useState(null);
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [proctorStream, setProctorStream] = useState(null);
  const videoRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    let stream = null;
    if (selectedEvaluation && !examResult) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
          stream = s;
          setProctorStream(s);
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(err => {
          alert("Online Proctored Evaluation requires active WebCam permission. Access Denied.");
          setSelectedEvaluation(null);
        });
    } else {
      if (proctorStream) {
        proctorStream.getTracks().forEach(t => t.stop());
        setProctorStream(null);
      }
    }
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvaluation, examResult]);

  useEffect(() => {
    if (videoRef.current && proctorStream) {
      videoRef.current.srcObject = proctorStream;
    }
  }, [proctorStream, selectedEvaluation]);

  const fetchDashboard = async () => {
    try {
      const [homeRes, analyticsRes] = await Promise.all([
        api.get('dashboard/home/'),
        api.get('dashboard/analytics/')
      ]);
      setData(homeRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      setError('Failed to fetch telemetry data.');
    } finally {
      setLoading(false);
    }
  };

  const removeSkill = async (skillId) => {
    try {
      await api.delete(`users/skills/${skillId}/`);
      fetchDashboard();
    } catch (err) {
      alert("Failed to detach skill node.");
    }
  };

  const startClassRoom = async () => {
    try {
      const res = await api.post('video/class/create/', { title: `${data?.username || 'Host'}'s Class Session` });
      navigate(`/class/${res.data.room_id}`);
    } catch (err) {
      alert("Failed to initialize class session.");
    }
  };

  const handleExecuteProtocol = async (assignmentId) => {
    try {
      const res = await api.get(`dashboard/assignments/${assignmentId}/`);
      setSelectedProtocol(res.data);
      setAssignmentAnswers({});
    } catch (err) {
      alert("Failed to retrieve protocol data.");
    }
  };

  const submitProtocol = async () => {
    if (!selectedProtocol) return;
    setAssignmentSubmitting(true);
    try {
      const formattedAnswers = Object.entries(assignmentAnswers).map(([qId, text]) => ({
        question_id: parseInt(qId),
        answer_text: text
      }));
      
      await api.post(`dashboard/assignments/${selectedProtocol.id}/submit/`, {
        answers: formattedAnswers
      });
      
      setSelectedProtocol(null);
      fetchDashboard();
      alert("Protocol successfully uploaded and synchronized.");
    } catch (err) {
      alert(err.response?.data?.error || "Sync error: Failed to upload submission.");
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  const handleExecuteEvaluation = async (examId) => {
    try {
      const res = await api.get(`dashboard/exams/${examId}/`);
      setSelectedEvaluation(res.data);
      setExamAnswers({});
      setExamResult(null);
      // Start the attempt on backend
      if (!res.data.my_attempt) {
        await api.post(`dashboard/exams/${examId}/attempt/`, { action: 'start' });
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to initialize evaluation.');
    }
  };

  const submitEvaluation = async () => {
    if (!selectedEvaluation) return;
    setExamSubmitting(true);
    try {
      const formattedAnswers = Object.entries(examAnswers).map(([qId, text]) => ({
        question_id: parseInt(qId),
        answer_text: text
      }));
      const res = await api.post(`dashboard/exams/${selectedEvaluation.id}/attempt/`, {
        action: 'submit',
        answers: formattedAnswers
      });
      setExamResult(res.data);
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit evaluation.');
    } finally {
      setExamSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-[#ea580c]">
          <Activity className="w-8 h-8 animate-pulse" />
          <span className="font-tech text-sm tracking-widest uppercase">Syncing with Grid...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-red-400 p-8 text-center">{error}</div>;
  }

  const skills = data.my_skills || [];
  const matches = data.potential_matches || [];
  const assignments = data.assignments || [];
  const exams = data.exams || [];
  
  const stats = {
    total_skills: skills.length,
    total_potential_matches: matches.length,
    active_assignments: assignments.length,
    active_exams: exams.length,
  };


  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[1400px] mx-auto p-6 space-y-8"
    >
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-wide">COMMAND CENTER</h1>
          <p className="text-gray-400 text-sm mt-1">System status: <span className="text-green-500 font-medium">Nominal</span></p>
        </div>
        <div className="flex gap-4">
          <Button onClick={startClassRoom} className="hidden sm:flex bg-[#ea580c] hover:bg-orange-500 text-white border-none shadow-[0_0_15px_rgba(234,88,12,0.4)]">
            <Video className="w-4 h-4 mr-2" /> Start Class Room
          </Button>
          <Button onClick={() => navigate('/browse')} variant="ghost" className="hidden sm:flex border border-white/10 hover:bg-white/5 transition-colors"><Search className="w-4 h-4"/> System Query</Button>
          <Button variant="primary" onClick={() => navigate('/add-skill')}><PlusCircle className="w-4 h-4"/> Add Module</Button>
        </div>      </div>

      {/* ── NEW: ANALYTICS ROW ── */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <GlassCard className="p-4 flex flex-col justify-center bg-gradient-to-br from-[#ea580c]/10 to-transparent">
             <span className="text-gray-400 text-xs font-tech uppercase flex items-center"><TrendingUp className="w-3 h-3 mr-1 text-[#ea580c]"/> Rating</span>
             <span className="text-3xl font-display font-bold text-white mt-1">{analytics.current_rating}</span>
          </GlassCard>
          <GlassCard className="p-4 flex flex-col justify-center">
             <span className="text-gray-400 text-xs font-tech uppercase">Sessions</span>
             <span className="text-3xl font-display font-bold text-white mt-1">{analytics.total_sessions}</span>
          </GlassCard>
          <GlassCard className="p-4 flex flex-col justify-center">
             <span className="text-gray-400 text-xs font-tech uppercase">Matches</span>
             <span className="text-3xl font-display font-bold text-white mt-1">{analytics.matches_count}</span>
          </GlassCard>
          <GlassCard className="p-4 flex flex-col justify-center">
             <span className="text-gray-400 text-xs font-tech uppercase">Assignments</span>
             <span className="text-3xl font-display font-bold text-green-400 mt-1">{analytics.assignments_completed}</span>
          </GlassCard>
          <GlassCard className="p-4 flex flex-col justify-center">
             <span className="text-gray-400 text-xs font-tech uppercase">Exams Passed</span>
             <span className="text-3xl font-display font-bold text-blue-400 mt-1">{analytics.exams_passed}</span>
          </GlassCard>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Stats & Incoming Comms */}
        <div className="space-y-8">
          {analytics && analytics.rating_history && analytics.rating_history.length > 0 && (
             <GlassCard className="p-6">
                <h3 className="font-tech text-xs tracking-widest text-[#ea580c] mb-6 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4" /> ELO HISTORY
                </h3>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.rating_history}>
                      <YAxis domain={['auto', 'auto']} hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f1f1f', borderColor: '#333', fontSize: '12px' }}
                        itemStyle={{ color: '#ea580c' }}
                      />
                      <Line type="monotone" dataKey="rating" stroke="#ea580c" strokeWidth={3} dot={{ r: 4, fill: '#ea580c' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
             </GlassCard>
          )}

          <GlassCard className="p-6">
            <h3 className="font-tech text-xs tracking-widest text-[#ea580c] mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4" /> LOCAL TELEMETRY
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-black/40 border border-white/5">
                <span className="text-gray-400 text-sm">Active Skills</span>
                <span className="text-white font-mono font-medium text-lg">{stats.total_skills}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-black/40 border border-white/5">
                <span className="text-gray-400 text-sm">Matches Found</span>
                <span className="text-white font-mono font-medium text-lg">{stats.total_potential_matches}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-black/40 border border-white/5">
                <span className="text-gray-400 text-sm">Active Assignments</span>
                <span className="text-green-400 font-mono font-medium text-lg">{stats.active_assignments}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-black/40 border border-white/5">
                <span className="text-gray-400 text-sm">Active Exams</span>
                <span className="text-blue-400 font-mono font-medium text-lg">{stats.active_exams}</span>
              </div>
            </div>
          </GlassCard>

        </div>

        {/* Center/Right Column - Skills Array */}
        <div className="lg:col-span-2 space-y-8">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
              <h3 className="font-tech text-xs tracking-widest text-gray-300 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#ea580c]" /> MY SKILLS ARRAY
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skills.length === 0 ? (
                <div className="col-span-full py-12 text-center text-gray-500 text-sm font-tech">NO MODULES LOADED</div>
              ) : (
                skills.map(skill => (
                  <motion.div 
                    key={skill.id}
                    layoutId={`skill-${skill.id}`}
                    whileHover={{ scale: 1.02 }}
                    className="p-5 rounded-xl bg-black/40 border border-white/5 relative group"
                  >
                    <button 
                      onClick={() => removeSkill(skill.id)}
                      className="absolute top-3 right-3 text-red-500/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="font-sans font-medium text-white mb-1 flex items-center gap-2">
                      {skill.name}
                    </div>
                    <div className="text-xs font-mono text-gray-500 uppercase tracking-widest">{skill.proficiency}</div>
                  </motion.div>
                ))
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="font-tech text-xs tracking-widest text-gray-300 mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
              <BookOpen className="w-4 h-4 text-[#ea580c]" /> ACTIVE PROTOCOLS (ASSIGNMENTS)
            </h3>
            
            <div className="space-y-4">
              {assignments.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm font-tech">IDLE // NO ACTIVE PROTOCOLS</div>
              ) : (
                assignments.map((assignment, idx) => (
                  <GlassCard 
                    key={assignment.id} 
                    hover
                    index={idx}
                    onClick={() => assignment.my_submission ? null : handleExecuteProtocol(assignment.id)}
                    className={`p-4 rounded-xl transition-colors cursor-pointer group ${
                      assignment.my_submission 
                      ? 'bg-green-900/10 border-green-900/30' 
                      : 'bg-black/40 border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className="text-white font-medium">{assignment.title}</div>
                        {assignment.my_submission && <CheckCircle className="w-3 h-3 text-green-500" />}
                      </div>
                      <div className="text-xs font-tech px-2 py-1 bg-white/5 rounded text-gray-400">
                        {assignment.my_submission ? 'SYNCED' : 'PENDING'}
                      </div>
                    </div>
                    
                    <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span>Module: {assignment.skill?.name || 'General'}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(assignment.due_date).toLocaleDateString()}</span>
                      </div>
                      {!assignment.my_submission && (
                        <div className="text-[#ea580c] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          EXECUTE <ChevronRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          </GlassCard>

          {/* Exams Panel */}
          <GlassCard className="p-6">
            <h3 className="font-tech text-xs tracking-widest text-gray-300 mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
              <Award className="w-4 h-4 text-blue-400" /> ACTIVE EVALUATIONS (EXAMS)
            </h3>
            <div className="space-y-4">
              {exams.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm font-tech">NO EVALUATIONS SCHEDULED</div>
              ) : (
                exams.map((exam, idx) => {
                  const attempted = exam.my_attempt;
                  return (
                    <GlassCard
                      key={exam.id}
                      hover
                      index={idx}
                      onClick={() => attempted?.status === 'graded' ? null : handleExecuteEvaluation(exam.id)}
                      className={`p-4 rounded-xl transition-colors cursor-pointer group ${
                        attempted?.status === 'graded'
                        ? attempted.passed
                          ? 'bg-green-900/10 border-green-900/30'
                          : 'bg-red-900/10 border-red-900/30'
                        : 'bg-black/40 border-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className="text-white font-medium">{exam.title}</div>
                          {attempted?.status === 'graded' && (
                            attempted.passed
                              ? <CheckCircle className="w-3 h-3 text-green-500" />
                              : <X className="w-3 h-3 text-red-500" />
                          )}
                        </div>
                        <div className={`text-xs font-tech px-2 py-1 rounded ${
                          !attempted ? 'bg-white/5 text-gray-400' :
                          attempted.status === 'graded'
                            ? attempted.passed ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                            : 'bg-yellow-900/30 text-yellow-400'
                        }`}>
                          {!attempted ? 'PENDING' : attempted.status === 'graded' ? (attempted.passed ? 'PASSED' : 'FAILED') : 'IN PROGRESS'}
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span><FileText className="w-3 h-3 inline mr-1" />{exam.questions?.length || 0} questions</span>
                          <span><Clock className="w-3 h-3 inline mr-1" />{exam.duration_minutes} min</span>
                          {attempted?.status === 'graded' && (
                            <span className="text-blue-400"><BarChart2 className="w-3 h-3 inline mr-1" />{attempted.percentage?.toFixed(0)}%</span>
                          )}
                        </div>
                        {!attempted && (
                          <div className="text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            START <ChevronRight className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  );
                })
              )}
            </div>
          </GlassCard>
        </div>

      </div>
      {/* Protocol Executor Modal */}
      <AnimatePresence>
        {selectedProtocol && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-black to-[#ea580c]/5">
                <div>
                  <h2 className="text-xl font-display font-bold text-white tracking-widest">{selectedProtocol.title.toUpperCase()}</h2>
                  <p className="text-xs text-[#ea580c] font-tech mt-1 tracking-tighter">PROTO-SEQ: {selectedProtocol.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedProtocol(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-gray-300 text-sm leading-relaxed italic">
                  "{selectedProtocol.description}"
                </div>

                <div className="space-y-6">
                  {selectedProtocol.questions.map((q, idx) => (
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

              {/* Footer */}
              <div className="p-6 border-t border-white/10 bg-black/60 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500 font-tech">
                  <AlertCircle className="w-3 h-3" /> DATA UPLINK REQUIRED
                </div>
                <div className="flex gap-4">
                  <Button variant="ghost" onClick={() => setSelectedProtocol(null)}>ABORT</Button>
                  <Button 
                    variant="primary" 
                    onClick={submitProtocol} 
                    disabled={assignmentSubmitting || Object.keys(assignmentAnswers).length < selectedProtocol.questions.length}
                    className="shadow-[0_0_20px_rgba(234,88,12,0.3)] min-w-[120px]"
                  >
                    {assignmentSubmitting ? 'UPLOADING...' : 'INITIALIZE SYNC'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Evaluation (Exam) Modal */}
      <AnimatePresence>
        {selectedEvaluation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-black to-blue-900/10">
                <div>
                  <h2 className="text-xl font-display font-bold text-white tracking-widest">{selectedEvaluation.title.toUpperCase()}</h2>
                  <p className="text-xs text-blue-400 font-tech mt-1">
                    EVAL-ID: {selectedEvaluation.id} • {selectedEvaluation.duration_minutes} min • Pass: {selectedEvaluation.passing_score}/{selectedEvaluation.total_points}
                  </p>
                </div>
                <button onClick={() => { setSelectedEvaluation(null); setExamResult(null); if (proctorStream) { proctorStream.getTracks().forEach(t=>t.stop()); setProctorStream(null); } }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {proctorStream && !examResult && (
                 <div className="absolute top-24 right-6 w-32 h-24 bg-black rounded-lg overflow-hidden border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] z-50">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                    <div className="absolute top-1 right-1 flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded text-[8px] font-bold text-red-500 animate-pulse uppercase">
                       <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Proctored
                    </div>
                 </div>
              )}

              {examResult ? (
                /* Results View */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
                    examResult.passed ? 'bg-green-900/20 border-2 border-green-500' : 'bg-red-900/20 border-2 border-red-500'
                  }`}>
                    <span className="text-3xl font-bold font-display">
                      {examResult.passed ? '✓' : '✗'}
                    </span>
                  </div>
                  <h3 className={`text-2xl font-display font-bold mb-2 ${ examResult.passed ? 'text-green-400' : 'text-red-400' }`}>
                    {examResult.passed ? 'EVALUATION CLEARED' : 'EVALUATION FAILED'}
                  </h3>
                  <p className="text-gray-400 mb-6">Score: <span className="text-white font-bold">{examResult.score}/{examResult.total_points}</span> ({examResult.percentage?.toFixed(1)}%)</p>
                  <Button variant="primary" onClick={() => { setSelectedEvaluation(null); setExamResult(null); }}>Close</Button>
                </div>
              ) : (
                <>
                  {/* Question Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-gray-300 text-sm leading-relaxed italic">
                      "{selectedEvaluation.description}"
                    </div>
                    {selectedEvaluation.questions.map((q, idx) => (
                      <div key={q.id} className="space-y-3">
                        <div className="flex items-start gap-4">
                          <div className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-tech text-xs flex-shrink-0 mt-1">{idx + 1}</div>
                          <div className="text-white font-medium">{q.question_text}</div>
                        </div>
                        {q.question_type === 'text' ? (
                          <textarea
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-blue-400/50 transition-colors min-h-[80px]"
                            placeholder="Enter your answer..."
                            value={examAnswers[q.id] || ''}
                            onChange={(e) => setExamAnswers({ ...examAnswers, [q.id]: e.target.value })}
                          />
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-10">
                            {['a', 'b', 'c', 'd'].map(optKey => {
                              const option = q[`option_${optKey}`];
                              if (!option) return null;
                              const isSelected = examAnswers[q.id] === option;
                              return (
                                <button
                                  key={optKey}
                                  onClick={() => setExamAnswers({ ...examAnswers, [q.id]: option })}
                                  className={`p-3 rounded-lg border text-left text-sm transition-all ${
                                    isSelected
                                      ? 'bg-blue-500/20 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                  }`}
                                >
                                  <span className="uppercase font-tech text-blue-400 mr-2">{optKey}.</span> {option}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Footer */}
                  <div className="p-6 border-t border-white/10 bg-black/60 flex items-center justify-between">
                    <div className="text-xs text-gray-500 font-tech flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" /> {Object.keys(examAnswers).length}/{selectedEvaluation.questions.length} answered
                    </div>
                    <div className="flex gap-4">
                      <Button variant="ghost" onClick={() => { setSelectedEvaluation(null); setExamResult(null); }}>Cancel</Button>
                      <Button
                        variant="primary"
                        onClick={submitEvaluation}
                        disabled={examSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] min-w-[120px]"
                      >
                        {examSubmitting ? 'SUBMITTING...' : 'SUBMIT EVALUATION'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
