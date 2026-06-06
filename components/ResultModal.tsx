"use client";

import Image from "next/image";

const RESULT_TITLE_IMAGES: Record<
  string,
  { src: string; width: number; height: number; className?: string }
> = {
  "Bingo 猜词": { src: "/image/source/bingo/bingo-title.png", width: 116, height: 20 },
  "真假故事": {
    src: "/image/source/story/story-title.png",
    width: 90,
    height: 21,
    className: "resultModalTitleImage resultModalTitleImageStory"
  },
  站立淘汰: {
    src: "/image/source/elimination/modal-title.png",
    width: 85,
    height: 20,
    className: "resultModalTitleImage resultModalTitleImageElimination"
  }
};

type EliminationModalStyle = "auto" | "standard" | "correct" | "wrong";

type ResultModalProps = {
  open: boolean;
  gameName: string;
  roundScore: number;
  totalScore: number;
  rank: number;
  onBackLobby: () => void;
  buttonText?: string;
  isEliminated?: boolean;
  onClose?: () => void;
  eliminationModalStyle?: EliminationModalStyle;
};

const ELIMINATION_CORNER_BADGES = {
  wrong: { src: "/image/source/elimination/modal-wrong.png", width: 86, height: 86 },
  correct: { src: "/image/source/elimination/modal-correct.png", width: 73, height: 73 }
} as const;

export default function ResultModal({
  open,
  gameName,
  roundScore,
  totalScore,
  rank,
  onBackLobby,
  buttonText,
  isEliminated = false,
  onClose,
  eliminationModalStyle = "auto"
}: ResultModalProps) {
  if (!open) return null;

  const handleClick = onClose || onBackLobby;
  const titleImage = RESULT_TITLE_IMAGES[gameName];
  const isElimination = gameName === "站立淘汰";
  const resolvedEliminationStyle: Exclude<EliminationModalStyle, "auto"> = isElimination
    ? eliminationModalStyle === "auto"
      ? isEliminated
        ? "wrong"
        : "correct"
      : eliminationModalStyle
    : "standard";
  const showEliminationStatus =
    isElimination && (resolvedEliminationStyle === "wrong" || resolvedEliminationStyle === "correct");
  const cornerBadge =
    showEliminationStatus && resolvedEliminationStyle === "wrong"
      ? ELIMINATION_CORNER_BADGES.wrong
      : showEliminationStatus && resolvedEliminationStyle === "correct"
        ? ELIMINATION_CORNER_BADGES.correct
        : null;
  const eliminationTitleImage = titleImage ?? RESULT_TITLE_IMAGES["站立淘汰"];

  return (
    <div className="modalMask">
      <section className={`resultModal${isElimination ? " resultModal--elimination" : ""}`}>
        {cornerBadge ? (
          <div
            aria-hidden="true"
            className={`resultModalCornerBadge${resolvedEliminationStyle === "wrong" ? " resultModalCornerBadgeWrong" : " resultModalCornerBadgeCorrect"}`}
          >
            <Image
              alt=""
              className="resultModalCornerBadgeImage"
              height={cornerBadge.height}
              src={cornerBadge.src}
              width={cornerBadge.width}
            />
          </div>
        ) : null}
        <div className="resultModalGlow" aria-hidden="true" />
        <div className="resultModalBody">
          <div className="resultModalHeader">
            {isElimination ? (
              <>
                <span className="resultModalEyebrow">GAME COMPLETED</span>
                {showEliminationStatus ? (
                  <h2 className="resultModalEliminationTitle">
                    {resolvedEliminationStyle === "wrong" ? "很遗憾被淘汰" : "恭喜答对"}
                  </h2>
                ) : eliminationTitleImage ? (
                  <Image
                    alt={gameName}
                    className={eliminationTitleImage.className ?? "resultModalTitleImage"}
                    height={eliminationTitleImage.height}
                    src={eliminationTitleImage.src}
                    width={eliminationTitleImage.width}
                  />
                ) : (
                  <h2 className="resultModalTitle">{gameName}</h2>
                )}
              </>
            ) : isEliminated ? (
              <>
                <span className="resultModalEyebrow">游戏结束</span>
                <h2 className="resultModalTitle">很遗憾被淘汰！</h2>
              </>
            ) : (
              <>
                <span className="resultModalEyebrow">GAME COMPLETED</span>
                {titleImage ? (
                  <Image
                    alt={gameName}
                    className={titleImage.className ?? "resultModalTitleImage"}
                    height={titleImage.height}
                    src={titleImage.src}
                    width={titleImage.width}
                  />
                ) : (
                  <h2 className="resultModalTitle">{gameName}</h2>
                )}
              </>
            )}
          </div>

          <div className="resultModalMain">
            <div className="resultModalScore">{roundScore}</div>
            {(!isEliminated || isElimination) && (
              <p className="resultModalStats">
                累计积分 {totalScore} 当前排名 <span className="resultModalRank">{rank || "-"}</span>
              </p>
            )}
          </div>

          <div className="resultModalFooter">
            <button className="resultModalButton" type="button" onClick={handleClick}>
              {buttonText || "回到大厅"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
