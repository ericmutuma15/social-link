import { useMemo, useState } from "react";
import {
  HiCheckCircle,
  HiEye,
  HiEyeOff,
  HiLockClosed,
  HiMail,
  HiUser,
} from "react-icons/hi";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/apiClient";
const score = (password) =>
  [
    password.length >= 12,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const strength = useMemo(() => score(form.password), [form.password]);
  const submit = async (event) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword)
      return toast.error("Passwords need to match.");
    if (strength < 4) return toast.error("Use 12+ characters with uppercase, lowercase, a number, and a symbol.");
    setSubmitting(true);
    try {
      await api.post("/api/register", {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      setSuccess(true);
    } catch (error) {
      toast.error(
        error.response?.data?.errors?.[0] || error.response?.data?.message || "We couldn’t create your account.",
      );
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
      toast.success(data?.message || "A fresh verification link has been sent.");
    } catch (error) {
      toast.error(error.response?.data?.message || "We could not resend the verification link.");
    } finally {
      setResending(false);
    }
  };

  if (success)
    return (
      <section className="auth-card success-card">
        <HiCheckCircle />
        <p className="eyebrow">YOU’RE IN</p>
        <h1>Check your inbox.</h1>
        <p>
          We’ve created your Desire Link account. Verify your email before you
          sign in to begin shaping your feed.
        </p>
        <button className="primary-link" onClick={() => navigate("/login")}>
          Go to sign in
        </button>
        <button className="text-link" onClick={resendVerification} disabled={resending}>
          {resending ? "Sending…" : "Resend verification email"}
        </button>
      </section>
    );
  return (
    <section className="auth-card">
      <Link to="/" className="brand auth-brand">
        <span>👊</span>mbogi
      </Link>
      <div className="auth-heading">
        <p className="eyebrow">JOIN THE CIRCLE</p>
        <h1>Start something real.</h1>
        <p>A few details and you’re ready to connect.</p>
      </div>
      <form onSubmit={submit}>
        <label>
          Your name
          <span className="input-wrap">
            <HiUser />
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="How should we call you?"
            />
          </span>
        </label>
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
              type={show ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength="12"
              placeholder="12+ characters, number, symbol"
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShow((v) => !v)}
            >
              {show ? <HiEyeOff /> : <HiEye />}
            </button>
          </span>
        </label>
        <div className="strength">
          <div>
            {[1, 2, 3, 4, 5].map((i) => (
              <i key={i} className={i <= strength ? "active" : ""} />
            ))}
          </div>
          <small>
            {
              ["Add 12+ characters", "Add every character type", "Keep going", "Almost there", "One more step", "Strong password"][
                strength
              ]
            }
          </small>
        </div>
        <label>
          Confirm password
          <span className="input-wrap">
            <HiLockClosed />
            <input
              required
              type="password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
              placeholder="Repeat your password"
            />
          </span>
        </label>
        <button className="primary-link form-submit" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="auth-footer">
        Already a member? <Link to="/login">Sign in</Link>
      </p>
    </section>
  );
}
