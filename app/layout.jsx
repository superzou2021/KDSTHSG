import "./globals.css";

export const metadata = {
  title: "HSG H5",
  description: "Interactive HSG game flow built with Next.js and React"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
