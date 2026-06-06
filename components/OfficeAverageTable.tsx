import type { OfficeAverageItem } from "@/types";

type OfficeAverageTableProps = {
  data: OfficeAverageItem[];
  variant?: "default" | "ranking";
};

export default function OfficeAverageTable({ data, variant = "default" }: OfficeAverageTableProps) {
  if (variant === "ranking") {
    return (
      <div className="rankingList">
        {data.map((item) => (
          <div className="rankingRow" key={item.office}>
            <span className="rankingRankCircle">{item.rank}</span>
            <div className="rankingRowInfo">
              <b>{item.office}</b>
              <small>{item.playerCount}人</small>
            </div>
            <strong>{item.averageScore}</strong>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="tablePanel compactTable">
      {data.map((item) => (
        <div className="tableRow" key={item.office}>
          <span>#{item.rank}</span>
          <b>{item.office}</b>
          <small>{item.playerCount} 人</small>
          <strong>{item.averageScore}</strong>
        </div>
      ))}
    </div>
  );
}
