import { useState } from "react";
import { View, Text, TextInput, Image, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { PrimaryButton } from "../components/ui";

export function Signup({ navigation }: NativeStackScreenProps<RootStackParamList, "Signup">) {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await signUp(email, password, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create your account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Image source={require("../../assets/logo-icon.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Join Umoja Games</Text>
      <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <View style={styles.passwordWrap}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <Pressable
          onPress={() => setShowPassword((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? "Hide password" : "Show password"}
          style={styles.eyeButton}
        >
          <Text style={styles.eyeText}>{showPassword ? "Hide" : "Show"}</Text>
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton onPress={submit} disabled={busy} style={{ width: "100%", marginTop: 8 }}>
        {busy ? "Creating account…" : "CREATE ACCOUNT"}
      </PrimaryButton>
      <Text style={styles.link} onPress={() => navigation.navigate("Login")}>Already have an account? Sign in</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.color.bg, justifyContent: "center", padding: 28 },
  logo: { width: 72, height: 72, alignSelf: "center", marginBottom: 8 },
  title: { fontWeight: "800", fontSize: 22, color: theme.color.text, textAlign: "center", marginBottom: 24 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.sm, padding: 14, marginBottom: 12, fontSize: 15 },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    marginBottom: 12,
  },
  passwordInput: { flex: 1, padding: 14, fontSize: 15 },
  eyeButton: { paddingHorizontal: 14, paddingVertical: 14 },
  eyeText: { color: theme.color.blue, fontWeight: "600", fontSize: 13 },
  error: { color: theme.color.danger, fontSize: 13, marginBottom: 8 },
  link: { textAlign: "center", marginTop: 18, color: theme.color.blue, fontWeight: "600" },
});
