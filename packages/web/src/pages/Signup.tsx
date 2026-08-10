import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { AuthCard, AuthPasswordInput, authInputStyle, authButtonStyle, authErrorStyle } from "../components/AuthCard";

function authErrorCode(err: unknown): string | null {
  return err && typeof err === "object" && "code" in err ? (err as { code: string }).code : null;
}

export function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Umoja Outreach runs several other programs on this same Firebase
  // project, so plenty of real people already have an account under their
  // email from something else entirely — "email already in use" is common
  // and not a sign anything's broken. Give them a way forward instead of a
  // raw Firebase error string.
  const [emailInUse, setEmailInUse] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailInUse(false);
    setBusy(true);
    try {
      await signUp(email, password, name);
      navigate("/dashboard");
    } catch (err) {
      if (authErrorCode(err) === "auth/email-already-in-use") {
        setEmailInUse(true);
      } else {
        setError(err instanceof Error ? err.message : "Couldn't create your account.");
      }
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
        {emailInUse ? (
          <div style={authErrorStyle}>
            An account already exists for this email.{" "}
            <span
              onClick={() => navigate("/login", { state: { email } })}
              style={{ fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
            >
              Sign in
            </span>{" "}
            instead, or{" "}
            <span
              onClick={() => navigate("/login", { state: { email, mode: "forgotPassword" } })}
              style={{ fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
            >
              reset your password
            </span>{" "}
            if you don't remember it.
          </div>
        ) : (
          error && <div style={authErrorStyle}>{error}</div>
        )}
        <button style={authButtonStyle} disabled={busy} type="submit">{busy ? "Creating account…" : "CREATE ACCOUNT"}</button>
      </form>
      <div style={{ marginTop: 16, fontSize: 13.5, color: theme.color.textMuted, textAlign: "center" }}>
        Already have an account? <Link to="/login" style={{ color: theme.color.blue, fontWeight: 600 }}>Sign in</Link>
      </div>
    </AuthCard>
  );
}
