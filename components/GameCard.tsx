import Link from "next/link";
import type { Game } from "@/types";

type GameCardProps = {
  game: Game;
  completed: boolean;
  bingoPending?: boolean;
  subtitle?: string;
  statusOverride?: string;
  allowEnterOverride?: boolean;
};

export default function GameCard({
  game,
  completed,
  bingoPending = false,
  subtitle,
  statusOverride,
  allowEnterOverride
}: GameCardProps) {
  const href = `/game/${game.key}`;

  let status: string;
  let canEnter: boolean;

  if (statusOverride) {
    status = statusOverride;
    canEnter = Boolean(allowEnterOverride);
  } else if (game.key === "bingo") {
    const phase = game.bingoPhase || "open";
    if (completed) {
      status = "已完成";
      canEnter = false;
    } else if (bingoPending) {
      status = "等待 Boss 发言";
      canEnter = true;
    } else if (phase === "open" && game.isOpen) {
      status = "未完成";
      canEnter = true;
    } else if (phase === "auto_score") {
      status = "未完成";
      canEnter = true;
    } else if (phase === "closed") {
      status = "已结束";
      canEnter = false;
    } else {
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
        <p>{subtitle || `满分 ${game.maxScore} 分`}</p>
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
