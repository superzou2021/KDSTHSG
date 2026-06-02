"use client";

type EliminationModalProps = {
  open: boolean;
  type: "correct" | "eliminated";
  onNext?: () => void;
  onBack?: () => void;
};

export default function EliminationModal({ open, type, onNext, onBack }: EliminationModalProps) {
  if (!open) return null;

  return (
    <div className="modalMask">
      <section className="resultModal">
        {type === "correct" ? (
          <>
            <span className="eyebrow">恭喜答对！</span>
            <div style={{ fontSize: '64px', margin: '16px 0' }}>🎉</div>
            <h2 style={{ fontSize: '28px', marginBottom: '24px' }}>太棒了！</h2>
            <button className="primaryButton" type="button" onClick={onNext} style={{ marginTop: '16px' }}>
              下一题
            </button>
          </>
        ) : (
          <>
            <span className="eyebrow">游戏结束</span>
            <div style={{ fontSize: '64px', margin: '16px 0' }}>💔</div>
            <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>很遗憾被淘汰！</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>你已经尽力了！</p>
            <button className="primaryButton" type="button" onClick={onBack} style={{ marginTop: '16px' }}>
              返回活动大厅
            </button>
          </>
        )}
      </section>
    </div>
  );
}
