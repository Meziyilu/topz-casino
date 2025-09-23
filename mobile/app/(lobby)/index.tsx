import { useEffect, useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { me } from "../../src/api";

type Me = { displayName: string; balance: number; bankBalance: number; vipTier: number };

export default function LobbyScreen() {
  const [profile, setProfile] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await me();
        setProfile(data);
      } catch {
        Alert.alert("未登入", "請先登入");
        router.replace("/(auth)/login");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#0b0f1a", padding: 20, gap: 12 }}>
      <Text style={{ color: "#dfe6ff", fontSize: 20, marginBottom: 8 }}>🏠 Lobby</Text>
      {loading ? (
        <Text style={{ color: "#8ea0bf" }}>Loading…</Text>
      ) : profile ? (
        <View style={{ borderWidth: 1, borderColor: "#233047", borderRadius: 12, padding: 14 }}>
          <Text style={{ color: "#dfe6ff", fontWeight: "600" }}>{profile.displayName}</Text>
          <Text style={{ color: "#8ea0bf", marginTop: 4 }}>錢包：{profile.balance}</Text>
          <Text style={{ color: "#8ea0bf" }}>銀行：{profile.bankBalance}</Text>
          <Text style={{ color: "#8ea0bf" }}>VIP：{profile.vipTier}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={() => router.push("/casino/baccarat/r30")}
        style={{ backgroundColor: "#8b5cf6", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 12 }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>進入 百家樂 R30</Text>
      </Pressable>
    </View>
  );
}
