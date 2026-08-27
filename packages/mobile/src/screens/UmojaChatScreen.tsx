import { useCallback } from "react";
import { View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { markChannelRead } from "../lib/callables";
import { UserChannelPanel } from "../components/UserChannelPanel";

/** Merged Ask Umoja + Message Organizers screen — see UserChannelPanel for the actual thread. */
export function UmojaChatScreen() {
  const { user } = useAuth();

  useFocusEffect(
    useCallback(() => {
      if (user?.uid) markChannelRead({ kind: "user", id: user.uid }).catch(() => {});
    }, [user?.uid])
  );

  if (!user) return <View style={{ flex: 1, backgroundColor: theme.color.bg }} />;
  return <UserChannelPanel uid={user.uid} />;
}
