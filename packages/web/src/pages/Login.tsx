import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { AuthCard, authInputStyle, authButtonStyle, authErrorStyle } from "../components/AuthCard";

export function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Sign in" subtitle="Welcome back to Umoja Games.">
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input style={authInputStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input style={authInputStyle} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <div style={authErrorStyle}>{error}</div>}
        <button style={authButtonStyle} disabled={busy} type="submit">{busy ? "Signing in…" : "SIGN IN"}</button>
      </form>
      <div style={{ marginTop: 16, fontSize: 13.5, color: theme.color.textMuted, textAlign: "center" }}>
        New here? <Link to="/signup" style={{ color: theme.color.blue, fontWeight: 600 }}>Create an account</Link>
      </div>
    </AuthCard>
  );
}
