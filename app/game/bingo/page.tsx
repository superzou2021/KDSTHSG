"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import ResultModal from "@/components/ResultModal";
import WaitingModal from "@/components/WaitingModal";
import { getPlayerRank } from "@/lib/ranking";
import { calculateBingoScore } from "@/lib/scoring";
import { getGameResult } from "@/lib/storage";
import { useCurrentPlayer, useGameStatus, useQuestions, useSubmitGameResult, useAppState } from "@/hooks/use-game-data";

export default function BingoPage() {
  const router = useRouter();
  const { player, playerId, refresh } = useCurrentPlayer();
  const { state } = useAppState();
  const questions = useQuestions("bingo");
  const submitGameResult = useSubmitGameResult();
  const isOpen = useGameStatus("bingo");
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [existing, setExisting] = useState<Awaited<ReturnType<typeof getGameResult>>>(null);
  const [existingLoading, setExistingLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, score: 0, total: 0, rank: 0 });
  const [waitingModal, setWaitingModal] = useState(false);
  const [pendingResult, setPendingResult] = useState<Awaited<ReturnType<typeof submitGameResult>> | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [message, setMessage] = useState("");
  const bingoScored = useMemo(() => {
    const bingoGame = state.games.find(g => g.key === "bingo");
    return bingoGame?.bingoScored || false;
  }, [state.games]);
  const currentBingoResult = useMemo(() => {
    if (!playerId) return existing;
    const stateResult = state.gameResults.find((result) => result.player === playerId && result.gameKey === "bingo") || null;
    if (existing && !existing.pendingBingoScore) return existing;
    if (stateResult && !stateResult.pendingBingoScore) return stateResult;
    return stateResult || existing;
  }, [existing, playerId, state.gameResults]);
  const isBingoSettled = Boolean((currentBingoResult && !currentBingoResult.pendingBingoScore) || bingoScored);
  const isWaitingForBingoScore = Boolean((pendingResult || currentBingoResult?.pendingBingoScore) && !isBingoSettled);
  const hasSubmittedBingo = Boolean(currentBingoResult || pendingResult);

  useEffect(() => {
    if (playerId === null) router.push("/register");
  }, [playerId, router]);

  useEffect(() => {
    if (!playerId) {
      setExisting(null);
      setExistingLoading(playerId === undefined);
      return;
    }

    let active = true;
    const currentPlayerId = playerId;
    async function loadExisting() {
      setExistingLoading(true);
      try {
        const result = await getGameResult(currentPlayerId, "bingo");
        if (!active) return;
        setExisting(result);
      } finally {
        if (active) setExistingLoading(false);
      }
    }
    loadExisting();
    return () => {
      active = false;
    };
  }, [playerId]);

  useEffect(() => {
    if (!playerId || (!waitingModal && !pendingResult && !currentBingoResult?.pendingBingoScore)) return;

    let active = true;
    async function pollBingoResult() {
      const result = await getGameResult(playerId as string, "bingo");
      if (active && result) {
        setExisting(result);
      }
    }

    pollBingoResult();
    const timer = window.setInterval(pollBingoResult, 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [currentBingoResult?.pendingBingoScore, pendingResult, playerId, waitingModal]);

  const targetWords = useMemo(() => questions.filter((question) => question.correctAnswer).map((question) => question.title), [questions]);
  const correctCount = selectedWords.filter((word) => targetWords.includes(word)).length + (selectedWords.length === 9 && selectedWords.every((word) => targetWords.includes(word)) ? 1 : 0);
  const previewScore = calculateBingoScore(correctCount);

  useEffect(() => {
    const shouldSettle = isBingoSettled && (waitingModal || Boolean(pendingResult) || Boolean(currentBingoResult));
    if (!shouldSettle) return;

    const latestResult = currentBingoResult || pendingResult?.result;
    const latestPlayer = playerId ? state.players.find((item) => item.id === playerId) || player || pendingResult?.player : null;
    if (latestResult && latestPlayer) {
      const totalScore = latestPlayer.completedGames.includes("bingo")
        ? latestPlayer.totalScore
        : latestPlayer.totalScore + latestResult.score;
      setWaitingModal(false);
      setModal({
        open: true,
        score: latestResult.score,
        total: totalScore,
        rank: getPlayerRank(state.players, latestPlayer.id)
      });
    }
  }, [currentBingoResult, isBingoSettled, pendingResult, player, playerId, state.players, waitingModal]);

  const shouldLeaveClosedGame = isOpen === false && !isWaitingForBingoScore && !modal.open && !pendingResult && !currentBingoResult;

  function goLobby() {
    setIsLeaving(true);
    router.push("/lobby");
  }

  if (isLeaving) {
    return (
      <Layout title="Bingo 猜词" eyebrow="GAME 01">
        <section className="statusBanner">正在跳转...</section>
      </Layout>
    );
  }

  if (shouldLeaveClosedGame) {
    return (
      <Layout title="Bingo 猜词" eyebrow="GAME 01">
        <section className="statusBanner">游戏加载中,请耐心等待</section>
        <button className="primaryButton" type="button" onClick={goLobby}>
          回到大厅
        </button>
      </Layout>
    );
  }

  function toggleWord(word: string) {
    if (isOpen !== true || hasSubmittedBingo) return;
    setSelectedWords((current) => {
      if (current.includes(word)) return current.filter((item) => item !== word);
      if (current.length >= 9) return current;
      return [...current, word];
    });
  }

  async function handleSubmit() {
    if (!playerId) return;
    if (isOpen !== true) {
      setMessage("该游戏暂未开放");
      return;
    }
    if (selectedWords.length !== 9) {
      setMessage("请从 30 个词中选择 9 个组成 Bingo 宫格");
      return;
    }
    try {
      const outcome = await submitGameResult({
        playerId,
        gameKey: "bingo",
        answers: { selectedWords, targetWords, correctCount },
        score: previewScore,
        pendingBingoScore: true
      });
      refresh();
      setPendingResult(outcome);
      setWaitingModal(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交失败");
    }
  }

  return (
    <Layout title="Bingo 猜词" eyebrow="GAME 01">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '64px', marginBottom: '8px' }}>🎯</div>
        <h2 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, background: 'linear-gradient(90deg, #40d88a, #00b86a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Bingo 猜词
        </h2>
        <p style={{ color: 'var(--ink)', margin: '8px 0 0 0', fontSize: '14px' }}>Guess the right words and get Bingo!</p>
      </div>
      
      <section className="wordBank">
        {questions.map((question) => (
          <button
            className={selectedWords.includes(question.title) ? "selected" : ""}
            disabled={hasSubmittedBingo || isOpen !== true}
            key={question.id}
            type="button"
            onClick={() => toggleWord(question.title)}
          >
            {question.title}
          </button>
        ))}
      </section>
      
      <section className="bingoBoard demoBoard" style={{ marginTop: '20px' }}>
        {Array.from({ length: 9 }).map((_, index) => (
          <div className={selectedWords[index] ? "lit" : ""} key={index}>
            {selectedWords[index] || index + 1}
          </div>
        ))}
      </section>
      
      <section className="statusPanel">
        <b>已选 {selectedWords.length}/9</b>
        <span>{message || "请从词库中选择 9 个词组成 Bingo 宫格。"}</span>
      </section>
      
      <button className="primaryButton" type="button" disabled={hasSubmittedBingo || isOpen !== true || selectedWords.length !== 9} onClick={handleSubmit}>
        提交 Bingo
      </button>
      
      <ResultModal open={modal.open} gameName="Bingo 猜词" roundScore={modal.score} totalScore={modal.total} rank={modal.rank} onBackLobby={goLobby} />
      <WaitingModal open={waitingModal || isWaitingForBingoScore} gameName="Bingo 猜词" />
    </Layout>
  );
}
