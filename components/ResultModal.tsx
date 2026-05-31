"use client";

type ResultModalProps = {
  open: boolean;
  gameName: string;
  roundScore: number;
  totalScore: number;
  rank: number;
  onBackLobby: () => void;
  buttonText?: string;
};

export default function ResultModal({ open, gameName, roundScore, totalScore, rank, onBackLobby, buttonText }: ResultModalProps) {
  if (!open) return null;

  return (
    <div className="modalMask">
      <section className="resultModal">
        <span className="eyebrow">GAME COMPLETED</span>
        <h2>{gameName}</h2>
        <div className="modalScore">{roundScore}</div>
        <p>累计积分 {totalScore}，当前排名 #{rank || "-"}</p>
        <div className="modalActions single">
          <button className="primaryButton" type="button" onClick={onBackLobby}>
            {buttonText || "回到大厅"}
          </button>
        </div>
      </section>
    </div>
  );
}
