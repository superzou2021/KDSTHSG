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

  return (
    <Layout title="排行榜" eyebrow="RANKING" rightSlot={<Link href="/lobby">大厅</Link>}>
      <section className="sectionBlock">
        <h2>总排行榜 TOP10</h2>
        <RankingTable data={ranking.top10} currentPlayerId={playerId || undefined} />
      </section>
      {ranking.context?.player && (
        <section className="statusPanel">
          <b>我的排名：#{ranking.context.rank}</b>
          <span>{ranking.context.distanceToTop10 === null ? "你已经进入 TOP10。" : `距离 TOP10 还差 ${ranking.context.distanceToTop10} 分。`}</span>
        </section>
      )}
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
