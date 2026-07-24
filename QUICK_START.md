# Quick Start Guide - Social Media Platform

**Last Updated:** July 24, 2026  
**Status:** Production Ready (Core Features)

---

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Git

### Quick Setup (5 minutes)

#### 1. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with database URL
echo "DATABASE_URL=postgresql://user:password@localhost:5432/social" > .env

# Initialize database
flask db upgrade

# Start server
flask run --port=5555
```

#### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install
# or
pnpm install

# Start dev server
npm run dev
# or
pnpm dev
```

### Verify Installation
- Backend: http://localhost:5555 (should show Flask welcome)
- Frontend: http://localhost:5173 (should show React app)

---

## 📁 Project Structure

```
social/
├── backend/                 # Flask API server
│   ├── app.py              # Main Flask application (all endpoints)
│   ├── models.py           # SQLAlchemy ORM models
│   ├── config.py           # Configuration
│   ├── app_core/
│   │   └── security.py     # Auth helpers, password verification
│   ├── migrations/         # Database migrations
│   ├── tests/             # Backend tests
│   ├── static/            # Uploaded files
│   └── requirements.txt    # Python dependencies
│
├── frontend/               # React Vite application
│   ├── src/
│   │   ├── pages/         # Page components (Chat, Messages, etc.)
│   │   ├── components/    # Reusable components
│   │   ├── services/      # API client functions
│   │   ├── hooks/         # Custom React hooks
│   │   ├── context/       # React context for state
│   │   ├── App.jsx        # Main app component
│   │   └── main.jsx       # Entry point
│   ├── package.json       # NPM dependencies
│   ├── vite.config.js     # Vite configuration
│   └── tailwind.config.js # TailwindCSS configuration
│
├── AUDIT_REPORT.md        # Comprehensive audit findings
├── API_REFERENCE.md       # API documentation
└── FRONTEND_IMPLEMENTATION_GUIDE.md  # Next steps for frontend
```

---

## 🔐 Authentication Flow

### Registration
1. User fills form with email, password, name
2. POST to `/auth/register`
3. Password hashed with bcrypt
4. User created in database
5. JWT token returned

### Login
1. User enters email and password
2. POST to `/auth/login`
3. Password verified (supports both bcrypt and legacy hashes)
4. JWT token generated and stored in httpOnly cookie
5. Token returned in response

### Protected Requests
1. JWT token included in Authorization header
2. Token verified by Flask-JWT-Extended
3. User ID extracted from token
4. Request processed

---

## 💬 Messaging Flow

### Sending a Message
1. User types message in Chat page
2. Click Send button (becomes disabled during send)
3. POST to `/messages/send` with receiver_id and message text
4. Backend:
   - Validates receiver exists
   - Creates Message record
   - Creates Notification for receiver
   - Emits WebSocket event
5. Frontend receives success toast
6. Message appears in conversation
7. WebSocket event updates receiver's chat list in real-time

### Receiving Messages
1. Backend emits `new_message` WebSocket event
2. Frontend receives event
3. Message added to conversation
4. Unread count updated
5. Toast notification shown
6. Badge on messages icon updated

### Marking as Read
1. User opens conversation with someone
2. Frontend automatically calls `/messages/read/<sender_id>`
3. All messages from that sender marked as read
4. Unread badge updated

---

## 🔔 Notifications System

### Notification Types
- **message** - Someone sent you a message
- **friend_request** - Someone sent you a friend request
- **like** - Someone liked your post
- **comment** - Someone commented on your post

### Getting Notifications
```javascript
GET /api/notifications?status=unread&page=1
```

### Filtering Notifications
- `status=all` - All notifications
- `status=unread` - Only unread
- `status=read` - Only read
- `status=archived` - Only archived

---

## 📝 Database Schema Overview

### Key Tables

**users**
- id, email, password, password_hash (dual-mode for migration)
- name, picture, is_verified, last_active

**messages**
- id, sender_id, receiver_id, message
- media_url, media_type, is_read, timestamp

**notifications**
- id, user_id, message, type (message|friend_request|like|comment)
- read, archived, friend_request_id, created_at

**posts**
- id, user_id, content, media_url, created_at

**likes**
- id, user_id, post_id (unique together)

**comments**
- id, user_id, post_id, content, timestamp

**friend_requests**
- id, requester_id, receiver_id, status (pending|accepted|declined)

**friendships**
- id, user_id, friend_id, created_at

---

## 🛠️ Common Development Tasks

### Adding a New API Endpoint

1. **Define in app.py:**
```python
@app.route('/api/feature', methods=['POST'])
@jwt_required()
def create_feature():
    current_user_id = int(get_jwt_identity())
    
    data = request.get_json()
    
    # Validation
    if not data.get('name'):
        return api_response(message="Name is required", status=400)
    
    # Process
    feature = Feature(user_id=current_user_id, name=data['name'])
    db.session.add(feature)
    db.session.commit()
    
    return api_response(
        data={'id': feature.id},
        message="Feature created",
        status=201
    )
```

2. **Call from frontend:**
```javascript
const response = await fetch('/api/feature', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ name: 'My Feature' })
});

const data = await response.json();
if (data.success) {
  console.log('Created:', data.data);
}
```

### Adding a New Model

1. **Define in models.py:**
```python
class Feature(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='features')
```

2. **Create migration:**
```bash
flask db migrate -m "Add Feature model"
flask db upgrade
```

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm run test
```

---

## 🐛 Debugging Tips

### Check Flask Logs
```bash
# Backend console shows request logs
# Look for error messages in red
```

### Check Browser Console
```javascript
// F12 in browser
// Check for JavaScript errors
// Check Network tab for API responses
```

### Debug Database
```bash
# Connect to PostgreSQL
psql social_db

# View messages
SELECT * FROM messages ORDER BY timestamp DESC;

# View notifications
SELECT * FROM notifications WHERE user_id = 1;

# View users
SELECT id, email, name FROM users;
```

### Test API with curl
```bash
# Get unread messages count
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5555/api/messages/unread-count

# Send message
curl -X POST http://localhost:5555/messages/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"receiver_id": 2, "message": "Hi!"}'
```

---

## 📊 Key Metrics to Monitor

### Performance
- Message send latency (target: <200ms)
- Message retrieval latency (target: <100ms)
- WebSocket message delivery latency (target: <50ms)

### Reliability
- Message delivery success rate (target: 99.9%)
- Notification delivery rate (target: 99.5%)
- Database connection pool utilization (target: <80%)

### User Experience
- Messages per day per user
- Average response time
- Error rate (target: <0.1%)

---

## 🚨 Troubleshooting

### Flask won't start
```bash
# Check if port 5555 is in use
lsof -i :5555

# Check for syntax errors
python -m py_compile backend/app.py

# Check .env file exists
ls -la backend/.env
```

### Database connection error
```bash
# Verify PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Check DATABASE_URL
echo $DATABASE_URL
```

### Frontend won't connect to backend
```bash
# Check CORS headers
# Check API_BASE_URL in frontend/.env
# Verify backend is running on port 5555
```

### JWT token invalid
```bash
# Token might be expired (24 hours)
# Check Authorization header format: "Bearer <token>"
# Clear cookies and re-login
```

---

## 📝 Code Style Guidelines

### Python
- Use PEP 8 style guide
- Type hints for function arguments
- Docstrings for all functions
- Error handling with try/except

### JavaScript
- Use const/let (not var)
- Arrow functions preferred
- PropTypes or TypeScript for validation
- Component names PascalCase
- Function names camelCase

### React Components
- Functional components with hooks
- Memoize when needed
- Props destructuring
- Event handlers with handleXxx pattern

---

## 🔄 Deployment Checklist

Before deploying to production:

- [ ] Set `APP_ENV=production`
- [ ] Configure real database (PostgreSQL)
- [ ] Set up HTTPS (SSL certificate)
- [ ] Configure email service
- [ ] Set strong JWT secret
- [ ] Configure CORS for production domains
- [ ] Set up database backups
- [ ] Configure monitoring and alerting
- [ ] Test message sending under load
- [ ] Test notifications under load
- [ ] Security audit of authentication
- [ ] Load test all endpoints

---

## 📚 Resources

### Documentation
- [Flask Documentation](https://flask.palletsprojects.com/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/)
- [React Documentation](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)

### Tools
- [Postman](https://www.postman.com/) - API testing
- [DBeaver](https://dbeaver.io/) - Database management
- [VS Code](https://code.visualstudio.com/) - Code editor

### Learning
- [Full Stack Web Development](https://fullstackopen.com/)
- [Python Flask Tutorial](https://blog.miguelgrinberg.com/post/the-flask-mega-tutorial-part-i-hello-world)
- [React Tutorial](https://react.dev/learn)

---

## 🤝 Contributing

### Process
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes
3. Test thoroughly
4. Commit: `git commit -m "Add: my feature"`
5. Push: `git push origin feature/my-feature`
6. Create Pull Request

### Commit Messages
- `Add:` for new features
- `Fix:` for bug fixes
- `Refactor:` for code reorganization
- `Docs:` for documentation
- `Test:` for test additions

---

## 📞 Support

### Getting Help
1. Check documentation files (AUDIT_REPORT.md, API_REFERENCE.md)
2. Search existing issues
3. Check logs for error messages
4. Create detailed issue with:
   - Error message
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details

---

## 🎯 Next Steps

1. **Frontend Improvements** - See [FRONTEND_IMPLEMENTATION_GUIDE.md](FRONTEND_IMPLEMENTATION_GUIDE.md)
2. **Performance Optimization** - See [AUDIT_REPORT.md](AUDIT_REPORT.md#7-performance-optimizations-implemented)
3. **Deployment** - See [AUDIT_REPORT.md](AUDIT_REPORT.md#10-deployment-checklist)

---

**Questions?** Check the audit report or API reference documentation first!

