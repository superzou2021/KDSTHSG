import Link from "next/link";
import type { Game } from "@/types";

type GameCardProps = {
  game: Game;
  completed: boolean;
  /** 用户当前是否处于 Bingo 等待 Boss 判分状态（仅对 bingo 有效） */
  bingoPending?: boolean;
};

export default function GameCard({ game, completed, bingoPending = false }: GameCardProps) {
  const href = `/game/${game.key}`;

  // 计算状态与可否进入
  let status: string;
  let canEnter: boolean;

  if (game.key === "bingo") {
    const phase = game.bingoPhase || "open";
    if (completed) {
      status = "已完成";
      canEnter = false;
    } else if (bingoPending) {
      status = "等待 Boss 发言";
      canEnter = true; // 允许进入查看等待状态
    } else if (phase === "open" && game.isOpen) {
      status = "未完成";
      canEnter = true;
    } else if (phase === "auto_score") {
      // 自动判分阶段：无论新老用户，只要没完成都可进入
      status = "未完成";
      canEnter = true;
    } else if (phase === "closed") {
      status = "已结束";
      canEnter = false;
    } else {
      // open 但未开放
      status = "未开放";
      canEnter = false;
    }
  } else {
    if (completed) {
      status = "已完成";
      canEnter = false;
    } else if (game.isOpen) {
      status = "未开始";
      canEnter = true;
    } else {
      status = "未开放";
      canEnter = false;
    }
  }

  const content = (
    <>
      <span className="gameOrder">0{game.order}</span>
      <div>
        <h3>{game.name}</h3>
        <p>满分 {game.maxScore} 分</p>
      </div>
      <strong>{status}</strong>
    </>
  );

  if (!canEnter) {
    return (
      <article className={`demoCard gameEntry ${completed ? "done" : ""} locked`} aria-disabled="true">
        {content}
      </article>
    );
  }

  return (
    <Link href={href} className={`demoCard gameEntry ${completed ? "done" : ""}`}>
      {content}
    </Link>
  );
}
