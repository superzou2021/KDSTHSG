import Link from "next/link";
import type { ReactNode } from "react";

type LayoutProps = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
};

export default function Layout({ title, eyebrow = "ANNUAL GAME", children, rightSlot }: LayoutProps) {
  return (
    <main className="mobilePage">
      <header className="topNav">
        <Link href="/lobby" className="brandLink">
          AM
        </Link>
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
        </div>
        <div className="topNavRight">{rightSlot}</div>
      </header>
      {children}
    </main>
  );
}
