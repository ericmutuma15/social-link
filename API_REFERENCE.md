# API Reference - Social Media Platform

**Base URL:** `http://localhost:5555`  
**Authentication:** JWT token in httpOnly cookie or Authorization header  
**Format:** JSON  
**Updated:** July 24, 2026

---

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user_id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  },
  "errors": []
}
```

**Error (400):**
```json
{
  "success": false,
  "message": "Email already registered",
  "data": null,
  "errors": ["email_exists"]
}
```

---

### POST /auth/login
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user_id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  },
  "errors": []
}
```

**Note:** Token is also set in httpOnly cookie `access_token_cookie`

---

### POST /auth/logout
Logout current user.

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null,
  "errors": []
}
```

---

## Messaging Endpoints

### POST /messages/send
Send a message to another user.

**Headers:** Authorization required

**Request:**
```json
{
  "receiver_id": 2,
  "message": "Hello, how are you?",
  "media_url": null,
  "media_type": null
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Message sent",
  "data": {
    "id": 123,
    "sender_id": 1,
    "receiver_id": 2,
    "message": "Hello, how are you?",
    "media_url": null,
    "media_type": null,
    "is_read": false,
    "timestamp": "2026-07-24T12:30:00"
  },
  "errors": []
}
```

**Errors:**
- 401: Not authenticated
- 400: Invalid receiver_id or user doesn't exist
- 400: Cannot message yourself

---

### GET /messages/<user_id>
Get conversation history with a specific user.

**Headers:** Authorization required

**Query Parameters:**
- `limit` (optional): Number of messages to retrieve (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response (200):**
```json
{
  "success": true,
  "message": "Messages retrieved",
  "data": [
    {
      "id": 123,
      "sender_id": 1,
      "receiver_id": 2,
      "message": "Hello!",
      "media_url": null,
      "media_type": null,
      "is_read": true,
      "timestamp": "2026-07-24T12:30:00",
      "sender_name": "John Doe",
      "receiver_name": "Jane Smith"
    }
  ],
  "errors": []
}
```

---

### PUT /messages/read/<sender_id>
Mark all messages from a sender as read.

**Headers:** Authorization required

**Response (200):**
```json
{
  "success": true,
  "message": "Messages marked as read",
  "data": {
    "updated_count": 5
  },
  "errors": []
}
```

---

### GET /api/chats
Get list of all active conversations.

**Headers:** Authorization required

**Query Parameters:**
- `limit` (optional): Number of chats (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response (200):**
```json
{
  "success": true,
  "message": "Chats retrieved",
  "data": [
    {
      "id": 2,
      "name": "Jane Smith",
      "profile_pic": "http://example.com/profile.jpg",
      "last_message": "That sounds great! Looking forward...",
      "last_message_at": "2026-07-24T12:30:00",
      "unread_count": 3,
      "is_online": true
    }
  ],
  "errors": []
}
```

---

### GET /api/messages/unread-count
Get total count of unread messages.

**Headers:** Authorization required

**Response (200):**
```json
{
  "success": true,
  "message": "Unread count retrieved",
  "data": {
    "unread_count": 12
  },
  "errors": []
}
```

---

## Notification Endpoints

### GET /api/notifications
Get all notifications with filtering and pagination.

**Headers:** Authorization required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page (default: 20)
- `status` (optional): Filter type - `all|unread|read|archived` (default: all)

**Response (200):**
```json
{
  "success": true,
  "message": "Notifications retrieved",
  "data": [
    {
      "id": 1,
      "message": "John sent you a message",
      "type": "message",
      "read": false,
      "archived": false,
      "created_at": "2026-07-24T12:30:00",
      "friend_request_id": null,
      "originator_id": 2,
      "originator_name": "John Doe",
      "originator_photo": "http://example.com/photo.jpg"
    },
    {
      "id": 2,
      "message": "Jane sent you a friend request",
      "type": "friend_request",
      "read": false,
      "archived": false,
      "created_at": "2026-07-24T12:00:00",
      "friend_request_id": 5,
      "originator_id": 3,
      "originator_name": "Jane Smith",
      "originator_photo": "http://example.com/photo2.jpg"
    }
  ],
  "errors": []
}
```

---

### GET /api/notifications/unread-count
Get count of unread notifications.

**Headers:** Authorization required

**Response (200):**
```json
{
  "success": true,
  "message": "Unread notification count retrieved",
  "data": {
    "unread_count": 5
  },
  "errors": []
}
```

---

## Post Endpoints

### POST /api/posts/<post_id>/like
Like or unlike a post.

**Headers:** Authorization required

**Response (200) - Like:**
```json
{
  "success": true,
  "message": "Post liked",
  "data": {
    "likes": 42,
    "liked": true
  },
  "errors": []
}
```

**Response (200) - Unlike:**
```json
{
  "success": true,
  "message": "Post unliked",
  "data": {
    "likes": 41,
    "liked": false
  },
  "errors": []
}
```

---

### POST /api/posts/<post_id>/bookmark
Bookmark or unbookmark a post.

**Headers:** Authorization required

**Response (200) - Bookmark:**
```json
{
  "success": true,
  "message": "Post bookmarked",
  "data": {
    "bookmarked": true
  },
  "errors": []
}
```

**Response (200) - Unbookmark:**
```json
{
  "success": true,
  "message": "Post bookmark removed",
  "data": {
    "bookmarked": false
  },
  "errors": []
}
```

---

## Comment Endpoints

### POST /api/posts/<post_id>/comments
Add a comment to a post.

**Headers:** Authorization required

**Request:**
```json
{
  "content": "Great post! Thanks for sharing."
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Comment added",
  "data": {
    "id": 50,
    "content": "Great post! Thanks for sharing.",
    "user_id": 1,
    "user_name": "John Doe",
    "user_photo": "http://example.com/photo.jpg",
    "post_id": 10,
    "timestamp": "2026-07-24T12:30:00"
  },
  "errors": []
}
```

**Errors:**
- 400: Comment cannot be empty
- 400: Comment exceeds 5000 characters
- 400: Post not found
- 401: Not authenticated

---

### GET /api/posts/<post_id>/comments
Get all comments on a post.

**Headers:** Authorization required

**Query Parameters:**
- `limit` (optional): Number of comments (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response (200):**
```json
{
  "success": true,
  "message": "Comments retrieved",
  "data": [
    {
      "id": 50,
      "content": "Great post! Thanks for sharing.",
      "user_id": 1,
      "user_name": "John Doe",
      "user_photo": "http://example.com/photo.jpg",
      "post_id": 10,
      "timestamp": "2026-07-24T12:30:00"
    },
    {
      "id": 49,
      "content": "Completely agree!",
      "user_id": 2,
      "user_name": "Jane Smith",
      "user_photo": "http://example.com/photo2.jpg",
      "post_id": 10,
      "timestamp": "2026-07-24T12:20:00"
    }
  ],
  "errors": []
}
```

---

## Friend Request Endpoints

### POST /friend-requests/send
Send a friend request.

**Headers:** Authorization required

**Request:**
```json
{
  "receiver_id": 3
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Friend request sent",
  "data": {
    "id": 15,
    "requester_id": 1,
    "receiver_id": 3,
    "status": "pending",
    "created_at": "2026-07-24T12:30:00"
  },
  "errors": []
}
```

---

### POST /friend-requests/<request_id>/accept
Accept a friend request.

**Headers:** Authorization required

**Response (200):**
```json
{
  "success": true,
  "message": "Friend request accepted",
  "data": {
    "friendship_id": 8,
    "user_id": 1,
    "friend_id": 3
  },
  "errors": []
}
```

---

### DELETE /friend-requests/<request_id>/decline
Decline a friend request.

**Headers:** Authorization required

**Response (200):**
```json
{
  "success": true,
  "message": "Friend request declined",
  "data": null,
  "errors": []
}
```

---

## Upload Endpoints

### POST /upload
Upload media file.

**Headers:** Authorization required, Content-Type: multipart/form-data

**Form Data:**
- `file` (required): Binary file data

**Response (200):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "media_url": "/static/uploads/1234567890.jpg",
    "media_type": "image",
    "filename": "1234567890.jpg"
  },
  "errors": []
}
```

**Errors:**
- 400: No file provided
- 400: Invalid file type
- 413: File too large

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "data": null,
  "errors": ["error_code_1", "error_code_2"]
}
```

**Common Error Codes:**
- `invalid_request`: Malformed request
- `unauthorized`: Authentication required
- `forbidden`: Access denied
- `not_found`: Resource not found
- `conflict`: Conflict (e.g., already exists)
- `validation_error`: Input validation failed
- `server_error`: Internal server error

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 413 | Payload Too Large |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## Rate Limiting

Authentication endpoints are rate-limited:
- **Login:** 5 attempts per 15 minutes
- **Register:** 3 attempts per 15 minutes
- **Message Send:** 30 messages per minute
- **Comment:** 20 comments per minute

Rate limit info in response headers:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1690200600
```

---

## WebSocket Events (Real-Time)

### Connection
```javascript
const socket = io('http://localhost:5555', {
  auth: {
    token: accessToken
  }
});
```

### Events to Emit
```javascript
// Send message in real-time
socket.emit('send_message', {
  receiver_id: 2,
  message: 'Hello!'
});

// User typing
socket.emit('typing', {
  recipient_id: 2
});

// Mark as read
socket.emit('mark_read', {
  sender_id: 2
});
```

### Events to Listen
```javascript
// New message received
socket.on('new_message', (data) => {
  console.log('Message from', data.sender_name, ':', data.message);
});

// User typing
socket.on('user_typing', (data) => {
  console.log('User', data.user_name, 'is typing...');
});

// User online
socket.on('user_online', (data) => {
  console.log('User', data.user_name, 'came online');
});

// User offline
socket.on('user_offline', (data) => {
  console.log('User', data.user_name, 'went offline');
});

// Notification
socket.on('notification', (data) => {
  console.log('New notification:', data.message);
});
```

---

## Example Usage

### Sending a Message
```javascript
const response = await fetch('http://localhost:5555/messages/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    receiver_id: 2,
    message: 'Hi Jane!'
  })
});

const data = await response.json();
if (data.success) {
  console.log('Message sent!');
} else {
  console.error(data.message);
}
```

### Getting Chats
```javascript
const response = await fetch('http://localhost:5555/api/chats?limit=20', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
data.data.forEach(chat => {
  console.log(`${chat.name}: ${chat.last_message}`);
});
```

### Posting a Comment
```javascript
const response = await fetch('http://localhost:5555/api/posts/10/comments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    content: 'Great post!'
  })
});

const data = await response.json();
if (data.success) {
  console.log('Comment added:', data.data.content);
}
```

---

## Pagination

For endpoints that support pagination:

**Query Parameters:**
- `page`: Page number (1-indexed, default: 1)
- `per_page`: Items per page (default: 20, max: 100)

**Response includes:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

---

## Authentication Notes

1. **JWT Token:** Retrieved from login endpoint
2. **Storage:** Stored in httpOnly cookie automatically
3. **Usage:** Include in Authorization header as `Bearer <token>`
4. **Expiration:** 24 hours (configurable)
5. **Refresh:** Automatic on each request (if using cookie)

---

## CORS Policy

Allowed origins:
- `http://localhost:5173` (dev)
- `http://localhost:3000` (dev)
- Production domains (configured in Talisman)

Allowed methods: GET, POST, PUT, DELETE, OPTIONS
Allowed headers: Content-Type, Authorization

---

**Last Updated:** July 24, 2026  
**API Version:** 1.0.0  
**Maintainer:** Development Team

