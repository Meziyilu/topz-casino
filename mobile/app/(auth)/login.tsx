import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { login } from "~/src/api";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit() {
    try {
      await login(email.trim(), password);
      router.replace("/(lobby)");
    } catch (e: any) {
      Alert.alert("Login failed", e?.message ?? "Unknown error");
    }
  }

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: "#0b0f1a", gap: 16, justifyContent: "center" }}>
      <Text style={{ color: "#dfe6ff", fontSize: 24, fontWeight: "600" }}>Topzcasino</Text>
      <TextInput
        placeholder="Email"
        placeholderTextColor="#8ea0bf"
        style={{ color: "#dfe6ff", borderWidth: 1, borderColor: "#263048", padding: 12, borderRadius: 8 }}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor="#8ea0bf"
        style={{ color: "#dfe6ff", borderWidth: 1, borderColor: "#263048", padding: 12, borderRadius: 8 }}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable onPress={onSubmit} style={{ backgroundColor: "#5ac8fa", padding: 14, borderRadius: 10, alignItems: "center" }}>
        <Text style={{ color: "#001826", fontWeight: "700" }}>Login</Text>
      </Pressable>
    </View>
  );
}
