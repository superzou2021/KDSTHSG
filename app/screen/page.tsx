"use client";

import OfficeAverageTable from "@/components/OfficeAverageTable";
import OfficeTop3Panel from "@/components/OfficeTop3Panel";
import RankingTable from "@/components/RankingTable";
import { useRanking } from "@/hooks/use-game-data";

export default function ScreenPage() {
  const { ranking, loading } = useRanking(null, 3000);

  if (loading || !ranking) {
    return (
      <main className="screenPage loading">
        <div className="loadingSpinner">
          <div className="spinner"></div>
          <p>加载中...</p>
        </div>
      </main>
    );
  }

  const { players, top10, officeAverage, officeTop3 } = ranking;

  return (
    <main className="screenPage">
      <header className="screenHeader">
        <div>
          <span className="eyebrow">LIVE SCREEN / REFRESH 3S</span>
          <h1>活动实时数据大屏</h1>
        </div>
        <strong>{players.length || 0} 人参与</strong>
      </header>
      <section className="screenGrid">
        <div className="screenPanel top10Panel">
          <h2>总排行榜 TOP10</h2>
          <RankingTable data={top10 || []} />
        </div>
        <div className="screenPanel">
          <h2>地区平均分</h2>
          <OfficeAverageTable data={officeAverage || []} />
        </div>
        <div className="screenPanel">
          <h2>各地区前三名</h2>
          <OfficeTop3Panel data={officeTop3 || []} />
        </div>
      </section>
    </main>
  );
}
