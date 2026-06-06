import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { Game, GameKey } from "@/types";

type GameCardProps = {
  game: Game;
  completed: boolean;
  bingoPending?: boolean;
  subtitle?: string;
  statusOverride?: string;
  allowEnterOverride?: boolean;
};

type IconConfig = {
  src: string;
  width: number;
  height: number;
  right: number;
  offsetY: number;
};

const GAME_ICONS: Record<GameKey, IconConfig> = {
  bingo: { src: "/image/source/lobby/game-bingo.png", width: 72, height: 73, right: 18, offsetY: 10 },
  quiz: { src: "/image/source/lobby/game-quiz.png", width: 89, height: 89, right: 6, offsetY: 8 },
  story: { src: "/image/source/lobby/game-story.png", width: 95, height: 66, right: 6, offsetY: 12 },
  elimination: { src: "/image/source/lobby/game-elimination.png", width: 64, height: 78, right: 22, offsetY: 5 }
};

const DISPLAY_NAMES: Record<GameKey, string> = {
  bingo: "Bingo猜词",
  quiz: "Sector Quiz",
  story: "真假故事",
  elimination: "站立淘汰"
};

function getStatusBadgeClass(status: string, canEnter: boolean): string {
  if (status === "已完成" || status === "已结束") return "lobbyGameBadge lobbyGameBadge--done";
  if (!canEnter || status === "等待开启") return "lobbyGameBadge lobbyGameBadge--locked";
  return "lobbyGameBadge";
}

export default function GameCard({
  game,
  completed,
  bingoPending = false,
  subtitle,
  statusOverride,
  allowEnterOverride
}: GameCardProps) {
  const href = `/game/${game.key}`;
  const icon = GAME_ICONS[game.key];

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
      status = "未开始";
      canEnter = true;
    } else if (phase === "auto_score") {
      status = "未开始";
      canEnter = true;
    } else if (phase === "closed") {
      status = "已结束";
      canEnter = false;
    } else {
      status = "未开始";
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
      status = "未开始";
      canEnter = false;
    }
  }

  const iconLeft = 104 - icon.width - icon.right;

  const iconStyle = {
    "--icon-width": `${icon.width}px`,
    "--icon-height": `${icon.height}px`,
    "--icon-left": `${iconLeft}px`,
    "--icon-offset-y": `${icon.offsetY}px`
  } as CSSProperties;

  const cardBody = (
    <div className="lobbyGameCard">
      <h3>{DISPLAY_NAMES[game.key]}</h3>
      <div className="lobbyGameCardMeta">
        <p>{subtitle || `满分 ${game.maxScore}分`}</p>
        <span className={getStatusBadgeClass(status, canEnter)}>{status}</span>
      </div>
    </div>
  );

  const iconLayer = (
    <div className="lobbyGameIcon" style={iconStyle} aria-hidden="true">
      <div className="lobbyGameIconMain">
        <Image src={icon.src} alt="" width={icon.width} height={icon.height} priority={game.order === 1} />
      </div>
      <div className="lobbyGameIconReflection">
        <Image src={icon.src} alt="" width={icon.width} height={icon.height} aria-hidden="true" />
      </div>
    </div>
  );

  const itemClass = [
    "lobbyGameItem",
    completed ? "lobbyGameItem--done" : "",
    !canEnter ? "lobbyGameItem--locked" : ""
  ]
    .filter(Boolean)
    .join(" ");

  if (!canEnter) {
    return (
      <article className={itemClass} aria-disabled="true">
        {cardBody}
        {iconLayer}
      </article>
    );
  }

  return (
    <Link href={href} className={itemClass}>
      {cardBody}
      {iconLayer}
    </Link>
  );
}
