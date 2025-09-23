import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function Lobby() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎰 TopzCasino Lobby</Text>
      <Pressable style={styles.button} onPress={() => router.push("/baccarat/r30")}>
        <Text style={styles.buttonText}>Go to Baccarat R30</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0b0f1a" },
  title: { fontSize: 26, color: "#fff", marginBottom: 20 },
  button: { backgroundColor: "#8b5cf6", padding: 15, borderRadius: 6 },
  buttonText: { color: "#fff", fontWeight: "bold" }
});
