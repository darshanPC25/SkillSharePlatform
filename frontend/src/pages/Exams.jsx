import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Award, AlertCircle, X, ChevronRight, CheckCircle, Clock, FileText, BarChart2, Plus } from 'lucide-react';
import api from '../api';

export function Exams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [examAnswers, setExamAnswers] = useState({});
  const [examResult, setExamResult] = useState(null);
  const [examSubmitting, setExamSubmitting] = useState(false);
  
  const [proctorStream, setProctorStream] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
     fetchExams();
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

  const fetchExams = async () => {
    try {
      const response = await api.get('dashboard/exams/');
      setExams(response.data);
    } catch (err) {
      setError('Failed to fetch exams.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteEvaluation = async (examId) => {
    try {
      const res = await api.get(`dashboard/exams/${examId}/`);
      setSelectedEvaluation(res.data);
      setExamAnswers({});
      setExamResult(null);
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
      fetchExams();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit evaluation.');
    } finally {
      setExamSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-blue-400 font-tech text-sm tracking-widest uppercase animate-pulse">Syncing...</div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1000px] mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-wide">EXAMS</h1>
          <p className="text-gray-400 text-sm mt-1">Evaluations & Assessments</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/exams/create')} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
          <Plus className="w-4 h-4" /> CREATE EXAM
        </Button>
      </div>

      <GlassCard className="p-6">
        <h3 className="font-tech text-xs tracking-widest text-blue-400 mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
          <Award className="w-4 h-4" /> ALL EVALUATIONS
        </h3>
        <div className="space-y-4">
          {exams.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm font-tech">NO EVALUATIONS AVAILABLE</div>
          ) : (
            exams.map(exam => {
              const attempted = exam.my_attempt;
              return (
                <div
                  key={exam.id}
                  onClick={() => attempted?.status === 'graded' ? null : handleExecuteEvaluation(exam.id)}
                  className={`p-4 rounded-xl border transition-colors cursor-pointer group ${
                    attempted?.status === 'graded'
                    ? attempted.passed
                      ? 'bg-green-900/10 border-green-900/30'
                      : 'bg-red-900/10 border-red-900/30'
                    : 'bg-black/40 border-white/10 hover:border-blue-500/50'
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
                      <span><FileText className="w-3 h-3 inline mr-1" />{exam.questions?.length || 0} qs</span>
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
                </div>
              );
            })
          )}
        </div>
      </GlassCard>

      <AnimatePresence>
        {selectedEvaluation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
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
