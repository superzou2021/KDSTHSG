"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import GameCard from "@/components/GameCard";
import Layout from "@/components/Layout";
import PageBackground from "@/components/PageBackground";
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
    return (
      <Layout title="活动大厅" hideHeader>
        <section className="lobbyPage">
          <PageBackground />
          <div className="lobbyPageContent">
            <p className="lobbyLoading">正在读取身份...</p>
          </div>
        </section>
      </Layout>
    );
  }

  const completedCount = player.completedGames.length;
  const lastResult = snapshot.results
    .slice()
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
  const roundScore = lastResult?.score || 0;
  const quizProgress = snapshot.quizProgress;

  return (
    <Layout title="活动大厅" hideHeader>
      <section className="lobbyPage">
        <PageBackground />

        <div className="lobbyProgressPill">{completedCount}/4</div>

        <div className="lobbyPageContent">
          <header className="lobbyHeader">
            <h1>活动大厅</h1>
          </header>

          <section className="lobbyProfile">
            <span className="lobbyProfileLabel">PLAYER</span>
            <div className="lobbyProfileRow">
              <h2>{player.name}</h2>
            </div>
            <span className="lobbyOfficeBadge">{player.office}</span>
          </section>

          <ScorePanel roundScore={roundScore} totalScore={player.totalScore} rank={snapshot.rank} />

          <section className="lobbyGameList">
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
                    ? "未开始"
                    : hasAvailableGroup
                      ? "继续答题"
                      : "等待开启";

                return (
                  <GameCard
                    game={{ ...game, name: "Sector Quiz" }}
                    completed={quizCompleted}
                    key={game.key}
                    subtitle={`进度 ${quizProgress.completedCount}/${quizProgress.totalCount}`}
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
        </div>
      </section>
    </Layout>
  );
}
