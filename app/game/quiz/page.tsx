"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Countdown from "@/components/Countdown";
import Layout from "@/components/Layout";
import ResultModal from "@/components/ResultModal";
import { calculateQuizScore } from "@/lib/scoring";
import { getGameResult } from "@/lib/storage";
import { useCurrentPlayer, useGameStatus, useQuestions, useSubmitGameResult } from "@/hooks/use-game-data";

const QUIZ_SECONDS = 60;

export default function QuizPage() {
  const router = useRouter();
  const { playerId, refresh } = useCurrentPlayer();
  const questions = useQuestions("quiz");
  const submitGameResult = useSubmitGameResult();
  const isOpen = useGameStatus("quiz");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [seconds, setSeconds] = useState(QUIZ_SECONDS);
  const [existing, setExisting] = useState<Awaited<ReturnType<typeof getGameResult>>>(null);
  const [existingLoading, setExistingLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, score: 0, total: 0, rank: 0 });
  const [isLeaving, setIsLeaving] = useState(false);
  const [message, setMessage] = useState("");

  // 先定义所有计算变量
  const currentQuestion = questions[currentIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : "";
  const isLastQuestion = currentIndex === questions.length - 1;
  const correctCount = useMemo(() => questions.filter((question) => answers[question.id] === question.correctAnswer).length, [answers, questions]);
  const score = calculateQuizScore(correctCount);

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
        const result = await getGameResult(currentPlayerId, "quiz");
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
    if (modal.open || existing || isOpen !== true) return undefined;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [modal.open, existing, isOpen]);

  // 倒计时结束时自动跳转下一组题目
  useEffect(() => {
    if (seconds > 0 || modal.open || existing || isOpen !== true) return;
    
    const lastQuestion = currentIndex === questions.length - 1;
    if (lastQuestion) {
      // 如果是最后一题，直接提交
      if (playerId) {
        (async () => {
          try {
            const outcome = await submitGameResult({ playerId, gameKey: "quiz", answers, score });
            refresh();
            setExisting(outcome.result);
            setModal({ open: true, score: outcome.result.score, total: outcome.player.totalScore, rank: outcome.rank });
          } catch {
            // 提交失败也不处理
          }
        })();
      }
    } else {
      // 计算下一组题目的开始位置
      const currentGroupStart = Math.floor(currentIndex / 2) * 2;
      const nextGroupStart = currentGroupStart + 2;
      
      if (nextGroupStart < questions.length) {
        // 跳转到下一组
        setCurrentIndex(nextGroupStart);
        setSeconds(QUIZ_SECONDS);
        setMessage("时间到，已自动跳转下一组题目");
      } else {
        // 没有下一组，直接提交
        if (playerId) {
          (async () => {
            try {
              const outcome = await submitGameResult({ playerId, gameKey: "quiz", answers, score });
              refresh();
              setExisting(outcome.result);
              setModal({ open: true, score: outcome.result.score, total: outcome.player.totalScore, rank: outcome.rank });
            } catch {
              // 提交失败也不处理
            }
          })();
        }
      }
    }
  }, [seconds]); // 简化依赖数组，只监听 seconds

  const shouldLeaveClosedGame = isOpen === false && !existingLoading && !existing && !modal.open;

  function goLobby() {
    setIsLeaving(true);
    router.push("/lobby");
  }

  if (isLeaving) {
    return (
      <Layout title="Quick Quiz" eyebrow="GAME 02">
        <section className="statusBanner">正在跳转...</section>
      </Layout>
    );
  }

  if (shouldLeaveClosedGame) {
    return (
      <Layout title="Quick Quiz" eyebrow="GAME 02">
        <section className="statusBanner">正在同步游戏开放状态...</section>
        <button className="primaryButton" type="button" onClick={goLobby}>
          回到大厅
        </button>
      </Layout>
    );
  }

  function chooseAnswer(option: string) {
    if (!currentQuestion || isOpen !== true || existing || seconds === 0) return;
    setAnswers((current) => ({ ...current, [currentQuestion.id]: option }));
    setMessage("");
  }

  function goNext() {
    if (!selectedAnswer) {
      setMessage("请先选择本题答案");
      return;
    }
    // 每两题重置计时器
    if ((currentIndex + 1) % 2 === 0) {
      setSeconds(QUIZ_SECONDS);
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
    if (!selectedAnswer) {
      setMessage("请完成当前题目后再提交");
      return;
    }
    try {
      const outcome = await submitGameResult({ playerId, gameKey: "quiz", answers, score });
      refresh();
      setExisting(outcome.result);
      setModal({ open: true, score: outcome.result.score, total: outcome.player.totalScore, rank: outcome.rank });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交失败");
    }
  }

  return (
    <Layout title="Quick Quiz" eyebrow="GAME 02">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '64px', marginBottom: '8px' }}>⚡</div>
        <h2 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, background: 'linear-gradient(90deg, #40d88a, #00b86a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          快问快答
        </h2>
        <p style={{ color: 'var(--ink)', margin: '8px 0 0 0', fontSize: '14px' }}>Quick questions and quick answers</p>
      </div>
      
      <Countdown seconds={seconds} total={QUIZ_SECONDS} currentIndex={currentIndex} totalQuestions={questions.length} />
      
      {!existingLoading && existing && <section className="statusBanner">该游戏已完成，本关得分 {existing.score}，不能重复提交。</section>}
      
      {currentQuestion && (
        <section className="questionStack">
          <article className="questionCard" style={{ padding: '24px 20px' }}>
            <h3 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 20px 0', lineHeight: '1.4' }}>
              Question{currentIndex + 1}: select one from below 4 answers
            </h3>
            <div className="optionGrid" style={{ gap: '12px' }}>
              {currentQuestion.options?.map((option, idx) => (
                <button 
                  className={selectedAnswer === option ? "selected" : ""} 
                  disabled={Boolean(existing) || isOpen !== true || seconds === 0} 
                  key={option} 
                  type="button" 
                  onClick={() => chooseAnswer(option)}
                  style={{ padding: '14px 16px', fontSize: '16px', textAlign: 'left' }}
                >
                  <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{String.fromCharCode(65 + idx)}.</span>
                  {option}
                </button>
              ))}
            </div>
          </article>
        </section>
      )}
      
      <section className="statusPanel">
        <b>已完成 {Object.keys(answers).length}/10</b>
        <span>{message || "每两题需要在一分钟之内完成，选择答案后手动进入下一题，时间到自动跳转。"}</span>
      </section>
      
      {isLastQuestion ? (
        <button className="primaryButton" disabled={Boolean(existing) || isOpen !== true || !selectedAnswer || seconds === 0} type="button" onClick={submit}>
          提交 Quick Quiz
        </button>
      ) : (
        <button className="primaryButton" disabled={Boolean(existing) || isOpen !== true || !selectedAnswer || seconds === 0} type="button" onClick={goNext}>
          下一题
        </button>
      )}
      
      <ResultModal open={modal.open} gameName="Quick Quiz" roundScore={modal.score} totalScore={modal.total} rank={modal.rank} onBackLobby={goLobby} />
    </Layout>
  );
}
