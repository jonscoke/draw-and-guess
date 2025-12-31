import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Draw and Guess',
  description: 'A fresh Next.js 20 + TypeScript setup.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
