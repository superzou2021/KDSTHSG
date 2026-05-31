import Link from "next/link";
import type { Game } from "@/types";

type GameCardProps = {
  game: Game;
  completed: boolean;
};

export default function GameCard({ game, completed }: GameCardProps) {
  const href = `/game/${game.key}`;
  const status = !game.isOpen ? "未开放" : completed ? "已完成" : "未开始";
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

  if (!game.isOpen) {
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
