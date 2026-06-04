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
        // 尝试从本地恢复
        const restored = await restoreCurrentPlayerFromLocal();
        if (!restored) {
          router.push("/register");
        }
      }
    }
    check();
  }, [playerId, router]);

  if (!player || !snapshot) return <Layout title="加载中">正在读取身份...</Layout>;

  const completedCount = player.completedGames.length;
  
  // 获取最后完成的游戏的分数
  const lastResult = snapshot.results
    .slice()
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
  const roundScore = lastResult?.score || 0;

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
            ? snapshot.results.find((r) => r.gameKey === "bingo")
            : undefined;
          const bingoPending = Boolean(userBingoResult?.pendingBingoScore);
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