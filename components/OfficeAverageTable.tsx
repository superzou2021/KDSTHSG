import type { OfficeAverageItem } from "@/types";

type OfficeAverageTableProps = {
  data: OfficeAverageItem[];
};

export default function OfficeAverageTable({ data }: OfficeAverageTableProps) {
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
