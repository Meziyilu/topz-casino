// ⚠️ 這是 Server Component（預設），專門給骰寶段落載入自己的全域樣式
import "../../../styles/sicbo.css"; // 只在 /casino/sicbo 底下生效

export default function SicboSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
