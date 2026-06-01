"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import ResultModal from "@/components/ResultModal";
import { calculateStoryScore } from "@/lib/scoring";
import { getGameResult } from "@/lib/storage";
import { useCurrentPlayer, useGameStatus, useQuestions, useSubmitGameResult } from "@/hooks/use-game-data";

export default function StoryPage() {
  const router = useRouter();
  const { playerId, refresh } = useCurrentPlayer();
  const questions = useQuestions("story");
  const submitGameResult = useSubmitGameResult();
  const isOpen = useGameStatus("story");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [existing, setExisting] = useState<ReturnType<typeof getGameResult>>(null);
  const [modal, setModal] = useState({ open: false, score: 0, total: 0, rank: 0 });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (playerId === null) router.push("/register");
  }, [playerId, router]);

  useEffect(() => {
    async function loadExisting() {
      if (playerId) {
        const result = await getGameResult(playerId, "story");
        setExisting(result);
      }
    }
    loadExisting();
  }, [playerId]);

  const currentQuestion = questions[currentIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : "";
  const isLastQuestion = currentIndex === questions.length - 1;
  const results = useMemo(() => questions.map((question) => answers[question.id] === question.correctAnswer), [answers, questions]);
  const score = calculateStoryScore(results);

  if (isOpen === false) {
    return (
      <Layout title="真假故事" eyebrow="GAME 03">
        <section className="statusBanner">该游戏已关闭，请等待现场主持人开启。</section>
        <button className="primaryButton" type="button" onClick={() => router.push("/lobby")}>
          回到大厅
        </button>
      </Layout>
    );
  }

  function chooseAnswer(option: string) {
    if (!currentQuestion || isOpen !== true || existing) return;
    setAnswers((current) => ({ ...current, [currentQuestion.id]: option }));
    setMessage("");
  }

  function goNext() {
    if (!selectedAnswer) {
      setMessage("请先完成本题判断");
      return;
    }
    setCurrentIndex((index) => Math.min(index + 1, questions.length - 1));
    setMessage("");
  }

  async function submit() {
    if (!playerId) return;
    if (isOpen !== true) {
      setMessage("该游戏暂未开放");
      return;
    }
    if (!selectedAnswer || Object.keys(answers).length < questions.length) {
      setMessage("请完成当前故事题后再提交");
      return;
    }
    try {
      const outcome = await submitGameResult({ playerId, gameKey: "story", answers, score });
      refresh();
      setExisting(outcome.result);
      setModal({ open: true, score: outcome.result.score, total: outcome.player.totalScore, rank: outcome.rank });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交失败");
    }
  }

  return (
    <Layout title="真假故事" eyebrow="GAME 03">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '64px', marginBottom: '8px' }}>📖</div>
        <h2 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, background: 'linear-gradient(90deg, #40d88a, #00b86a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          真假故事
        </h2>
        <p style={{ color: 'var(--ink)', margin: '8px 0 0 0', fontSize: '14px' }}>Guess if the story is true or false!</p>
      </div>
      
      {existing && <section className="statusBanner">该游戏已完成，本关得分 {existing.score}，不能重复提交。</section>}
      
      {currentQuestion && (
        <section className="questionStack">
          <article className="questionCard" style={{ padding: '24px 20px' }}>
            <h3 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 20px 0', lineHeight: '1.4' }}>
              Story {currentIndex + 1}: {currentQuestion.title}
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
        <b>已完成 {Object.keys(answers).length}/3</b>
        <span>{message || "每次只生成一道故事题，手动进入下一题。"}</span>
      </section>
      
      {isLastQuestion ? (
        <button className="primaryButton" disabled={Boolean(existing) || isOpen !== true || !selectedAnswer} type="button" onClick={submit}>
          提交真假故事
        </button>
      ) : (
        <button className="primaryButton" disabled={Boolean(existing) || isOpen !== true || !selectedAnswer} type="button" onClick={goNext}>
          下一题
        </button>
      )}
      
      <ResultModal open={modal.open} gameName="真假故事" roundScore={modal.score} totalScore={modal.total} rank={modal.rank} onBackLobby={() => router.push("/lobby")} />
    </Layout>
  );
}
