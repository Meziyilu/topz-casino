import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: "#0b0f1a" }, headerTintColor: "#dfe6ff" }}>
        <Stack.Screen name="(auth)/login" options={{ title: "Login" }} />
        <Stack.Screen name="(lobby)/index" options={{ title: "Lobby" }} />
        <Stack.Screen name="casino/baccarat/r30" options={{ title: "Baccarat R30" }} />
      </Stack>
    </>
  );
}
