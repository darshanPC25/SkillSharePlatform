import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { API_BASE_URL } from '../api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { User, MapPin, Award, BookOpen, Star, AlertCircle, ArrowLeft, ThumbsUp, ThumbsDown } from 'lucide-react';

export function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [requestSuccess, setRequestSuccess] = useState(null);
  const [requestError, setRequestError] = useState(null);

  const fetchProfile = () => {
    api.get(`users/profile/public/${username}/`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || 'Profile not found.'));
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleContextMenu = (e, skill) => {
    e.preventDefault();
    setContextMenu({ skill, x: e.pageX, y: e.pageY });
  };

  const handleRequestMatch = async (skillId) => {
    setRequestError(null);
    setRequestSuccess(null);
    try {
      await api.post(`dashboard/matches/request/${skillId}/`);
      setRequestSuccess("Match request sent successfully!");
    } catch (err) {
      setRequestError(err.response?.data?.error || "Failed to send request.");
    }
  };

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-2xl text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-red-300 mb-6">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!data) return <div className="text-center py-20 text-gray-500">Loading profile...</div>;

  const { profile, rating_history, skills } = data;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Col: Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 text-center">
            {profile.profile_picture ? (
               <img src={profile.profile_picture.startsWith('http') ? profile.profile_picture : `${API_BASE_URL.replace('/api/', '')}${profile.profile_picture}`} className="w-32 h-32 rounded-full mx-auto border-4 border-[#ea580c]/30 object-cover mb-4" alt={data.username} />
            ) : (
               <div className="w-32 h-32 rounded-full mx-auto border-4 border-[#ea580c]/30 bg-white/5 flex items-center justify-center mb-4"><User className="w-12 h-12 text-gray-400"/></div>
            )}
            <h1 className="text-2xl font-bold text-white">{data.first_name} {data.last_name}</h1>
            <p className="text-gray-400 font-mono text-sm mb-4">@{data.username}</p>
            <div className="flex items-center justify-center text-sm text-gray-300 mb-2">
              <MapPin className="w-4 h-4 mr-2 text-[#ea580c]" /> {profile.location || 'Unknown Location'}
            </div>
            <div className="flex items-center justify-center text-sm text-gray-300">
              <Award className="w-4 h-4 mr-2 text-yellow-500" /> Rating: <span className="font-bold text-white ml-2">{profile.rating}</span>
            </div>
            {profile.bio && (
              <div className="mt-6 pt-6 border-t border-white/10 text-left">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">About</h3>
                <p className="text-sm text-gray-300 leading-relaxed">{profile.bio}</p>
              </div>
            )}
            
          </div>
        </div>

        {/* Right Col: Stats & Skills */}
        <div className="md:col-span-2 space-y-6">
          {/* Rating Graph */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6">
             <h3 className="text-lg font-bold text-white mb-6 flex items-center"><Star className="w-5 h-5 text-yellow-500 mr-2"/> Rating Timeline</h3>
             <div className="h-[250px] w-full">
               {rating_history && rating_history.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={rating_history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                     <XAxis dataKey="date" stroke="#ffffff50" tickFormatter={(v) => new Date(v).toLocaleDateString()} fontSize={12} />
                     <YAxis stroke="#ffffff50" fontSize={12} domain={['auto', 'auto']} />
                     <Tooltip 
                       contentStyle={{backgroundColor: '#0a0a0a', border: '1px solid #ffffff20', borderRadius: '8px'}}
                       labelFormatter={(v) => new Date(v).toLocaleDateString()}
                     />
                     <Line type="monotone" dataKey="rating" stroke="#ea580c" strokeWidth={3} dot={{r: 4, fill: '#ea580c'}} activeDot={{r: 6}} />
                   </LineChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="h-full flex items-center justify-center text-gray-500 italic">No rating history available yet.</div>
               )}
             </div>
          </div>

          {/* Skills */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6">
             <h3 className="text-lg font-bold text-white mb-6 flex items-center"><BookOpen className="w-5 h-5 text-[#ea580c] mr-2"/> Public Skills</h3>
             {skills && skills.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {skills.map(skill => (
                    <div 
                      key={skill.id} 
                      onContextMenu={(e) => handleContextMenu(e, skill)}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#ea580c]/50 transition-colors cursor-context-menu title"
                      title="Right-click to request match"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-white">{skill.name}</h4>
                        <span className={`text-[10px] px-2 py-1 rounded-md font-mono ${skill.can_teach ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                           {skill.proficiency}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">{skill.description}</p>
                    </div>
                  ))}
                </div>
             ) : (
                <div className="text-center py-8 text-gray-500">No skills published.</div>
             )}
          </div>
        </div>
      </div>

      {requestSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-500/20 border border-green-500 text-green-400 px-6 py-3 rounded-xl shadow-lg z-50">
          {requestSuccess}
        </div>
      )}
      {requestError && (
        <div className="fixed bottom-4 right-4 bg-red-500/20 border border-red-500 text-red-400 px-6 py-3 rounded-xl shadow-lg z-50">
          {requestError}
        </div>
      )}

      {contextMenu && (
        <div 
          className="absolute z-50 bg-[#0a0a0a] border border-white/20 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden min-w-[200px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 border-b border-white/10 bg-white/5 text-xs text-gray-400 uppercase tracking-widest font-bold">
            Skill Options
          </div>
          <button 
            onClick={() => { handleRequestMatch(contextMenu.skill.id); setContextMenu(null); }}
            className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[#ea580c]/80 transition-colors"
          >
            Request to Match for {contextMenu.skill.name}
          </button>
        </div>
      )}
    </div>
  );
}
