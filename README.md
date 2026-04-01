# 🎓 Skill Swap Platform

> A comprehensive Django-based platform for exchanging technical and non-technical skills through chat and video calls

[![Django](https://img.shields.io/badge/Django-4.2+-green.svg)](https://www.djangoproject.com/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![Channels](https://img.shields.io/badge/Channels-4.0+-orange.svg)](https://channels.readthedocs.io/)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.0+-blue.svg)](https://tailwindcss.com/)

## ✨ Features

### 👤 User Management
- **Secure Authentication** - Login, register, logout
- **Rich Profiles** - Bio, photo, location, phone
- **Skill Portfolio** - Add unlimited skills with levels

### 🎯 Skill Exchange
- **Smart Matching** - Find users with complementary skills
- **Skill Categories** - Technical & non-technical
- **Skill Levels** - Beginner to expert
- **Teaching Mode** - Mark skills you can teach
- **Learning Mode** - Mark skills you want to learn

### 💬 Real-time Chat
- **WebSocket Powered** - Instant messaging
- **Chat History** - Persistent conversations
- **Direct Messaging** - One-on-one chats
- **Online Status** - See who's available

### 🎥 Video Calling
- **Video Chat** - WebRTC-ready interface
- **Call History** - Track all calls
- **Controls** - Mute, video toggle
- **Call Status** - Active, ended, missed

### 🎨 Modern UI
- **Dark Theme** - Eye-friendly design
- **Responsive** - Mobile & desktop
- **Tailwind CSS** - Modern styling
- **Smooth Animations** - Professional feel

## 🚀 Quick Start

## ☁️ Deploy On Render

This repository now includes `render.yaml` so you can deploy with Render Blueprint.

### Option 1: Blueprint (Recommended)

1. Push this project to GitHub.
2. In Render, click **New +** → **Blueprint**.
3. Select your repository.
4. Render will create:
     - Web service (`skill-swap`)
     - PostgreSQL database (`skill-swap-db`)
5. Deploy.

### Option 2: Manual Web Service

If you create a web service manually, use:

- Build command:
    `pip install -r requirements.txt ; python manage.py collectstatic --noinput ; python manage.py migrate`
- Start command:
    `daphne -b 0.0.0.0 -p $PORT skill_swap.asgi:application`

Required environment variables:

- `DJANGO_SECRET_KEY` = any secure random string
- `DEBUG` = `False`
- `ALLOWED_HOSTS` = `.onrender.com`
- `CSRF_TRUSTED_ORIGINS` = `https://*.onrender.com`
- `DATABASE_URL` = Render PostgreSQL connection string
- `LOG_LEVEL` = `INFO` (or `DEBUG`, `WARNING`, `ERROR`)

Health endpoint for uptime checks:

- `GET /health/` returns JSON: `{"status": "ok"}`
- `GET /health/db/` checks database connectivity and returns `503` if DB is unavailable

### Method 1: Automated Installation (Recommended)

Just run the installation script:

```bash
INSTALL.bat
```

That's it! The script will:
1. ✅ Create project structure
2. ✅ Generate all templates
3. ✅ Install dependencies
4. ✅ Setup database
5. ✅ Offer to create admin account
6. ✅ Offer to start server

### Method 2: Manual Installation

```bash
# 1. Build the project
python build_project.py
python build_templates.py

# 2. Activate virtual environment
venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Setup database
python manage.py makemigrations
python manage.py migrate

# 5. Create admin user
python manage.py createsuperuser

# 6. Run server
python manage.py runserver
```

### Method 3: Step-by-Step Guide

Run this for interactive guidance:
```bash
python START_HERE.py
```

## 📁 Project Structure

```
skill_swap/
│
├── 🎯 Core Files
│   ├── manage.py              # Django management
│   ├── requirements.txt       # Dependencies
│   ├── INSTALL.bat           # Auto installer
│   └── db.sqlite3            # Database
│
├── ⚙️ Configuration
│   └── skill_swap/
│       ├── settings.py        # Django settings
│       ├── urls.py           # Main URL routing
│       ├── asgi.py           # WebSocket config
│       └── wsgi.py           # WSGI config
│
├── 👥 Users App
│   └── users/
│       ├── models.py          # Profile & Skill models
│       ├── views.py          # Auth & profile views
│       ├── forms.py          # Registration forms
│       ├── templates/users/   # User templates
│       │   ├── login.html
│       │   ├── register.html
│       │   ├── profile.html
│       │   └── add_skill.html
│       └── static/users/     # User assets
│
├── 📊 Dashboard App
│   └── dashboard/
│       ├── models.py          # SkillMatch model
│       ├── views.py          # Dashboard views
│       ├── templates/dashboard/
│       │   ├── home.html
│       │   ├── browse_skills.html
│       │   └── my_matches.html
│       └── static/dashboard/
│
├── 💬 Chat App
│   └── chat/
│       ├── models.py          # ChatRoom & Message
│       ├── consumers.py       # WebSocket handlers
│       ├── routing.py         # WebSocket routing
│       ├── views.py          # Chat views
│       ├── templates/chat/
│       │   ├── chat_list.html
│       │   └── chat_room.html
│       └── static/chat/
│
├── 🎥 Video App
│   └── video/
│       ├── models.py          # VideoCall model
│       ├── views.py          # Video views
│       ├── templates/video/
│       │   ├── call_list.html
│       │   └── video_room.html
│       └── static/video/
│
├── 🎨 Global Resources
│   ├── templates/
│   │   └── base.html         # Base template
│   ├── static/               # Global CSS/JS
│   └── media/                # User uploads
│
└── 📚 Documentation
    ├── README.md             # This file
    ├── SETUP_GUIDE.md        # Detailed guide
    ├── PROJECT_SUMMARY.md    # Feature overview
    └── START_HERE.py         # Quick start

```

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Django 4.2+ |
| **Real-time** | Django Channels + WebSockets |
| **Database** | SQLite (dev) / PostgreSQL (prod) |
| **Frontend** | HTML5 + JavaScript |
| **Styling** | Tailwind CSS 3.x |
| **Images** | Pillow |
| **Server** | Daphne (ASGI) |
| **API** | Django REST Framework |

## 📸 Screenshots

### Dark Theme Interface
```
┌─────────────────────────────────────────────────────────┐
│  SkillSwap  Dashboard  Browse  Matches  Chat  Video    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Welcome, John!                                         │
│  Ready to share your skills and learn something new?   │
│                                                         │
│  [My Skills: 5]  [Can Teach: 3]  [Want to Learn: 2]   │
│                                                         │
│  Potential Matches:                                     │
│  ┌──────────────┐  ┌──────────────┐                   │
│  │ Python       │  │ JavaScript   │                   │
│  │ by Sarah     │  │ by Mike      │                   │
│  │ [Connect]    │  │ [Connect]    │                   │
│  └──────────────┘  └──────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

## 🔐 Security Features

- ✅ CSRF Protection
- ✅ Password validation
- ✅ Secure authentication
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Session management

## 🌐 URLs & Endpoints

| URL | Purpose |
|-----|---------|
| `/` | Login page |
| `/register/` | User registration |
| `/profile/` | User profile & skills |
| `/dashboard/` | Main dashboard |
| `/dashboard/browse/` | Browse all skills |
| `/dashboard/matches/` | Match requests |
| `/chat/` | Chat list |
| `/chat/room/<name>/` | Chat room |
| `/video/` | Call history |
| `/video/room/<id>/` | Video call |
| `/admin/` | Admin panel |

## 🎮 Usage Guide

### 1. Register an Account
- Click "Register" on homepage
- Fill in your details
- Login with credentials

### 2. Setup Your Profile
- Go to "Profile"
- Upload a photo
- Add bio and location
- Add your skills

### 3. Add Skills
- Click "Add Skill"
- Enter skill name
- Choose type (technical/non-technical)
- Set your level
- Mark if you can teach or want to learn

### 4. Find Matches
- Browse "Dashboard" for suggestions
- Or go to "Browse Skills"
- Filter by type or search
- Send connection requests

### 5. Start Chatting
- Accept match requests
- Click "Chat" to start conversation
- Real-time messaging enabled

### 6. Video Call
- From chat, click "Video Call"
- Or start from user profile
- Allow camera/mic access
- Enjoy the call!

## 📦 Dependencies

```
Django>=4.2,<5.0
channels>=4.0.0
daphne>=4.0.0
pillow>=10.0.0
djangorestframework>=3.14.0
```

## 🔧 Configuration

### Development Settings
```python
DEBUG = True
ALLOWED_HOSTS = ['*']
DATABASE = SQLite
CHANNEL_LAYER = InMemory
```

### Production Checklist
- [ ] Set `DEBUG = False`
- [ ] Configure `ALLOWED_HOSTS`
- [ ] Use PostgreSQL
- [ ] Setup Redis for Channels
- [ ] Configure email backend
- [ ] Setup HTTPS
- [ ] Use environment variables
- [ ] Configure static file serving
- [ ] Setup media file storage
- [ ] Implement rate limiting

## 🎥 Video Integration Options

For production video calling, integrate:

1. **Agora.io** - Recommended for easy setup
2. **Twilio Video** - Enterprise-grade
3. **Daily.co** - Great for MVP
4. **100ms** - Modern alternative
5. **Custom WebRTC** - Full control

## 🧪 Testing

```bash
# Run Django tests
python manage.py test

# Check setup
python test_setup.py

# Create test data
python manage.py shell
>>> from django.contrib.auth.models import User
>>> User.objects.create_user('testuser', 'test@test.com', 'password')
```

## 📈 Future Enhancements

- [ ] Group video calls
- [ ] Screen sharing
- [ ] File sharing in chat
- [ ] Skill ratings & reviews
- [ ] Notifications system
- [ ] Mobile app
- [ ] Advanced search filters
- [ ] Skill recommendations
- [ ] Achievement badges
- [ ] Integration with calendars

## 🐛 Troubleshooting

### Channels not working?
```bash
pip install channels daphne
python manage.py runserver
```

### Static files not loading?
```bash
python manage.py collectstatic
```

### Database errors?
```bash
# Reset database
del db.sqlite3
python manage.py migrate
```

### Import errors?
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

## 💡 Tips

- Use admin panel to quickly create test data
- Test WebSocket on localhost first
- Use HTTPS for video calls in production
- Check browser console for errors
- Keep Django and dependencies updated

## 📚 Documentation

- [Django Documentation](https://docs.djangoproject.com/)
- [Channels Documentation](https://channels.readthedocs.io/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [WebRTC Guide](https://webrtc.org/getting-started/overview)

## 📝 License

This project is open source and available for educational purposes.

## 🤝 Contributing

Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## 📧 Support

For issues or questions:
1. Check SETUP_GUIDE.md
2. Check PROJECT_SUMMARY.md
3. Review Django/Channels docs
4. Check browser console

## 🎉 Credits

Built with:
- Django - The web framework
- Channels - WebSocket support
- Tailwind CSS - Styling
- Pillow - Image processing

---

**Made with ❤️ using Django**

**Ready to swap some skills? Let's go! 🚀**
