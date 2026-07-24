import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/apiClient";

export default function ResetPasswordPage() {
  const [params] = useSearchParams(); const [password, setPassword] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(""); try { const { data } = await api.post("/api/reset-password", { token: params.get("token"), password }); setMessage(data.message); } catch (e) { setError(e.response?.data?.message || "Password reset failed."); } finally { setBusy(false); } };
  return <section className="auth-card"><div className="auth-heading"><p className="eyebrow">NEW PASSWORD</p><h1>Choose a secure password.</h1><p>Use 12+ characters with upper/lowercase, a number, and a symbol.</p></div>{message ? <><p role="status">{message}</p><Link to="/login" className="primary-link">Sign in</Link></> : <form onSubmit={submit}><label>New password<span className="input-wrap"><input required minLength="12" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></span></label>{error && <p role="alert">{error}</p>}<button className="primary-link form-submit" disabled={busy}>{busy ? "Updating…" : "Update password"}</button></form>}</section>;
}
