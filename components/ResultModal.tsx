"use client";

type ResultModalProps = {
  open: boolean;
  gameName: string;
  roundScore: number;
  totalScore: number;
  rank: number;
  onBackLobby: () => void;
  buttonText?: string;
  isEliminated?: boolean;
  onClose?: () => void;
};

export default function ResultModal({ open, gameName, roundScore, totalScore, rank, onBackLobby, buttonText, isEliminated = false, onClose }: ResultModalProps) {
  if (!open) return null;

  const handleClick = onClose || onBackLobby;

  return (
    <div className="modalMask">
      <section className="resultModal">
        {isEliminated ? (
          <>
            <span className="eyebrow">游戏结束</span>
            <div style={{ fontSize: '64px', margin: '16px 0' }}>💔</div>
            <h2>很遗憾被淘汰！</h2>
          </>
        ) : (
          <>
            <span className="eyebrow">GAME COMPLETED</span>
            <h2>{gameName}</h2>
          </>
        )}
        <div className="modalScore">{roundScore}</div>
        <p>累计积分 {totalScore}，当前排名 #{rank || "-"}</p>
        <div className="modalActions single">
          <button className="primaryButton" type="button" onClick={handleClick}>
            {buttonText || "回到大厅"}
          </button>
        </div>
      </section>
    </div>
  );
}
