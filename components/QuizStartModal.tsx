"use client";

type QuizStartModalProps = {
  open: boolean;
  onStart: () => void;
};

export default function QuizStartModal({ open, onStart }: QuizStartModalProps) {
  if (!open) return null;

  return (
    <div className="modalMask">
      <section className="resultModal">
        <span className="eyebrow">游戏准备</span>
        <div style={{ fontSize: '64px', margin: '16px 0' }}>⚡</div>
        <h2 style={{ fontSize: '28px', marginBottom: '16px' }}>Sector Quiz</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '8px' }}>共5个板块，每板块2题</p>
        <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>每板块限时1分钟</p>
        <button className="primaryButton" type="button" onClick={onStart}>
          开始答题
        </button>
      </section>
    </div>
  );
}
