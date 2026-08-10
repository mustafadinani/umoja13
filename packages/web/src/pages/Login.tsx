import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { AuthCard, AuthPasswordInput, authInputStyle, authButtonStyle, authErrorStyle } from "../components/AuthCard";

interface LoginNavState {
  email?: string;
  mode?: "signIn" | "forgotPassword";
}

export function Login() {
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Arriving from Signup's "email already in use" message — carry over the
  // email they already typed and jump straight to the reset form if that's
  // where they came from, instead of making them retype everything.
  const navState = (location.state ?? null) as LoginNavState | null;
  const [email, setEmail] = useState(navState?.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signIn" | "forgotPassword">(navState?.mode ?? "signIn");
  const [resetSent, setResetSent] = useState(false);

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

  async function onResetSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      // Don't let "no account for this email" become a way to probe which
      // emails have accounts — only a genuinely malformed address gets its
      // own error; anything else (including user-not-found) shows the same
      // success message as a real send.
      const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : null;
      if (code === "auth/invalid-email") {
        setError("That doesn't look like a valid email address.");
      } else {
        setResetSent(true);
      }
    } finally {
      setBusy(false);
    }
  }

  function backToSignIn() {
    setMode("signIn");
    setResetSent(false);
    setError(null);
  }

  if (mode === "forgotPassword") {
    return (
      <AuthCard title="Reset password" subtitle="We'll email you a link to set a new one.">
        {resetSent ? (
          <div>
            <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
              If <strong>{email}</strong> has an account, a password reset link is on its way — check your inbox
              (and spam folder).
            </div>
            <button style={authButtonStyle} onClick={backToSignIn} type="button">BACK TO SIGN IN</button>
          </div>
        ) : (
          <form onSubmit={onResetSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input style={authInputStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {error && <div style={authErrorStyle}>{error}</div>}
            <button style={authButtonStyle} disabled={busy} type="submit">{busy ? "Sending…" : "SEND RESET LINK"}</button>
            <div style={{ fontSize: 13.5, color: theme.color.textMuted, textAlign: "center" }}>
              <span onClick={backToSignIn} style={{ color: theme.color.blue, fontWeight: 600, cursor: "pointer" }}>Back to sign in</span>
            </div>
          </form>
        )}
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Sign in" subtitle="Welcome back to Umoja Games.">
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input style={authInputStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <AuthPasswordInput placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <div style={{ textAlign: "right", marginTop: -4 }}>
          <span
            onClick={() => { setMode("forgotPassword"); setError(null); }}
            style={{ fontSize: 12.5, color: theme.color.blue, fontWeight: 600, cursor: "pointer" }}
          >
            Forgot password?
          </span>
        </div>
        {error && <div style={authErrorStyle}>{error}</div>}
        <button style={authButtonStyle} disabled={busy} type="submit">{busy ? "Signing in…" : "SIGN IN"}</button>
      </form>
      <div style={{ marginTop: 16, fontSize: 13.5, color: theme.color.textMuted, textAlign: "center" }}>
        New here? <Link to="/signup" style={{ color: theme.color.blue, fontWeight: 600 }}>Create an account</Link>
      </div>
    </AuthCard>
  );
}
