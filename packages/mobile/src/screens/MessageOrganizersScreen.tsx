import { ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { UserChannelPanel } from "../components/UserChannelPanel";

export function MessageOrganizersScreen() {
  const { user } = useAuth();
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }} contentContainerStyle={{ padding: 16 }}>
        <UserChannelPanel uid={user?.uid ?? ""} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
