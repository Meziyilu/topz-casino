import Constants from "expo-constants";
const extra = (Constants.expoConfig?.extra ?? {}) as any;

export const API_BASE = (extra.API_BASE as string) ?? "";
export const WEB_ORIGIN = (extra.WEB_ORIGIN as string) ?? "";

export const ROUTES = {
  login: "/api/auth/login",
  me: "/api/profile/me"
};
