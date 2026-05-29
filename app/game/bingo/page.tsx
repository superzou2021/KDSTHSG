"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import ResultModal from "@/components/ResultModal";
import { calculateBingoScore } from "@/lib/scoring";
import { getGameResult } from "@/lib/storage";
import { useCurrentPlayer, useGameStatus, useQuestions, useSubmitGameResult } from "@/hooks/use-game-data";

export default function BingoPage() {
  const router = useRouter();
  const { playerId, refresh } = useCurrentPlayer();
  const questions = useQuestions("bingo");
  const submitGameResult = useSubmitGameResult();
  const isOpen = useGameStatus("bingo");
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [existing, setExisting] = useState<ReturnType<typeof getGameResult>>(null);
  const [modal, setModal] = useState({ open: false, score: 0, total: 0, rank: 0 });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (playerId === null) router.push("/register");
  }, [playerId, router]);

  useEffect(() => {
    setExisting(playerId ? getGameResult(playerId, "bingo") : null);
  }, [playerId]);

  const targetWords = useMemo(() => questions.filter((question) => question.correctAnswer).map((question) => question.title), [questions]);
  const correctCount = selectedWords.filter((word) => targetWords.includes(word)).length + (selectedWords.length === 9 && selectedWords.every((word) => targetWords.includes(word)) ? 1 : 0);
  const previewScore = calculateBingoScore(correctCount);

  if (isOpen === false) {
    return (
      <Layout title="Bingo 猜词" eyebrow="GAME 01">
        <section className="statusBanner">该游戏已关闭，请等待现场主持人开启。</section>
        <button className="primaryButton" type="button" onClick={() => router.push("/lobby")}>
          回到大厅
        </button>
      </Layout>
    );
  }

  function toggleWord(word: string) {
    if (isOpen !== true || existing) return;
    setSelectedWords((current) => {
      if (current.includes(word)) return current.filter((item) => item !== word);
      if (current.length >= 9) return current;
      return [...current, word];
    });
  }

  function handleSubmit() {
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
      const outcome = submitGameResult({
        playerId,
        gameKey: "bingo",
        answers: { selectedWords, targetWords, correctCount },
        score: previewScore
      });
      refresh();
      setExisting(outcome.result);
      setModal({ open: true, score: outcome.result.score, total: outcome.player.totalScore, rank: outcome.rank });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交失败");
    }
  }

  return (
    <Layout title="Bingo 猜词" eyebrow="GAME 01">
      <section className="demoCard">
        <h2>从词库选择 9 个词</h2>
        <p>系统词库共 30 个词，命中活动关键词每个 10 分，全中额外按 1 个命中计入，满分 100。</p>
      </section>
      {existing && <section className="statusBanner">该游戏已完成，本关得分 {existing.score}，不能重复提交。</section>}
      <section className="wordBank">
        {questions.map((question) => (
          <button
            className={selectedWords.includes(question.title) ? "selected" : ""}
            disabled={Boolean(existing) || isOpen !== true}
            key={question.id}
            type="button"
            onClick={() => toggleWord(question.title)}
          >
            {question.title}
          </button>
        ))}
      </section>
      <section className="bingoBoard demoBoard">
        {Array.from({ length: 9 }).map((_, index) => (
          <div className={selectedWords[index] ? "lit" : ""} key={index}>
            {selectedWords[index] || index + 1}
          </div>
        ))}
      </section>
      <section className="statusPanel">
        <b>已选 {selectedWords.length}/9，预估 {previewScore} 分</b>
        <span>{message || "现场演示可直接选择目标词，也可以故意选错展示自动判分。"}</span>
      </section>
      <button className="primaryButton" type="button" disabled={Boolean(existing) || isOpen !== true || selectedWords.length !== 9} onClick={handleSubmit}>
        提交 Bingo
      </button>
      <ResultModal open={modal.open} gameName="Bingo 猜词" roundScore={modal.score} totalScore={modal.total} rank={modal.rank} onBackLobby={() => router.push("/lobby")} />
    </Layout>
  );
}
