import Link from "next/link";
import type { ReactNode } from "react";

type LayoutProps = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
  hideLeftButton?: boolean;
  hideHeader?: boolean;
};

export default function Layout({ title, eyebrow = "ANNUAL GAME", children, rightSlot, hideLeftButton = false, hideHeader = false }: LayoutProps) {
  return (
    <main className="mobilePage">
      {!hideHeader && (
        <header className="topNav" style={{ alignItems: 'center', paddingBottom: '16px' }}>
          {!hideLeftButton ? (
            <Link href="/lobby" className="brandLink" style={{ textDecoration: 'none' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </Link>
          ) : (
            <div style={{ width: '20px' }}></div>
          )}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 'bold' }}>{title}</h1>
          </div>
          <div className="topNavRight">
            {rightSlot || (
              <Link href="/ranking" style={{ display: 'flex', alignItems: 'center', color: 'var(--ink)', textDecoration: 'none', gap: '4px', fontWeight: 'bold' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2">
                  <path d="M6 9H4c-.5 0-1 .4-1 1v10c0 .6.5 1 1 1h16c.6 0 1-.4 1-1V10c0-.6-.4-1-1-1h-2" />
                  <path d="M9 9V7c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v2" />
                  <path d="M12 11v10" />
                </svg>
                排行榜
              </Link>
            )}
          </div>
        </header>
      )}
      {children}
    </main>
  );
}
