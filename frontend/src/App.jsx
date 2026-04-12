import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { API_BASE_URL } from './api';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { BrowseSkills } from './pages/BrowseSkills';
import { MyMatches } from './pages/MyMatches';
import { AddSkill } from './pages/AddSkill';
import { Profile } from './pages/Profile';
import { ClassSession } from './pages/ClassSession';
import { PublicProfile } from './pages/PublicProfile';
import { WaitingRoom } from './pages/WaitingRoom';
import { Placeholder } from './pages/Placeholder';
import { Chat } from './pages/Chat';
import { Assignments } from './pages/Assignments';
import { CreateAssignment } from './pages/CreateAssignment';
import { Exams } from './pages/Exams';
import { CreateExam } from './pages/CreateExam';
import { Leaderboard } from './pages/Leaderboard';
import { NotificationToastContainer } from './components/ui/NotificationToast';
import { ChatPopup } from './components/ui/ChatPopup';
import { CustomCursor } from './components/ui/CustomCursor';
import { NotificationProvider, useNotificationContext } from './context/NotificationContext';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

// Page transition wrapper
function Wrap({ children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      {children}
    </motion.div>
  );
}

function ClearDBRoute() {
  const { password } = useParams();
  const [status, setStatus] = React.useState('Clearing database...');

  React.useEffect(() => {
    fetch(`${API_BASE_URL}cleardb/${password}/`)
      .then(res => res.json())
      .then(data => setStatus(data.message || data.error || 'Done.'))
      .catch(err => setStatus('Error clearing DB: ' + err.message));
  }, [password]);

  return <div className="text-center text-white p-20 font-tech text-xl">{status}</div>;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/" element={<Wrap><Home /></Wrap>} />
        <Route path="/login" element={<Wrap><Login /></Wrap>} />
        <Route path="/register" element={<Wrap><Register /></Wrap>} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Wrap><Dashboard /></Wrap></ProtectedRoute>} />
        <Route path="/browse" element={<ProtectedRoute><Wrap><BrowseSkills /></Wrap></ProtectedRoute>} />
        <Route path="/matches" element={<ProtectedRoute><Wrap><MyMatches /></Wrap></ProtectedRoute>} />
        <Route path="/add-skill" element={<ProtectedRoute><Wrap><AddSkill /></Wrap></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Wrap><Profile /></Wrap></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Wrap><Profile /></Wrap></ProtectedRoute>} />
        <Route path="/u/:username" element={<Wrap><PublicProfile /></Wrap>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Wrap><Leaderboard /></Wrap></ProtectedRoute>} />
        <Route path="/waiting/:roomId" element={<ProtectedRoute><Wrap><WaitingRoom /></Wrap></ProtectedRoute>} />
        <Route path="/class/:roomId" element={<ProtectedRoute><Wrap><ClassSession /></Wrap></ProtectedRoute>} />

        {/* Learning section routes */}
        <Route path="/assignments" element={<ProtectedRoute><Wrap><Assignments /></Wrap></ProtectedRoute>} />
        <Route path="/assignments/create" element={<ProtectedRoute><Wrap><CreateAssignment /></Wrap></ProtectedRoute>} />
        <Route path="/exams" element={<ProtectedRoute><Wrap><Exams /></Wrap></ProtectedRoute>} />
        <Route path="/exams/create" element={<ProtectedRoute><Wrap><CreateExam /></Wrap></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Wrap><Chat /></Wrap></ProtectedRoute>} />

        {/* 404 */}
        <Route path="/cleardb/:password" element={<Wrap><ClearDBRoute /></Wrap>} />
        <Route path="*" element={<Wrap><Placeholder title="404 Not Found" /></Wrap>} />
      </Routes>
    </AnimatePresence>
  );
}

function AppInner() {
  const {
    toasts, dismissToast,
    popupRoom, popupMessages, dismissPopup, sendPopupMsg,
  } = useNotificationContext();

  // currentUser is fetched lazily from localStorage-decoded JWT — here we
  // simply pass null and let ChatPopup handle it (it only uses it to tell
  // "is this message mine"). The Chat page separately tracks currentUser.
  const [currentUser, setCurrentUser] = React.useState(null);
  React.useEffect(() => {
    import('./api').then(({ default: api }) => {
      api.get('users/me/').then(r => setCurrentUser(r.data)).catch(() => {});
    });
  }, []);

  return (
    <Router>
      <CustomCursor />
      <div className="relative z-0 min-h-screen flex flex-col">
        <div className="ambient-glow"></div>
        <Navbar />
        <main className="max-w-[1400px] mx-auto px-4 py-6 flex-1 w-full">
          <AnimatedRoutes />
        </main>
        <Footer />
        <NotificationToastContainer toasts={toasts} dismissToast={dismissToast} offsetBottom={popupRoom ? 490 : 24} />
        <ChatPopup
          popupRoom={popupRoom}
          popupMessages={popupMessages}
          dismissPopup={dismissPopup}
          sendPopupMsg={sendPopupMsg}
          currentUser={currentUser}
        />
      </div>
    </Router>
  );
}

function App() {
  return (
    <NotificationProvider>
      <AppInner />
    </NotificationProvider>
  );
}

export default App;
