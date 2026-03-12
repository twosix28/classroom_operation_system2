import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "강의실 예약 관리 시스템 | 항공우주 산학융합원",
  description: "항공우주 산학융합원 강의실 예약 및 실시간 현황 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
