"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import GameCard from "@/components/GameCard";
import Layout from "@/components/Layout";
import ScorePanel from "@/components/ScorePanel";
import { GAME_ORDER } from "@/lib/constants";
import { useCurrentPlayer, useLobbySnapshot } from "@/hooks/use-game-data";

export default function LobbyPage() {
  const router = useRouter();
  const { player, playerId } = useCurrentPlayer();
  const { snapshot } = useLobbySnapshot(playerId);

  useEffect(() => {
    if (playerId === null) router.push("/register");
  }, [playerId, router]);

  if (!player || !snapshot) return <Layout title="加载中">正在读取身份...</Layout>;

  const completedCount = player.completedGames.length;
  const openGames = snapshot.state.games.filter((game) => game.isOpen);
  const nextGame = GAME_ORDER.find((key) => !player.completedGames.includes(key) && openGames.some((g) => g.key === key));

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
      <ScorePanel roundScore={0} totalScore={player.totalScore} rank={snapshot.rank} />
      <div className="progressLine"><span style={{ width: `${(completedCount / 4) * 100}%` }} /></div>
      <section className="gameList">
        {snapshot.state.games.sort((a, b) => a.order - b.order).map((game) => (
          <GameCard game={game} completed={player.completedGames.includes(game.key)} key={game.key} />
        ))}
      </section>
      <div className="pageActions">
        {nextGame ? <Link className="primaryButton" href={`/game/${nextGame}`}>继续下一关</Link> : completedCount === 4 ? <Link className="primaryButton" href="/result">查看最终成绩</Link> : <span className="secondaryButton disabled">等待管理员开放更多游戏</span>}
        <Link className="secondaryButton" href="/screen">查看大屏</Link>
      </div>
    </Layout>
  );
}
