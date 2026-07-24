import { useState } from "react";
import { View, Text, TextInput, Image, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { PrimaryButton } from "../components/ui";

export function Login({ navigation }: NativeStackScreenProps<RootStackParamList, "Login">) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Image source={require("../../assets/logo-icon.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>UMOJA GAMES</Text>
      <Text style={styles.subtitle}>Sign in</Text>
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton onPress={submit} disabled={busy} style={{ width: "100%", marginTop: 8 }}>
        {busy ? "Signing in…" : "SIGN IN"}
      </PrimaryButton>
      <Text style={styles.link} onPress={() => navigation.navigate("Signup")}>New here? Create an account</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.color.bg, justifyContent: "center", padding: 28 },
  logo: { width: 84, height: 84, alignSelf: "center", marginBottom: 8 },
  title: { fontWeight: "800", fontSize: 26, color: theme.color.purple, textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 15, color: theme.color.textMuted, textAlign: "center", marginBottom: 24 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.sm, padding: 14, marginBottom: 12, fontSize: 15 },
  error: { color: theme.color.danger, fontSize: 13, marginBottom: 8 },
  link: { textAlign: "center", marginTop: 18, color: theme.color.blue, fontWeight: "600" },
});
