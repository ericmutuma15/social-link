from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import uuid
# Create uninitialized SQLAlchemy instance to avoid circular imports.
# The application will call `db.init_app(app)` in `app.py`.
db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    # Legacy password is retained temporarily for a zero-downtime bcrypt migration.
    password_hash = db.Column(db.String(255), nullable=True)
    public_id = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()), index=True)
    username = db.Column(db.String(50), unique=True, nullable=True, index=True)
    description = db.Column(db.String(500))
    location = db.Column(db.String(255))
    picture = db.Column(db.String(255))
    is_super_user = db.Column(db.Boolean, default=False)
    role = db.Column(db.String(50), default="Member", nullable=False)
    department = db.Column(db.String(100))
    status = db.Column(db.String(20), default="active", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime, nullable=True)
    is_verified = db.Column(db.Boolean, default=False, nullable=False, index=True)
    # Tokens are stored as hashes.  The signed value sent by email is never
    # persisted, so a database leak cannot be used to verify an account.
    verification_token = db.Column(db.String(64), nullable=True, index=True)
    verification_sent_at = db.Column(db.DateTime, nullable=True)
    reset_token = db.Column(db.String(64), nullable=True, index=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)
    two_factor_enabled = db.Column(db.Boolean, default=False, nullable=False)
    avatar = db.Column(db.String(255), nullable=True)
    cover_photo = db.Column(db.String(255), nullable=True)
    phone_number = db.Column(db.String(32), nullable=True)
    website = db.Column(db.String(255), nullable=True)
    occupation = db.Column(db.String(100), nullable=True)
    company = db.Column(db.String(100), nullable=True)
    timezone = db.Column(db.String(64), default="UTC", nullable=False)
    language = db.Column(db.String(10), default="en", nullable=False)
    theme_preference = db.Column(db.String(12), default="system", nullable=False)
    social_links = db.Column(db.JSON, default=dict, nullable=False)
    settings = db.Column(db.JSON, default=dict, nullable=False)
    failed_login_attempts = db.Column(db.Integer, default=0, nullable=False)
    account_locked_until = db.Column(db.DateTime, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True, index=True)
    last_active = db.Column(db.DateTime, nullable=True, index=True)

    # Relationships
    posts = db.relationship('Post', back_populates='user', lazy='dynamic')
    sent_requests = db.relationship('FriendRequest', foreign_keys='FriendRequest.requester_id', back_populates='requester')
    received_requests = db.relationship('FriendRequest', foreign_keys='FriendRequest.recipient_id', back_populates='recipient')
    likes = db.relationship('Like', back_populates='user', lazy='dynamic')
    comments = db.relationship('Comment', back_populates='user', lazy='select')

    def __repr__(self):
        return f"<User {self.name}>"


class TokenBlocklist(db.Model):
    __tablename__ = "token_blocklist"
    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_type = db.Column(db.String(10), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class AuditLog(db.Model):
    __tablename__ = "audit_logs"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = db.Column(db.String(100), nullable=False, index=True)
    ip_address = db.Column(db.String(64), nullable=True)
    user_agent = db.Column(db.String(500), nullable=True)
    metadata_json = db.Column(db.JSON, default=dict, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)


class Post(db.Model):
    __tablename__ = 'posts'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=True)  # Text, images, videos, quotes, etc.
    media_url = db.Column(db.String(300), nullable=True)  # URL or file path for media
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = db.relationship('User', back_populates='posts', overlaps="author")
    author = db.relationship('User', back_populates='posts', overlaps="user")
    likes = db.relationship('Like', back_populates='post', lazy='dynamic')
    comments = db.relationship('Comment', back_populates='post', lazy='select')  # Change 'dynamic' to 'select'

    # This method calculates the total like count for a post
    def like_count(self):
        return self.likes.count()  # This returns the total number of likes

    def __repr__(self):
        return f"<Post by User {self.user_id} at {self.timestamp}>"

class Comment(db.Model):  # New Comment model
    __tablename__ = 'comments'
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)  # Content of the comment
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False)

    # Relationships
    user = db.relationship('User', back_populates='comments')
    post = db.relationship('Post', back_populates='comments')

    def __repr__(self):
        return f"<Comment by User {self.user_id} on Post {self.post_id}>"

class Like(db.Model):
    __tablename__ = 'likes'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = db.relationship('User', back_populates='likes')
    post = db.relationship('Post', back_populates='likes')
    __table_args__ = (db.UniqueConstraint('user_id', 'post_id', name='unique_user_post_like'),)

    def __repr__(self):
        return f"<Like by User {self.user_id} on Post {self.post_id}>"


class Bookmark(db.Model):
    __tablename__ = 'bookmarks'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    user = db.relationship('User', backref=db.backref('bookmarks', lazy='dynamic'))
    post = db.relationship('Post', backref=db.backref('bookmarks', lazy='dynamic'))
    __table_args__ = (db.UniqueConstraint('user_id', 'post_id', name='unique_user_post_bookmark'),)


class Community(db.Model):
    __tablename__ = 'communities'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    slug = db.Column(db.String(120), unique=True, nullable=False)
    description = db.Column(db.String(500), default='')
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    owner = db.relationship('User', backref='owned_communities')


class CommunityMember(db.Model):
    __tablename__ = 'community_members'
    id = db.Column(db.Integer, primary_key=True)
    community_id = db.Column(db.Integer, db.ForeignKey('communities.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(20), default='member', nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    community = db.relationship('Community', backref=db.backref('members', lazy='dynamic'))
    user = db.relationship('User', backref=db.backref('community_memberships', lazy='dynamic'))
    __table_args__ = (db.UniqueConstraint('community_id', 'user_id', name='unique_community_member'),)


class Story(db.Model):
    __tablename__ = 'stories'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text)
    media_url = db.Column(db.String(300))
    media_type = db.Column(db.String(20), default='text', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.utcnow()+ timedelta(hours=24)
)
    user = db.relationship('User', backref=db.backref('stories', lazy='dynamic'))

class Message(db.Model):
    __tablename__ = 'messages'
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.Text, nullable=True)
    media_type = db.Column(db.String(10), nullable=True)  # image, video, audio
    media_url = db.Column(db.String(300), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    delivered_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    read_at = db.Column(db.DateTime, nullable=True)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    deleted_by_sender = db.Column(db.Boolean, default=False, nullable=False)
    deleted_by_receiver = db.Column(db.Boolean, default=False, nullable=False)

    sender = db.relationship("User", foreign_keys=[sender_id])
    receiver = db.relationship("User", foreign_keys=[receiver_id])

    def __repr__(self):
        return f"<Message from {self.sender_id} to {self.receiver_id}>"


class FriendRequest(db.Model):
    __tablename__ = 'friend_requests'
    id = db.Column(db.Integer, primary_key=True)
    requester_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    requester = db.relationship('User', foreign_keys=[requester_id], back_populates='sent_requests')
    recipient = db.relationship('User', foreign_keys=[recipient_id], back_populates='received_requests')

    def __repr__(self):
        return f"<FriendRequest from {self.requester_id} to {self.recipient_id}, status={self.status}>"


class Notification(db.Model):
    __tablename__ = 'notification'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    # friend_request_id can be null for notifications that are not friend-request related
    friend_request_id = db.Column(db.Integer, db.ForeignKey('friend_requests.id'), nullable=True)
    read = db.Column(db.Boolean, default=False)  # New field to track read status
    archived = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships (optional, but useful)
    friend_request = db.relationship("FriendRequest", backref="notifications")




class Friendship(db.Model):
    __tablename__ = 'friendship'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    friend_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", foreign_keys=[user_id], backref="friends")
    friend = db.relationship("User", foreign_keys=[friend_id], backref="friend_of")

    __table_args__ = (db.UniqueConstraint('user_id', 'friend_id', name='unique_friendship'),)


# Future automation/integration domain. These models contain no provider secrets in
# plaintext; an application KMS/encryption service should encrypt token values.
class AIAgent(db.Model):
    __tablename__ = "ai_agents"
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    status = db.Column(db.String(20), default="draft", nullable=False, index=True)
    configuration = db.Column(db.JSON, default=dict, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Lead(db.Model):
    __tablename__ = "leads"
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    source = db.Column(db.String(50), nullable=False, default="manual", index=True)
    status = db.Column(db.String(30), nullable=False, default="new", index=True)
    email = db.Column(db.String(255), nullable=True, index=True)
    profile = db.Column(db.JSON, default=dict, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SocialAccount(db.Model):
    __tablename__ = "social_accounts"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = db.Column(db.String(30), nullable=False, index=True)
    external_account_id = db.Column(db.String(255), nullable=False)
    display_name = db.Column(db.String(255), nullable=True)
    scopes = db.Column(db.JSON, default=list, nullable=False)
    permissions = db.Column(db.JSON, default=list, nullable=False)
    business_account_id = db.Column(db.String(255), nullable=True)
    webhook_configuration = db.Column(db.JSON, default=dict, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    __table_args__ = (db.UniqueConstraint("provider", "external_account_id", name="uq_social_provider_external"),)


class OAuthToken(db.Model):
    __tablename__ = "oauth_tokens"
    id = db.Column(db.Integer, primary_key=True)
    social_account_id = db.Column(db.Integer, db.ForeignKey("social_accounts.id", ondelete="CASCADE"), nullable=False, unique=True)
    access_token_encrypted = db.Column(db.Text, nullable=False)
    refresh_token_encrypted = db.Column(db.Text, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
