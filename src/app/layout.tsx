import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "./providers";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "SubTracker - 软件订阅管理",
  description: "管理你的软件订阅，跟踪续费日期，支持多币种汇率转换",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className={cn("font-sans", geist.variable)}>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
