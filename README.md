# Mbogi Social Platform

The application is a Flask/SQLAlchemy API with a Vite/React client. Existing API routes remain available while the backend gains cookie-based JWT authentication, email verification, password recovery, token revocation, audit logging, rate limiting, and a foundation for AI and social-account integrations.

## Production configuration

Set these values in the backend environment before deployment:

- `DATABASE_URL`: Supabase PostgreSQL connection URL (use `postgresql+psycopg2://` if required by the platform).
- `SECRET_KEY` and `JWT_SECRET_KEY`: distinct, long random secrets.
- `FRONTEND_URL`, `CORS_ORIGINS`, `COOKIE_SECURE=true`, and `COOKIE_SAMESITE=None` for a separately hosted frontend.
- `MAIL_SERVER`, `MAIL_USERNAME`, `MAIL_PASSWORD`, and `MAIL_DEFAULT_SENDER` for verification and reset emails.
- `RATELIMIT_STORAGE_URI`: a Redis URL in multi-instance deployments; `memory://` is only suitable for development.

Install backend dependencies with `pip install -r requirements.txt`, then apply the ordered migrations:

```sh
cd backend
flask --app app db upgrade
```

The migration sequence is additive and preserves the legacy `users.password` hash during transition. New and reset passwords are bcrypt hashes in `users.password_hash`; successful legacy authentication is upgraded transparently.

## Security and compatibility notes

- Authenticated APIs remain cookie-based and now require an `X-CSRF-TOKEN` header for unsafe methods. The shared Axios client provides it automatically.
- Registration now requires email verification before password login. Google and GitHub identities with provider-verified email are marked verified.
- The legacy response payloads used by existing screens are preserved; new auth endpoints use `{ success, message, data, errors }`.
- The social/OAuth and AI tables are schema foundations only. Provider tokens must be encrypted by a deployment-managed KMS before integration services are enabled.
