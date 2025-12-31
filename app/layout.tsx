import './globals.css';

export const metadata = {
  title: 'Draw & Guess',
  description: '你画我猜 - 实时绘画与 AI 猜测',
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
