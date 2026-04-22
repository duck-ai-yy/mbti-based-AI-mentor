import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '按你的 MBTI 思维方式学任何东西',
  description:
    '同一个知识点，16 种 MBTI 有 16 种讲法。输入主题，AI 按你的认知习惯教你。',
  openGraph: {
    title: '按你的 MBTI 思维方式学任何东西',
    description: '16 型专属 AI 学习教练',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
