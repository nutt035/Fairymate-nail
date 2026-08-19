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
      <head>
        {/* ⭐ สำคัญมาก: แก้ปัญหาหน้าเว็บกว้างเกินจอมือถือทั้งหมด */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${prompt.className} ${prompt.variable} antialiased bg-[#F8F9FA] text-slate-800 min-h-screen w-full overflow-x-hidden`}>
        <div className="w-full max-w-full mx-auto">
          {children}
        </div>
      </body>
    </html>
  );
}