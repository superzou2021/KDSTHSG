import type { RankingItem } from "@/types";

type RankingTableProps = {
  data: RankingItem[];
  currentPlayerId?: string;
};

export default function RankingTable({ data, currentPlayerId }: RankingTableProps) {
  return (
    <div className="tablePanel">
      {data.map((item) => (
        <div className={`tableRow ${item.playerId === currentPlayerId ? "current" : ""}`} key={item.playerId}>
          <span>#{item.rank}</span>
          <b>{item.name}</b>
          <small>{item.office} / {item.team}</small>
          <strong>{item.totalScore}</strong>
        </div>
      ))}
    </div>
  );
}
