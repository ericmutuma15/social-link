import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/apiClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event) => { event.preventDefault(); setBusy(true); try { const { data } = await api.post("/api/forgot-password", { email }); setMessage(data.message); } finally { setBusy(false); } };
  return <section className="auth-card"><Link to="/login" className="brand auth-brand"><span>👊</span>mbogi</Link><div className="auth-heading"><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Reset your password.</h1><p>Enter your email and we’ll send a secure reset link.</p></div>{message ? <p role="status">{message}</p> : <form onSubmit={submit}><label>Email address<span className="input-wrap"><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></span></label><button className="primary-link form-submit" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button></form>}</section>;
}
