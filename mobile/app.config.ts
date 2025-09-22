import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Topzcasino",
  slug: "topzcasino-mobile",
  scheme: "topzcasino",
  ios: {
    supportsTablet: false,
    infoPlist: {
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } // 開發期允許 http
    }
  },
  android: {
    adaptiveIcon: { backgroundColor: "#000000" },
    softwareKeyboardLayoutMode: "pan",
    usesCleartextTraffic: true // 開發期允許 http
  },
  plugins: ["expo-secure-store"],
  extra: {
    API_BASE: process.env.API_BASE ?? "http://192.168.0.10:3000",
    WEB_ORIGIN: process.env.WEB_ORIGIN ?? "http://192.168.0.10:3000"
  }
});
