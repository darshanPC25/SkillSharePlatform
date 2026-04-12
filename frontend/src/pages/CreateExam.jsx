import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Layers, Plus, Trash2, ArrowRight } from 'lucide-react';
import api from '../api';

export function CreateExam() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    difficulty: 'hard',
    scheduled_date: new Date(Date.now() + 86400000).toISOString().slice(0, 16), // Tomorrow
    duration_minutes: 60,
    passing_score: 60
  });

  const [questions, setQuestions] = useState([
    { id: 1, question_text: '', points: 10, option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: '' }
  ]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { id: Date.now(), question_text: '', points: 10, option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: '' }
    ]);
  };

  const removeQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id, field, value) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('dashboard/exams/create/', {
        ...form,
        questions: questions
      });
      navigate('/exams');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[800px] mx-auto p-4 md:p-6 pb-24">
      <GlassCard className="p-6 md:p-8 border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.05)]">
        <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-6">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-white">BUILD PROCTORED EXAM</h1>
            <p className="text-gray-400 text-sm font-tech">Schedule a strict evaluation protocol</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-400 text-sm p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="space-y-4">
            <h3 className="text-red-500 font-tech text-sm tracking-widest uppercase">Protocol Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Title</label>
                <input required type="text" className="tech-input w-full p-3 focus:border-red-500/50" placeholder="e.g. Master Algorithm Certification..." value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Description</label>
                <textarea required className="tech-input w-full p-3 h-20 resize-none min-h-[100px] focus:border-red-500/50" placeholder="Instructions..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Scheduled Start</label>
                <input required type="datetime-local" className="tech-input w-full p-2.5 h-10 focus:border-red-500/50" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} />
              </div>
              <div>
                 <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Duration (Minutes)</label>
                 <input required type="number" min="5" className="tech-input w-full p-2.5 h-10 focus:border-red-500/50" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: parseInt(e.target.value)||60})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Difficulty</label>
                <Select name="difficulty" value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})} options={[{value:'easy', label:'Easy'}, {value:'medium', label:'Medium'}, {value:'hard', label:'Hard'}]} />
              </div>
              <div>
                 <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Passing Score (%)</label>
                 <input required type="number" min="1" max="100" className="tech-input w-full p-2.5 h-10 focus:border-red-500/50 text-red-400 font-bold" value={form.passing_score} onChange={e => setForm({...form, passing_score: parseInt(e.target.value)||60})} />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-white/5">
            <div className="flex justify-between items-center">
              <h3 className="text-red-500 font-tech text-sm tracking-widest uppercase">Evaluation Matrix</h3>
              <Button type="button" variant="ghost" className="text-xs hover:text-red-400" onClick={addQuestion}><Plus className="w-3 h-3 mr-1" /> Add Question</Button>
            </div>

            <AnimatePresence>
              {questions.map((q, index) => (
                <motion.div key={q.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4">
                  <div className="bg-black/40 border border-white/5 rounded-xl p-4 relative group">
                    {questions.length > 1 && (
                      <button type="button" onClick={() => removeQuestion(q.id)} className="absolute top-4 right-4 p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    
                    <div className="mb-4 pr-10">
                       <label className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Question {index + 1}</label>
                       <input required type="text" className="tech-input w-full p-2 text-sm font-medium focus:border-red-500/50" placeholder="Ask your question..." value={q.question_text} onChange={e => updateQuestion(q.id, 'question_text', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {['a', 'b', 'c', 'd'].map(opt => (
                        <div key={opt} className="flex">
                           <span className="bg-white/5 border border-r-0 border-white/10 rounded-l-lg px-3 py-2 text-xs font-mono uppercase text-gray-400 flex items-center justify-center">{opt}</span>
                           <input required type="text" className="tech-input flex-1 rounded-l-none p-2 text-sm focus:border-red-500/50" placeholder={`Option ${opt.toUpperCase()}`} value={q[`option_${opt}`]} onChange={e => updateQuestion(q.id, `option_${opt}`, e.target.value)} />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 border-t border-white/5 pt-4">
                       <div className="flex-1">
                          <label className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Correct Answer Match (Type Exact Match)</label>
                          <input required type="text" className="tech-input w-full p-2 text-sm border-2 focus:border-green-500/50" placeholder="Paste correct option text exactly..." value={q.correct_answer} onChange={e => updateQuestion(q.id, 'correct_answer', e.target.value)} />
                       </div>
                       <div className="w-24">
                          <label className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Points</label>
                          <input required type="number" min="1" className="tech-input w-full p-2 text-sm text-center text-red-500 font-bold focus:border-red-500/50" value={q.points} onChange={e => updateQuestion(q.id, 'points', parseInt(e.target.value)||0)} />
                       </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            <div className="pt-4 flex justify-between items-center text-gray-400 font-tech text-xs border-t border-white/5">
               <span>TOTAL QUESTIONS: {questions.length}</span>
               <span>TOTAL POINTS: {questions.reduce((sum, q) => sum + q.points, 0)}</span>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg shadow-red-600/30 font-bold tracking-widest h-14 rounded-xl flex items-center justify-center transition-transform hover:scale-[1.02] disabled:opacity-50 mt-8 disabled:hover:scale-100">
            {loading ? 'INITIALIZING...' : 'SCHEDULE EXAM PROTOCOL'} <ArrowRight className="w-5 h-5 ml-2" />
          </button>

        </form>
      </GlassCard>
    </motion.div>
  );
}
