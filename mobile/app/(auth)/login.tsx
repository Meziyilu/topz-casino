import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TopzCasino Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable style={styles.button} onPress={() => router.push("/lobby")}>
        <Text style={styles.buttonText}>Login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#0b0f1a" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, color: "#fff", textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#263048", padding: 10, borderRadius: 6, marginBottom: 10, backgroundColor: "#fff" },
  button: { backgroundColor: "#5ac8fa", padding: 15, borderRadius: 6 },
  buttonText: { color: "#001826", fontWeight: "bold", textAlign: "center" }
});
