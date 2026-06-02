"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import OfficeAverageTable from "@/components/OfficeAverageTable";
import OfficeTop3Panel from "@/components/OfficeTop3Panel";
import RankingTable from "@/components/RankingTable";
import { GAME_ORDER } from "@/lib/constants";
import { useCurrentPlayer, useLobbySnapshot, useRanking } from "@/hooks/use-game-data";

export default function ResultPage() {
  const router = useRouter();
  const { player, playerId, loading: playerLoading } = useCurrentPlayer();
  const { snapshot, loading: snapshotLoading } = useLobbySnapshot(playerId);
  const { ranking, loading: rankingLoading } = useRanking(playerId, 1500);

  useEffect(() => {
    if (playerId === null) router.replace("/register");
  }, [playerId, router]);

  const rankedPlayer = playerId ? ranking.players.find((item) => item.id === playerId) : null;
  const currentPlayer = snapshot?.player || player || rankedPlayer || null;
  const currentRank = ranking.context?.rank || (currentPlayer ? ranking.players.findIndex((item) => item.id === currentPlayer.id) + 1 : 0);
  const playerResults = snapshot?.results || (playerId ? ranking.results.filter((result) => result.player === playerId) : []);
  const lastResult = playerResults
    .slice()
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
  const roundScore = lastResult?.score || 0;
  const missingGames = currentPlayer ? GAME_ORDER.filter((key) => !currentPlayer.completedGames.includes(key)) : [];
  const isLoading = playerId === undefined || (playerLoading && snapshotLoading && rankingLoading);

  if (!currentPlayer) {
    return (
      <Layout title="最终成绩" eyebrow="RESULT">
        <section className="statusBanner">{isLoading ? "正在读取成绩..." : "未找到当前用户，请重新注册。"}</section>
        {!isLoading && (
          <div className="pageActions">
            <Link className="primaryButton" href="/register">返回注册</Link>
          </div>
        )}
      </Layout>
    );
  }

  return (
    <Layout title="最终成绩" eyebrow="RESULT" rightSlot={<Link href="/ranking">排行</Link>}>
      <section className="profileCard resultHero" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <span className="eyebrow">TOTAL SCORE</span>
            <h2 style={{ fontSize: '48px', margin: '8px 0' }}>{currentPlayer.totalScore}</h2>
          </div>
          <strong style={{ fontSize: '32px' }}>#{currentRank || "-"}</strong>
        </div>
        <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{currentPlayer.name} / {currentPlayer.office} / {currentPlayer.team}</p>
      </section>

      {missingGames.length > 0 && (
        <section className="statusBanner">
          还有 {missingGames.length} 个游戏未完成，当前展示的是已完成环节成绩。
        </section>
      )}

      {ranking.context?.distanceToTop10 !== null && ranking.context?.distanceToTop10 !== undefined && (
        <section className="statusPanel">
          <b>距离 TOP10 还差 {ranking.context.distanceToTop10} 分</b>
          <span>
            当前上一名：{ranking.context.previousPlayer?.name || "-"}，差距 {ranking.context.distanceToPrevious || 0} 分。
          </span>
        </section>
      )}

      <section className="sectionBlock">
        <h2>总排行榜 TOP10</h2>
        <RankingTable data={ranking.top10} currentPlayerId={currentPlayer.id} />
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
      </div>
    </Layout>
  );
}
