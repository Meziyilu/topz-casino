import { View } from "react-native";
import { WebView } from "react-native-webview";
import { WEB_ORIGIN } from "../../../src/config";

export default function BaccaratR30() {
  const url = `${WEB_ORIGIN}/casino/baccarat/R30?embed=1`;
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <WebView
        source={{ uri: url }}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        originWhitelist={["*"]}
        startInLoadingState
      />
    </View>
  );
}
