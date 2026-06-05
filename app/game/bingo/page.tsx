"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import ResultModal from "@/components/ResultModal";
import WaitingModal from "@/components/WaitingModal";
import { getPlayerRank } from "@/lib/ranking";
import { calculateBingoScore } from "@/lib/scoring";
import { getGameResult } from "@/lib/storage";
import { useCurrentPlayer, useQuestions, useSubmitGameResult, useAppState } from "@/hooks/use-game-data";

export default function BingoPage() {
  const router = useRouter();
  const { player, playerId, refresh } = useCurrentPlayer();
  const { state } = useAppState();
  const questions = useQuestions("bingo");
  const submitGameResult = useSubmitGameResult();
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [existing, setExisting] = useState<Awaited<ReturnType<typeof getGameResult>>>(null);
  const [existingLoading, setExistingLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, score: 0, total: 0, rank: 0 });
  const [waitingModal, setWaitingModal] = useState(false);
  const [pendingResult, setPendingResult] = useState<Awaited<ReturnType<typeof submitGameResult>> | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hideHeader, setHideHeader] = useState(false);
  const lastScrollY = useRef(0);
  const touchStartY = useRef(0);

  // Bingo 阶段
  const bingoGame = useMemo(() => state.games.find((g) => g.key === "bingo"), [state.games]);
  const bingoPhase = bingoGame?.bingoPhase || "open";
  const currentPlayer = useMemo(
    () => (playerId ? state.players.find((p) => p.id === playerId) || player : null),
    [playerId, state.players, player]
  );

  // 用户当前的 Bingo 状态
  const myBingoResult = useMemo(() => {
    if (!playerId) return existing;
    const stateResult = state.gameResults.find((r) => r.player === playerId && r.gameKey === "bingo") || null;
    return stateResult || existing;
  }, [existing, playerId, state.gameResults]);

  // 用户是否已完成 Bingo（只看用户自己的 completedGames）
  const hasCompletedBingo = Boolean(currentPlayer?.completedGames.includes("bingo"));
  // 用户是否有等待 Boss 判分的记录
  const isWaitingForScore = Boolean(myBingoResult?.pendingBingoScore) && !hasCompletedBingo;

  useEffect(() => {
    if (playerId === null) router.push("/register");
  }, [playerId, router]);

  // 监听滚动和触摸事件来隐藏/显示头部
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current + 20) {
        // 上滑超过20px，隐藏头部
        setHideHeader(true);
      } else if (currentScrollY < lastScrollY.current - 20) {
        // 下滑超过20px，显示头部
        setHideHeader(false);
      }
      lastScrollY.current = currentScrollY;
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentTouchY = e.touches[0].clientY;
      const diff = touchStartY.current - currentTouchY;
      
      if (diff > 30) {
        // 上滑超过30px，隐藏头部
        setHideHeader(true);
      } else if (diff < -30) {
        // 下滑超过30px，显示头部
        setHideHeader(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

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

  // 当用户处于等待状态时轮询，监听 Boss 判分完成
  useEffect(() => {
    if (!playerId || !isWaitingForScore) return;

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
  }, [playerId, isWaitingForScore]);

  const targetWords = useMemo(
    () => questions.filter((question) => question.correctAnswer).map((question) => question.title),
    [questions]
  );
  const correctCount =
    selectedWords.filter((word) => targetWords.includes(word)).length +
    (selectedWords.length === 9 && selectedWords.every((word) => targetWords.includes(word)) ? 1 : 0);
  const previewScore = calculateBingoScore(correctCount);

  // 当用户完成 Bingo 时显示结果弹窗
  useEffect(() => {
    if (!hasCompletedBingo || modal.open || !currentPlayer) return;
    const latestResult = myBingoResult || pendingResult?.result;
    if (!latestResult) return;
    setWaitingModal(false);
    setModal({
      open: true,
      score: latestResult.score,
      total: currentPlayer.totalScore,
      rank: getPlayerRank(state.players, currentPlayer.id)
    });
  }, [hasCompletedBingo, myBingoResult, pendingResult, currentPlayer, modal.open, state.players]);

  function goLobby() {
    setIsLeaving(true);
    router.push("/lobby");
  }

  if (isLeaving) {
    return (
      <Layout title="Bingo 猜词" eyebrow="GAME 01" hideHeader={hideHeader}>
        <section className="statusBanner">正在跳转...</section>
      </Layout>
    );
  }

  // bingoPhase === closed 且用户未完成：禁止进入
  if (bingoPhase === "closed" && !hasCompletedBingo && !isWaitingForScore) {
    return (
      <Layout title="Bingo 猜词" eyebrow="GAME 01" hideHeader={hideHeader}>
        <section className="statusBanner">Bingo 已结束</section>
        <button className="primaryButton" type="button" onClick={goLobby}>
          回到大厅
        </button>
      </Layout>
    );
  }

  // 等待数据加载中
  if (existingLoading) {
    return (
      <Layout title="Bingo 猜词" eyebrow="GAME 01" hideHeader={hideHeader}>
        <section className="statusBanner">游戏加载中,请耐心等待</section>
      </Layout>
    );
  }

  // 用户能否操作（选词与提交）
  const canInteract = !hasCompletedBingo && !isWaitingForScore && bingoPhase !== "closed";

  function toggleWord(word: string) {
    if (!canInteract) return;
    setSelectedWords((current) => {
      if (current.includes(word)) return current.filter((item) => item !== word);
      if (current.length >= 9) return current;
      return [...current, word];
    });
  }

  async function handleSubmit() {
    if (!playerId) return;
    if (selectedWords.length !== 9) {
      setMessage("请从 30 个词中选择 9 个组成 Bingo 宫格");
      return;
    }
    try {
      const outcome = await submitGameResult({
        playerId,
        gameKey: "bingo",
        answers: { selectedWords, targetWords, correctCount },
        score: previewScore
        // 不再传 pendingBingoScore；由后端根据 bingoPhase 决定
      });
      refresh();
      setPendingResult(outcome);
      // 根据 result.pendingBingoScore 判断 waitingModal 是否打开
      if (outcome.result.pendingBingoScore) {
        setWaitingModal(true);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交失败");
    }
  }

  return (
    <Layout title="Bingo 猜词" eyebrow="GAME 01" hideHeader={hideHeader}>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div style={{ fontSize: "64px", marginBottom: "8px" }}>🎯</div>
        <h2
          style={{
            fontSize: "32px",
            fontWeight: "bold",
            margin: 0,
            background: "linear-gradient(90deg, #40d88a, #00b86a)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}
        >
          Bingo 猜词
        </h2>
        <p style={{ color: "var(--ink)", margin: "8px 0 0 0", fontSize: "14px" }}>
          Guess the right words and get Bingo!
        </p>
      </div>

      {bingoPhase === "auto_score" && !hasCompletedBingo && (
        <section className="statusBanner" style={{ color: "var(--green-bright)", borderColor: "rgba(64,216,138,0.5)", background: "rgba(0,184,106,0.08)" }}>
          Boss 发言已完成，提交后系统将自动判分。
        </section>
      )}

      <section className="wordBank">
        {questions.map((question) => (
          <button
            className={selectedWords.includes(question.title) ? "selected" : ""}
            disabled={!canInteract}
            key={question.id}
            type="button"
            onClick={() => toggleWord(question.title)}
          >
            {question.title}
          </button>
        ))}
      </section>

      <section className="bingoBoard demoBoard" style={{ marginTop: "20px" }}>
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

      <button
        className="primaryButton"
        type="button"
        disabled={!canInteract || selectedWords.length !== 9}
        onClick={handleSubmit}
      >
        提交 Bingo
      </button>

      <ResultModal
        open={modal.open}
        gameName="Bingo 猜词"
        roundScore={modal.score}
        totalScore={modal.total}
        rank={modal.rank}
        onBackLobby={goLobby}
      />
      <WaitingModal open={(waitingModal || isWaitingForScore) && !modal.open} gameName="Bingo 猜词" />
    </Layout>
  );
}
