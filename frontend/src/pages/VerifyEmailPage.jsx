import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/apiClient";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true, message: "Verifying your email…", error: false });
  useEffect(() => {
    const token = params.get("token");
    if (!token) return setState({ loading: false, error: true, message: "This verification link is incomplete." });
    api.post("/api/verify-email", { token })
      .then(({ data }) => setState({ loading: false, error: false, message: data.message }))
      .catch((error) => setState({ loading: false, error: true, message: error.response?.data?.message || "We could not verify this link." }));
  }, [params]);
  return <section className="auth-card success-card"><p className="eyebrow">ACCOUNT VERIFICATION</p><h1>{state.loading ? "One moment…" : state.error ? "Verification unavailable" : "Email verified"}</h1><p>{state.message}</p>{!state.loading && <Link className="primary-link" to="/login">Go to sign in</Link>}</section>;
}
