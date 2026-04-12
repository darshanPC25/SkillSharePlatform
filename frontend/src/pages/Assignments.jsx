import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { BookOpen, AlertCircle, X, ChevronRight, CheckCircle, Clock, Plus } from 'lucide-react';
import api from '../api';

export function Assignments() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [assignmentAnswers, setAssignmentAnswers] = useState({});

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const response = await api.get('dashboard/assignments/');
      setAssignments(response.data);
    } catch (err) {
      setError('Failed to fetch assignments.');
    } finally {
      setLoading(false);
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
      fetchAssignments();
      alert("Protocol successfully uploaded and synchronized.");
    } catch (err) {
      alert(err.response?.data?.error || "Sync error: Failed to upload submission.");
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-[#ea580c] font-tech text-sm tracking-widest uppercase animate-pulse">Syncing...</div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1000px] mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-wide">ASSIGNMENTS</h1>
          <p className="text-gray-400 text-sm mt-1">Active Protocols & Missions</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/assignments/create')} className="gap-2">
          <Plus className="w-4 h-4" /> CREATE ASSIGNMENT
        </Button>
      </div>

      <GlassCard className="p-6">
        <h3 className="font-tech text-xs tracking-widest text-[#ea580c] mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
          <BookOpen className="w-4 h-4" /> ALL PROTOCOLS
        </h3>
        
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm font-tech">NO ACTIVE PROTOCOLS</div>
          ) : (
             assignments.map(assignment => (
              <div 
                key={assignment.id} 
                onClick={() => assignment.my_submission ? null : handleExecuteProtocol(assignment.id)}
                className={`p-4 rounded-xl border transition-colors cursor-pointer group ${
                  assignment.my_submission 
                  ? 'bg-green-900/10 border-green-900/30' 
                  : 'bg-black/40 border-white/10 hover:border-[#ea580c]/50'
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
              </div>
            ))
          )}
        </div>
      </GlassCard>

      <AnimatePresence>
        {selectedProtocol && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-black to-[#ea580c]/5">
                <div>
                  <h2 className="text-xl font-display font-bold text-white tracking-widest">{selectedProtocol.title.toUpperCase()}</h2>
                  <p className="text-xs text-[#ea580c] font-tech mt-1 tracking-tighter">PROTO-SEQ: {selectedProtocol.id}</p>
                </div>
                <button onClick={() => setSelectedProtocol(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

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
    </motion.div>
  );
}
