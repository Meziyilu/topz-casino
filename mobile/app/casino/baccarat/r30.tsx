import { View } from "react-native";
import { WEB_ORIGIN } from "~//src/config";
import { WebView } from "react-native-webview";

export default function BaccaratR30() {
  // 你現有的房間頁路徑，如果需要 embed 可加 ?embed=1（若你的頁面支持）
  const url = `${WEB_ORIGIN}/casino/baccarat/R30?embed=1`;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <WebView
        source={{ uri: url }}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
      />
    </View>
  );
}
