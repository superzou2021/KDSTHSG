"use client";

import ResultModal from "@/components/ResultModal";

type EliminationModalProps = {
  open: boolean;
  roundScore: number;
  totalScore: number;
  rank: number;
  onNext?: () => void;
};

export default function EliminationModal({
  open,
  roundScore,
  totalScore,
  rank,
  onNext
}: EliminationModalProps) {
  return (
    <ResultModal
      open={open}
      gameName="站立淘汰"
      roundScore={roundScore}
      totalScore={totalScore}
      rank={rank}
      eliminationModalStyle="correct"
      buttonText="下一题"
      onClose={onNext}
      onBackLobby={() => onNext?.()}
    />
  );
}
