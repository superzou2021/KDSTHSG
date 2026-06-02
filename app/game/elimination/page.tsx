"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import ResultModal from "@/components/ResultModal";
import EliminationModal from "@/components/EliminationModal";
import { calculateEliminationScore } from "@/lib/scoring";
import { getGameResult } from "@/lib/storage";
import { useCurrentPlayer, useGameStatus, useQuestions, useSubmitGameResult } from "@/hooks/use-game-data";

export default function EliminationPage() {
  const router = useRouter();
  const { playerId, refresh } = useCurrentPlayer();
  const questions = useQuestions("elimination");
  const submitGameResult = useSubmitGameResult();
  const isOpen = useGameStatus("elimination");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [existing, setExisting] = useState<Awaited<ReturnType<typeof getGameResult>>>(null);
  const [existingLoading, setExistingLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, score: 0, total: 0, rank: 0, isEliminated: false });
  const [eliminationModal, setEliminationModal] = useState({ open: false, type: "correct" as "correct" | "eliminated" });
  const [message, setMessage] = useState("");

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
        const result = await getGameResult(currentPlayerId, "elimination");
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

  const currentQuestion = questions[currentIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : "";
  const isLastQuestion = currentIndex === questions.length - 1;
  const correctCount = useMemo(() => questions.filter((question) => answers[question.id] === question.correctAnswer).length, [answers, questions]);
  const score = calculateEliminationScore(correctCount);

  if (isOpen === false) {
    return (
      <Layout title="站立淘汰" eyebrow="GAME 04">
        <section className="statusBanner">该游戏已关闭，请等待现场主持人开启。</section>
        <button className="primaryButton" type="button" onClick={() => router.push("/lobby")}>
          回到大厅
        </button>
      </Layout>
    );
  }

  async function chooseAnswer(option: string) {
    if (!currentQuestion || isOpen !== true || existing) return;

    const newAnswers = { ...answers, [currentQuestion.id]: option };
    setAnswers(newAnswers);
    setMessage("");

    const isCorrect = option === currentQuestion.correctAnswer;
    const newCorrectCount = questions.filter((q) => {
      const answer = newAnswers[q.id];
      return answer === q.correctAnswer;
    }).length;
    const newScore = calculateEliminationScore(newCorrectCount);

    if (isCorrect) {
      if (isLastQuestion) {
        if (!playerId) return;
        try {
          const outcome = await submitGameResult({ playerId, gameKey: "elimination", answers: newAnswers, score: newScore });
          refresh();
          setExisting(outcome.result);
          setModal({ open: true, score: outcome.result.score, total: outcome.player.totalScore, rank: outcome.rank, isEliminated: false });
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "提交失败");
        }
      } else {
        setEliminationModal({ open: true, type: "correct" });
      }
    } else {
      if (!playerId) return;
      try {
        const outcome = await submitGameResult({ playerId, gameKey: "elimination", answers: newAnswers, score: newScore });
        refresh();
        setExisting(outcome.result);
        setModal({ open: true, score: outcome.result.score, total: outcome.player.totalScore, rank: outcome.rank, isEliminated: true });
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "提交失败");
      }
    }
  }

  function goNext() {
    setCurrentIndex((index) => Math.min(index + 1, questions.length - 1));
    setEliminationModal({ open: false, type: "correct" });
    setMessage("");
  }

  return (
    <Layout title="站立淘汰" eyebrow="GAME 04">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '64px', marginBottom: '8px' }}>🏆</div>
        <h2 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, background: 'linear-gradient(90deg, #40d88a, #00b86a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          站立淘汰
        </h2>
        <p style={{ color: 'var(--ink)', margin: '8px 0 0 0', fontSize: '14px' }}>Last one standing wins!</p>
      </div>
      
      {!existingLoading && existing && <section className="statusBanner">该游戏已完成，本关得分 {existing.score}，不能重复提交。</section>}
      
      {currentQuestion && !eliminationModal.open && (
        <section className="questionStack">
          <article className="questionCard" style={{ padding: '24px 20px' }}>
            <h3 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 20px 0', lineHeight: '1.4' }}>
              Round {currentIndex + 1}: {currentQuestion.title}
            </h3>
            <div className="optionGrid" style={{ gap: '12px' }}>
              {currentQuestion.options?.map((option, idx) => (
                <button 
                  className={selectedAnswer === option ? "selected" : ""} 
                  disabled={Boolean(existing) || isOpen !== true} 
                  key={option} 
                  type="button" 
                  onClick={() => chooseAnswer(option)}
                  style={{ padding: '14px 16px', fontSize: '16px' }}
                >
                  {option}
                </button>
              ))}
            </div>
          </article>
        </section>
      )}
      
      <section className="statusPanel">
        <b>已完成 {Object.keys(answers).length}/5</b>
        <span>{message || "答对可进入下一题，答错即被淘汰。"}</span>
      </section>
      
      <ResultModal
        open={modal.open}
        gameName="站立淘汰"
        roundScore={modal.score}
        totalScore={modal.total}
        rank={modal.rank}
        isEliminated={modal.isEliminated}
        onBackLobby={() => {
          router.replace("/result");
          window.setTimeout(() => {
            if (window.location.pathname !== "/result") {
              window.location.assign("/result");
            }
          }, 300);
        }}
        buttonText="查看最终成绩"
      />
      
      <EliminationModal
        open={eliminationModal.open}
        type={eliminationModal.type}
        onNext={goNext}
        onBack={() => router.push("/lobby")}
      />
    </Layout>
  );
}
