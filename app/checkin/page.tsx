// app/checkin/page.tsx
import dynamic from "next/dynamic";

export const dynamicParams = true;
export const revalidate = 0;

const CheckinCard = dynamic(() => import("@/components/lobby/CheckinCard"), { ssr: false });

export default function Page() {
  return (
    <div style={{ padding: "20px" }}>
      <CheckinCard />
    </div>
  );
}
