"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import GameCard from "@/components/GameCard";
import Layout from "@/components/Layout";
import ScorePanel from "@/components/ScorePanel";
import { restoreCurrentPlayerFromLocal } from "@/lib/storage";
import { useCurrentPlayer, useLobbySnapshot } from "@/hooks/use-game-data";

export default function LobbyPage() {
  const router = useRouter();
  const { player, playerId } = useCurrentPlayer();
  const { snapshot } = useLobbySnapshot(playerId);

  useEffect(() => {
    async function check() {
      if (playerId === null) {
        const restored = await restoreCurrentPlayerFromLocal();
        if (!restored) {
          router.push("/register");
        }
      }
    }
    check();
  }, [playerId, router]);

  if (!player || !snapshot) {
    return <Layout title="加载中">正在读取身份...</Layout>;
  }

  const completedCount = player.completedGames.length;
  const lastResult = snapshot.results
    .slice()
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
  const roundScore = lastResult?.score || 0;
  const quizProgress = snapshot.quizProgress;

  return (
    <Layout title="活动大厅" eyebrow="LOBBY" rightSlot={<Link href="/ranking">排行</Link>}>
      <section className="profileCard">
        <div>
          <span className="eyebrow">PLAYER</span>
          <h2>{player.name}</h2>
          <p>{player.office} / {player.team}</p>
        </div>
        <strong>{completedCount}/4</strong>
      </section>

      <ScorePanel roundScore={roundScore} totalScore={player.totalScore} rank={snapshot.rank} />
      <div className="progressLine"><span style={{ width: `${(completedCount / 4) * 100}%` }} /></div>

      <section className="gameList">
        {snapshot.state.games.sort((a, b) => a.order - b.order).map((game) => {
          const isBingo = game.key === "bingo";
          const userBingoResult = isBingo
            ? snapshot.results.find((result) => result.gameKey === "bingo")
            : undefined;
          const bingoPending = Boolean(userBingoResult?.pendingBingoScore);

          if (game.key === "quiz") {
            const quizCompleted = quizProgress.completedCount >= quizProgress.totalCount;
            const hasAvailableGroup = quizProgress.availableGroups.length > 0;
            const quizStatus = quizCompleted
              ? "已完成"
              : !game.isOpen
                ? "未开放"
                : hasAvailableGroup
                  ? "继续答题"
                  : "等待开启";

            return (
              <GameCard
                game={{ ...game, name: "Sector Quiz" }}
                completed={quizCompleted}
                key={game.key}
                subtitle={`进度：${quizProgress.completedCount}/${quizProgress.totalCount}`}
                statusOverride={quizStatus}
                allowEnterOverride={game.isOpen && !quizCompleted}
              />
            );
          }

          return (
            <GameCard
              game={game}
              completed={player.completedGames.includes(game.key)}
              bingoPending={bingoPending}
              key={game.key}
            />
          );
        })}
      </section>
    </Layout>
  );
}
