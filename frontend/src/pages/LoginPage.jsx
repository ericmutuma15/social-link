import { useCallback, useEffect, useRef, useState } from "react";
import { HiEye, HiEyeOff, HiLockClosed, HiMail } from "react-icons/hi";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import api from "../services/apiClient";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const googleInitializedRef = useRef(false);
  const { loadSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from?.pathname || "/home";
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  const finish = useCallback(async () => {
    await loadSession();
    navigate(destination, { replace: true });
  }, [destination, loadSession, navigate]);
  useEffect(() => {
    if (!googleClientId || typeof window === "undefined") {
      return undefined;
    }

    if (window.google?.accounts?.id) {
      if (!googleInitializedRef.current) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            setSubmitting(true);
            try {
              await api.post("/api/google-login", { id_token: response.credential });
              toast.success("Signed in with Google.");
              await finish();
            } catch (error) {
              toast.error(
                error.response?.data?.message || "Google sign-in did not complete.",
              );
            } finally {
              setSubmitting(false);
            }
          },
        });
        googleInitializedRef.current = true;
      }
      return undefined;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id && !googleInitializedRef.current) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            setSubmitting(true);
            try {
              await api.post("/api/google-login", { id_token: response.credential });
              toast.success("Signed in with Google.");
              await finish();
            } catch (error) {
              toast.error(
                error.response?.data?.message || "Google sign-in did not complete.",
              );
            } finally {
              setSubmitting(false);
            }
          },
        });
        googleInitializedRef.current = true;
      }
    };

    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [finish, googleClientId]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/api/login", {
        email: form.email,
        password: form.password,
      });
      toast.success("Welcome back.");
      await finish();
    } catch (error) {
      toast.error(error.response?.data?.message || "We couldn’t sign you in.");
    } finally {
      setSubmitting(false);
    }
  };

  const google = async () => {
    if (!googleClientId) {
      toast.error("Google sign-in is not configured for this app.");
      return;
    }

    if (!window.google?.accounts?.id) {
      toast.error("Google sign-in is not ready yet. Please refresh and try again.");
      return;
    }

    setSubmitting(true);
    try {
      window.google.accounts.id.prompt();
    } finally {
      setSubmitting(false);
    }
  };

  const resendVerification = async () => {
    if (!form.email) {
      toast.error("Enter your email so we can resend the verification link.");
      return;
    }

    setResending(true);
    try {
      const { data } = await api.post("/api/resend-verification", { email: form.email });
      toast.success(data?.message || "A fresh verification link is on its way.");
    } catch (error) {
      toast.error(error.response?.data?.message || "We could not resend the verification link.");
    } finally {
      setResending(false);
    }
  };
  return (
    <section className="auth-card">
      <Link to="/" className="brand auth-brand">
        <span>👊</span>mbogi
      </Link>
      <div className="auth-heading">
        <p className="eyebrow">WELCOME BACK</p>
        <h1>Pick up where you left off.</h1>
        <p>Sign in to your quieter social space.</p>
      </div>
      <form onSubmit={submit}>
        <label>
          Email address
          <span className="input-wrap">
            <HiMail />
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </span>
        </label>
        <label>
          Password
          <span className="input-wrap">
            <HiLockClosed />
            <input
              required
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Your password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <HiEyeOff /> : <HiEye />}
            </button>
          </span>
        </label>
        <div className="form-options">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(e) => setForm({ ...form, remember: e.target.checked })}
            />{" "}
            Remember me
          </label>
          <Link to="/forgot-password" className="text-link">
            Forgot password?
          </Link>
        </div>
        <button className="primary-link form-submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
        <button type="button" className="text-link" onClick={resendVerification} disabled={resending || submitting}>
          {resending ? "Sending…" : "Resend verification email"}
        </button>
      </form>
      <div className="divider">
        <span>or continue with</span>
      </div>
      <div className="oauth-actions">
        <button onClick={google} disabled={submitting}>
          Google
        </button>
        <button
          onClick={() => {
            window.location.assign(
              `${import.meta.env.VITE_API_BASE_URL}/api/github-login`,
            );
          }}
          disabled={submitting}
        >
          GitHub
        </button>
      </div>
      <p className="auth-footer">
        New here? <Link to="/signup">Create an account</Link>
      </p>
    </section>
  );
}
