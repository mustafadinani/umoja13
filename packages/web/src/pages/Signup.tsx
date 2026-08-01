import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { AuthCard, AuthPasswordInput, authInputStyle, authButtonStyle, authErrorStyle } from "../components/AuthCard";

export function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signUp(email, password, name);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create your account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Join Umoja Games" subtitle="One account — follow teams, check in, join The Hunt.">
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input style={authInputStyle} type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input style={authInputStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <AuthPasswordInput placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        {error && <div style={authErrorStyle}>{error}</div>}
        <button style={authButtonStyle} disabled={busy} type="submit">{busy ? "Creating account…" : "CREATE ACCOUNT"}</button>
      </form>
      <div style={{ marginTop: 16, fontSize: 13.5, color: theme.color.textMuted, textAlign: "center" }}>
        Already have an account? <Link to="/login" style={{ color: theme.color.blue, fontWeight: 600 }}>Sign in</Link>
      </div>
    </AuthCard>
  );
}
