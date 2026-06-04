"use client";

import Link from "next/link";
import Layout from "@/components/Layout";
import OfficeAverageTable from "@/components/OfficeAverageTable";
import OfficeTop3Panel from "@/components/OfficeTop3Panel";
import RankingTable from "@/components/RankingTable";
import { useCurrentPlayer, useRanking } from "@/hooks/use-game-data";

export default function RankingPage() {
  const { playerId } = useCurrentPlayer();
  const { ranking } = useRanking(playerId, 3000);

  const isInTop10 = ranking.context?.distanceToTop10 === null;

  return (
    <Layout title="排行榜" eyebrow="RANKING" rightSlot={<Link href="/lobby">大厅</Link>}>
      {ranking.context?.player && (
        <section className="profileCard resultHero" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <span className="eyebrow">我的排名</span>
              <h2 style={{ fontSize: '72px', margin: '8px 0' }}>{ranking.context.player.name}</h2>
            </div>
            <strong style={{ fontSize: '72px' }}>#{ranking.context.rank}</strong>
          </div>
          <p style={{ fontSize: '16px', margin: 0 }}>
            {isInTop10 ? "恭喜你进入 TOP10！" : `距离 TOP10 还差 ${ranking.context.distanceToTop10} 分。`}
          </p>
        </section>
      )}
      <section className="sectionBlock">
        <h2>总排行榜 TOP10</h2>
        <RankingTable data={ranking.top10} currentPlayerId={playerId || undefined} />
      </section>
      <section className="sectionBlock">
        <h2>地区平均分排名</h2>
        <OfficeAverageTable data={ranking.officeAverage} />
      </section>
      <section className="sectionBlock">
        <h2>各地区 TOP3</h2>
        <OfficeTop3Panel data={ranking.officeTop3} />
      </section>
    </Layout>
  );
}
