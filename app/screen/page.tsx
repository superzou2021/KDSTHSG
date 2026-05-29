"use client";

import OfficeAverageTable from "@/components/OfficeAverageTable";
import OfficeTop3Panel from "@/components/OfficeTop3Panel";
import RankingTable from "@/components/RankingTable";
import { useRanking } from "@/hooks/use-game-data";

export default function ScreenPage() {
  const { ranking } = useRanking(null, 3000);

  return (
    <main className="screenPage">
      <header className="screenHeader">
        <div>
          <span className="eyebrow">LIVE SCREEN / REFRESH 3S</span>
          <h1>活动实时数据大屏</h1>
        </div>
        <strong>{ranking.players.length} 人参与</strong>
      </header>
      <section className="screenGrid">
        <div className="screenPanel top10Panel">
          <h2>总排行榜 TOP10</h2>
          <RankingTable data={ranking.top10} />
        </div>
        <div className="screenPanel">
          <h2>地区平均分</h2>
          <OfficeAverageTable data={ranking.officeAverage} />
        </div>
        <div className="screenPanel">
          <h2>各地区前三名</h2>
          <OfficeTop3Panel data={ranking.officeTop3} />
        </div>
      </section>
    </main>
  );
}
