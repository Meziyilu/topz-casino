export const API_BASE = process.env.API_BASE ?? "http://192.168.0.10:3000";
export const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://192.168.0.10:3000";

/** 如你的後端路由不同，這裡統一改 */
export const ROUTES = {
  login: "/api/auth/login",
  me: "/api/profile/me"
};
