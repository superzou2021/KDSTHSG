"use client";

type WaitingModalProps = {
  open: boolean;
  gameName: string;
};

export default function WaitingModal({ open, gameName }: WaitingModalProps) {
  if (!open) return null;

  return (
    <div className="modalMask">
      <section className="resultModal">
        <span className="eyebrow">BINGO SUBMITTED</span>
        <h2>{gameName}</h2>
        <div style={{ fontSize: '48px', margin: '16px 0' }}>⏳</div>
        <p>等待Boss发言，判分即将开始...</p>
      </section>
    </div>
  );
}
