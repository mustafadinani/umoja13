import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { Login } from "../screens/Login";
import { Signup } from "../screens/Signup";
import { HomeScreen } from "../screens/HomeScreen";
import { GamesScreen } from "../screens/GamesScreen";
import { MomentsScreen } from "../screens/MomentsScreen";
import { MyUmojaScreen } from "../screens/MyUmojaScreen";
import { GameScreen } from "../screens/GameScreen";
import { TeamScreen } from "../screens/TeamScreen";
import { CheckInScreen } from "../screens/CheckInScreen";
import { HuntScreen } from "../screens/HuntScreen";
import { RefereeScreen } from "../screens/RefereeScreen";
import { RefereeGameScreen } from "../screens/RefereeGameScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { ComplaintScreen } from "../screens/ComplaintScreen";
import { MessageOrganizersScreen } from "../screens/MessageOrganizersScreen";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Tabs: undefined;
  Game: { gameId: string };
  Team: { teamId: string };
  CheckIn: { teamId: string; categoryId: string };
  RefereeGame: { gameId: string };
  Notifications: undefined;
  Complaint: undefined;
  MessageOrganizers: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ fontSize: 11, fontWeight: "700", color: focused ? theme.color.purple : theme.color.textMuted }}>{label}</Text>;
}

function TabNavigator() {
  const { profile } = useAuth();
  const isReferee = profile?.roles?.includes("referee") ?? false;

  return (
    // Keying on the signed-in uid forces a full remount when the account
    // changes (e.g. signing out of one demo account into another without
    // restarting the app) — otherwise React Navigation's bottom-tabs can
    // keep a stale screen list from the previous session around, so a
    // role-conditional tab like Referee can end up visible to everyone.
    <Tabs.Navigator
      key={profile?.uid ?? "anon"}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.purple,
      }}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label="🏠" focused={focused} /> }} />
      <Tabs.Screen name="Games" component={GamesScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label="⚽" focused={focused} /> }} />
      {isReferee ? (
        <Tabs.Screen name="Referee" component={RefereeScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label="🏁" focused={focused} /> }} />
      ) : (
        <Tabs.Screen name="Hunt" component={HuntScreen} options={{ title: "The Hunt", tabBarIcon: ({ focused }) => <TabIcon label="🧭" focused={focused} /> }} />
      )}
      <Tabs.Screen name="Moments" component={MomentsScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label="🎬" focused={focused} /> }} />
      <Tabs.Screen name="MyUmoja" component={MyUmojaScreen} options={{ title: "My Umoja", tabBarIcon: ({ focused }) => <TabIcon label="👤" focused={focused} /> }} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Signup" component={Signup} />
          </>
        ) : (
          <>
            <Stack.Screen name="Tabs" component={TabNavigator} />
            <Stack.Screen name="Game" component={GameScreen} options={{ headerShown: true, title: "" }} />
            <Stack.Screen name="Team" component={TeamScreen} options={{ headerShown: true, title: "" }} />
            <Stack.Screen name="CheckIn" component={CheckInScreen} options={{ headerShown: true, title: "Check In" }} />
            <Stack.Screen name="RefereeGame" component={RefereeGameScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, title: "Notifications" }} />
            <Stack.Screen name="Complaint" component={ComplaintScreen} options={{ headerShown: true, title: "Report an Issue" }} />
            <Stack.Screen name="MessageOrganizers" component={MessageOrganizersScreen} options={{ headerShown: true, title: "Message Organizers" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
