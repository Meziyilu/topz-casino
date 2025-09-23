import { View, Text, StyleSheet } from "react-native";

export default function BaccaratR30() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🃏 Baccarat Room R30</Text>
      <Text style={styles.text}>This is a placeholder page for Baccarat R30</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0b0f1a" },
  title: { fontSize: 24, color: "#5ac8fa", marginBottom: 10 },
  text: { color: "#fff" }
});
