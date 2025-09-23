// Server Component（預設）— 僅負責載入 Client View
export const dynamic = "force-dynamic";

import AdminAnnouncementsView from "./view";

export default function Page() {
  return <AdminAnnouncementsView />;
}
