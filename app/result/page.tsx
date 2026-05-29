"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import OfficeAverageTable from "@/components/OfficeAverageTable";
import OfficeTop3Panel from "@/components/OfficeTop3Panel";
import RankingTable from "@/components/RankingTable";
import ScorePanel from "@/components/ScorePanel";
import { GAME_ORDER } from "@/lib/constants";
import { useCurrentPlayer, useRanking } from "@/hooks/use-game-data";

export default function ResultPage() {
  const router = useRouter();
  const { player, playerId } = useCurrentPlayer();
  const { ranking } = useRanking(playerId);

  useEffect(() => {
    if (playerId === null) router.push("/register");
  }, [playerId, router]);

  if (!player) return <Layout title="最终成绩">正在读取成绩...</Layout>;

  const context = ranking.context;
  const missingGames = GAME_ORDER.filter((key) => !player.completedGames.includes(key));

  return (
    <Layout title="最终成绩" eyebrow="RESULT" rightSlot={<Link href="/ranking">排行</Link>}>
      <section className="profileCard resultHero">
        <div>
          <span className="eyebrow">TOTAL SCORE</span>
          <h2>{player.totalScore}</h2>
          <p>{player.name} / {player.office} / {player.team}</p>
        </div>
        <strong>#{context?.rank || "-"}</strong>
      </section>
      <ScorePanel roundScore={0} totalScore={player.totalScore} rank={context?.rank || 0} />
      {missingGames.length > 0 && (
        <section className="statusBanner">
          还有 {missingGames.length} 个游戏未完成，建议回大厅继续完成后再展示最终成绩。
        </section>
      )}
      {context?.distanceToTop10 !== null && context?.distanceToTop10 !== undefined && (
        <section className="statusPanel">
          <b>距离 TOP10 还差 {context.distanceToTop10} 分</b>
          <span>当前上一名：{context.previousPlayer?.name || "-"}，差距 {context.distanceToPrevious || 0} 分。</span>
        </section>
      )}
      <section className="sectionBlock">
        <h2>总排行榜 TOP10</h2>
        <RankingTable data={ranking.top10} currentPlayerId={player.id} />
      </section>
      <section className="sectionBlock">
        <h2>地区平均分</h2>
        <OfficeAverageTable data={ranking.officeAverage} />
      </section>
      <section className="sectionBlock">
        <h2>各地区 TOP3</h2>
        <OfficeTop3Panel data={ranking.officeTop3} />
      </section>
      <div className="pageActions">
        <Link className="primaryButton" href="/lobby">返回大厅</Link>
        <Link className="secondaryButton" href="/screen">打开大屏</Link>
      </div>
    </Layout>
  );
}
