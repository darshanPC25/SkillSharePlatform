import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { User, Mail, Save, Trash2, Globe, Lock, Award, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api';

export function Profile() {
  const [userData, setUserData] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', bio: '', location: '', is_public: true });
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    Promise.all([api.get('users/me/'), api.get('users/skills/')]).then(([userRes, skillsRes]) => {
      setUserData(userRes.data);
      setSkills(skillsRes.data);
      setForm({
        first_name: userRes.data.first_name || '',
        last_name: userRes.data.last_name || '',
        email: userRes.data.email || '',
        bio: userRes.data.profile?.bio || '',
        location: userRes.data.profile?.location || '',
        is_public: userRes.data.profile?.is_public ?? true,
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('users/profile/update/', {
        user: { first_name: form.first_name, last_name: form.last_name, email: form.email },
        profile: { bio: form.bio, location: form.location, is_public: form.is_public },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to save profile.');
    } finally { setSaving(false); }
  };

  const deleteSkill = async (id) => {
    if (!window.confirm('Remove this skill?')) return;
    await api.delete(`users/skills/${id}/`);
    setSkills(s => s.filter(sk => sk.id !== id));
  };

  if (loading) {
    return <div className="flex justify-center py-24 text-[#ea580c]"><User className="w-8 h-8 animate-pulse" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1400px] mx-auto p-6">
      <h1 className="text-3xl font-display font-bold text-white tracking-wide mb-8">MY PROFILE</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Avatar */}
        <GlassCard className="p-6 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#ea580c]/30 to-red-900/30 border-2 border-[#ea580c]/30 flex items-center justify-center text-4xl font-bold text-[#ea580c] mb-4 overflow-hidden">
            {userData?.profile?.profile_picture && !userData.profile.profile_picture.includes('default.jpg') ? (
              <img src={userData.profile.profile_picture.startsWith('http') ? userData.profile.profile_picture : `${api.defaults.baseURL.replace('/api/', '')}${userData.profile.profile_picture}`} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              userData?.username?.charAt(0).toUpperCase()
            )}
          </div>
          <h2 className="text-xl font-bold text-white">{userData?.first_name ? `${userData.first_name} ${userData.last_name}` : userData?.username}</h2>
          <p className="text-[#ea580c] text-sm mt-1 font-mono">● ONLINE</p>
          <p className="text-gray-400 text-sm mt-3">{form.bio || 'No bio yet.'}</p>
          <p className="text-gray-500 text-xs mt-2">{form.location || 'Location not set'}</p>
          <div className="mt-4 pt-4 border-t border-white/10 w-full space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-center mx-auto">
                <div className="text-2xl font-bold text-white">{skills.length}</div>
                <div className="text-gray-400 text-xs font-mono uppercase tracking-widest">Skills</div>
              </div>
            </div>
            {/* Privacy Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
              <div className="flex items-center space-x-2">
                {form.is_public ? <Globe className="w-4 h-4 text-green-400"/> : <Lock className="w-4 h-4 text-red-400"/>}
                <span className="text-xs font-semibold text-gray-300">{form.is_public ? 'Public Profile' : 'Private Profile'}</span>
              </div>
              <button
                disabled={toggling}
                onClick={async () => {
                  setToggling(true);
                  const newVal = !form.is_public;
                  setForm(f => ({...f, is_public: newVal}));
                  try { await api.put('users/profile/update/', { user: {}, profile: { is_public: newVal } }); }
                  catch { setForm(f => ({...f, is_public: !newVal})); }
                  finally { setToggling(false); }
                }}
                className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${form.is_public ? 'bg-green-500' : 'bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow ${form.is_public ? 'left-5' : 'left-0.5'}`}/>
              </button>
            </div>
            {form.is_public && userData?.username && (
              <Link to={`/u/${userData.username}`} className="flex items-center justify-center space-x-2 text-xs text-[#ea580c] hover:text-orange-400 transition-colors">
                <ExternalLink className="w-3 h-3"/><span>View Public Profile</span>
              </Link>
            )}
          </div>
        </GlassCard>

        {/* Edit Details */}
        <GlassCard className="p-6 lg:col-span-2">
          <h3 className="font-tech text-xs tracking-widest text-[#ea580c] mb-6">IDENTITY CONFIG</h3>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">First Name</label>
                <input type="text" className="tech-input w-full h-10" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Last Name</label>
                <input type="text" className="tech-input w-full h-10" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input type="email" className="tech-input w-full pl-10 h-10" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bio</label>
              <textarea className="tech-input w-full h-20 resize-none" placeholder="Write something about yourself..." value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Location</label>
              <input type="text" className="tech-input w-full h-10" placeholder="City, Country" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <Button type="submit" variant="primary" className="h-12" disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : saved ? 'Saved! ✓' : 'Save Changes'}
            </Button>
          </form>
        </GlassCard>
      </div>

      {/* Skills List */}
      <GlassCard className="p-6 mt-8">
        <h3 className="font-tech text-xs tracking-widest text-gray-400 mb-6">MY SKILLS</h3>
        {skills.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">No skills registered yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map(skill => (
              <motion.div
                key={skill.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-start justify-between group"
              >
                <div className="flex-1">
                  <div className="text-white font-medium">{skill.name}</div>
                  <span className="text-xs font-mono text-gray-500 mt-1">{skill.proficiency}</span>
                </div>
                <button onClick={() => deleteSkill(skill.id)} className="text-red-500/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-2 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
