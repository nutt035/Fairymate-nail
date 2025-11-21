import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

// ตั้งค่าฟอนต์ Prompt (รองรับภาษาไทย)
const prompt = Prompt({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'thai'],
  display: 'swap',
  variable: '--font-prompt',
});

export const metadata: Metadata = {
  title: "Fairymate nail",
  description: "ระบบจัดการร้านทำเล็บครบวงจร",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${prompt.className} antialiased bg-[#F1F5F9]`}>
        {children}
      </body>
    </html>
  );
}