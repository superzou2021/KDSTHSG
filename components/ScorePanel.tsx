type ScorePanelProps = {
  roundScore: number;
  totalScore: number;
  rank: number;
};

export default function ScorePanel({ roundScore, totalScore, rank }: ScorePanelProps) {
  return (
    <section className="lobbyScoreGrid">
      <div>
        <span>本关得分</span>
        <b>{roundScore}</b>
      </div>
      <div>
        <span>累计积分</span>
        <b>{totalScore}</b>
      </div>
      <div>
        <span>当前排名</span>
        <b>{rank || "-"}</b>
      </div>
    </section>
  );
}
