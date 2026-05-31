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
  const [existing, setExisting] = useState<ReturnType<typeof getGameResult>>(null);
  const [modal, setModal] = useState({ open: false, score: 0, total: 0, rank: 0 });
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
    setExisting(playerId ? getGameResult(playerId, "quiz") : null);
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
        try {
          const outcome = submitGameResult({ playerId, gameKey: "quiz", answers, score });
          refresh();
          setExisting(outcome.result);
          setModal({ open: true, score: outcome.result.score, total: outcome.player.totalScore, rank: outcome.rank });
        } catch {
          // 提交失败也不处理
        }
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
          try {
            const outcome = submitGameResult({ playerId, gameKey: "quiz", answers, score });
            refresh();
            setExisting(outcome.result);
            setModal({ open: true, score: outcome.result.score, total: outcome.player.totalScore, rank: outcome.rank });
          } catch {
            // 提交失败也不处理
          }
        }
      }
    }
  }, [seconds]); // 简化依赖数组，只监听 seconds

  if (isOpen === false) {
    return (
      <Layout title="Quick Quiz" eyebrow="GAME 02">
        <section className="statusBanner">该游戏已关闭，请等待现场主持人开启。</section>
        <button className="primaryButton" type="button" onClick={() => router.push("/lobby")}>
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

  function submit() {
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
      const outcome = submitGameResult({ playerId, gameKey: "quiz", answers, score });
      refresh();
      setExisting(outcome.result);
      setModal({ open: true, score: outcome.result.score, total: outcome.player.totalScore, rank: outcome.rank });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交失败");
    }
  }

  return (
    <Layout title="Quick Quiz" eyebrow="GAME 02">
      <Countdown seconds={seconds} total={QUIZ_SECONDS} />
      {existing && <section className="statusBanner">该游戏已完成，本关得分 {existing.score}，不能重复提交。</section>}
      {currentQuestion && (
        <section className="questionStack">
          <article className="questionCard">
            <span>Q{currentIndex + 1} / {questions.length}</span>
            <h3>{currentQuestion.title}</h3>
            <div className="optionGrid">
              {currentQuestion.options?.map((option) => (
                <button className={selectedAnswer === option ? "selected" : ""} disabled={Boolean(existing) || isOpen !== true || seconds === 0} key={option} type="button" onClick={() => chooseAnswer(option)}>
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
      <ResultModal open={modal.open} gameName="Quick Quiz" roundScore={modal.score} totalScore={modal.total} rank={modal.rank} onBackLobby={() => router.push("/lobby")} />
    </Layout>
  );
}
