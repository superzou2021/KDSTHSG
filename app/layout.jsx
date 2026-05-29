import "./globals.css";

export const metadata = {
  title: "Alpha Matrix H5",
  description: "Interactive Alpha Matrix game flow built with Next.js and React"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
