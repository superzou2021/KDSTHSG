"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Countdown from "@/components/Countdown";
import Layout from "@/components/Layout";
import ResultModal from "@/components/ResultModal";
import QuizStartModal from "@/components/QuizStartModal";
import { calculateQuizScore } from "@/lib/scoring";
import { getGameResult } from "@/lib/storage";
import { useAppState, useCurrentPlayer, useGameStatus, useQuestions, useSubmitGameResult } from "@/hooks/use-game-data";

const GROUP_SECONDS = 60; // 每组1分钟
const TOTAL_GROUPS = 5; // 共5个板块
const QUESTIONS_PER_GROUP = 2; // 每板块2题

export default function QuizPage() {
  const router = useRouter();
  const { playerId, refresh } = useCurrentPlayer();
  const questions = useQuestions("quiz");
  const submitGameResult = useSubmitGameResult();
  const isOpen = useGameStatus("quiz");
  const { state } = useAppState();
  const quizGame = state.games.find(g => g.key === "quiz");
  const quizIsOpen = Boolean(quizGame?.isOpen || isOpen === true);
  const currentGroup = quizGame?.quizCurrentGroup || 0;
  
  const [hasStarted, setHasStarted] = useState(false);
  const [localGroupIndex, setLocalGroupIndex] = useState(0);
  const [questionIndexInGroup, setQuestionIndexInGroup] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [seconds, setSeconds] = useState(GROUP_SECONDS);
  const [existing, setExisting] = useState<Awaited<ReturnType<typeof getGameResult>>>(null);
  const [existingLoading, setExistingLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, score: 0, total: 0, rank: 0 });
  const [isLeaving, setIsLeaving] = useState(false);
  const [message, setMessage] = useState("");
  const [waitingForNextGroup, setWaitingForNextGroup] = useState(false);
  const [showStartModal, setShowStartModal] = useState(true);

  // 计算当前题目的索引
  const currentQuestionIndex = localGroupIndex * QUESTIONS_PER_GROUP + questionIndexInGroup;
  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : "";
  
  // 计算正确数和分数
  const correctCount = useMemo(() => questions.filter((question) => answers[question.id] === question.correctAnswer).length, [answers, questions]);
  const score = calculateQuizScore(correctCount);

  // 检查是否完成当前组
  const isGroupComplete = (questionIndexInGroup + 1) >= QUESTIONS_PER_GROUP;
  // 检查是否是最后一组
  const isLastGroup = localGroupIndex >= TOTAL_GROUPS - 1;

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

  // 监听后台的板块更新
  useEffect(() => {
    if (!hasStarted) return;
    // 当后台更新了板块且本地还没到那个板块时，更新本地并重置等待状态
    if (currentGroup > localGroupIndex) {
      setLocalGroupIndex(currentGroup);
      setQuestionIndexInGroup(0);
      setWaitingForNextGroup(false);
      setSeconds(GROUP_SECONDS);
    }
  }, [currentGroup, localGroupIndex, hasStarted]);

  // 倒计时逻辑
  useEffect(() => {
    if (!hasStarted || waitingForNextGroup || modal.open || existing || !quizIsOpen) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [hasStarted, waitingForNextGroup, modal.open, existing, quizIsOpen]);

  // 时间到逻辑
  useEffect(() => {
    if (seconds > 0 || !hasStarted || waitingForNextGroup || modal.open || existing || !quizIsOpen) return;
    
    if (isLastGroup && isGroupComplete) {
      submitAllAnswers();
    } else {
      // 进入等待状态
      setWaitingForNextGroup(true);
      setMessage("等待后台开启下一板块...");
    }
  }, [seconds, hasStarted, waitingForNextGroup, modal.open, existing, quizIsOpen, isLastGroup, isGroupComplete]);

  const shouldLeaveClosedGame = isOpen === false && !quizGame?.isOpen && !existingLoading && !existing && !modal.open;

  function goLobby() {
    setIsLeaving(true);
    router.push("/lobby");
  }

  async function handleStart() {
    setShowStartModal(false);
    setHasStarted(true);
  }

  function chooseAnswer(option: string) {
    if (!currentQuestion || !quizIsOpen || existing || waitingForNextGroup || !hasStarted) return;
    setAnswers((current) => ({ ...current, [currentQuestion.id]: option }));
    setMessage("");
  }

  function goNext() {
    if (!selectedAnswer) {
      setMessage("请先选择本题答案");
      return;
    }
    if (isGroupComplete) {
      if (isLastGroup) {
        submitAllAnswers();
      } else {
        setWaitingForNextGroup(true);
        setMessage("等待后台开启下一板块...");
      }
    } else {
      setQuestionIndexInGroup((prev) => prev + 1);
    }
  }

  async function submitAllAnswers() {
    if (!playerId) return;
    try {
      const outcome = await submitGameResult({ playerId, gameKey: "quiz", answers, score });
      refresh();
      setExisting(outcome.result);
      setModal({ open: true, score: outcome.result.score, total: outcome.player.totalScore, rank: outcome.rank });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交失败");
    }
  }

  if (isLeaving) {
    return (
      <Layout title="Sector Quiz" eyebrow="GAME 02">
        <section className="statusBanner">正在跳转...</section>
      </Layout>
    );
  }

  if (shouldLeaveClosedGame) {
    return (
      <Layout title="Sector Quiz" eyebrow="GAME 02">
        <section className="statusBanner">游戏加载中,请耐心等待</section>
        <button className="primaryButton" type="button" onClick={goLobby}>
          回到大厅
        </button>
      </Layout>
    );
  }

  return (
    <Layout title="Sector Quiz" eyebrow="GAME 02">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '64px', marginBottom: '8px' }}>⚡</div>
        <h2 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, background: 'linear-gradient(90deg, #40d88a, #00b86a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Sector Quiz
        </h2>
        <p style={{ color: 'var(--ink)', margin: '8px 0 0 0', fontSize: '14px' }}>第 {localGroupIndex + 1} 板块 / 共 {TOTAL_GROUPS} 板块</p>
      </div>

      {hasStarted && !waitingForNextGroup && <Countdown seconds={seconds} total={GROUP_SECONDS} currentIndex={currentQuestionIndex} totalQuestions={TOTAL_GROUPS * QUESTIONS_PER_GROUP} />}

      {!existingLoading && existing && <section className="statusBanner">该游戏已完成，本关得分 {existing.score}，不能重复提交</section>}

      {hasStarted && currentQuestion && !waitingForNextGroup && (
        <section className="questionStack">
          <article className="questionCard" style={{ padding: '24px 20px' }}>
            <h3 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 20px 0', lineHeight: '1.4' }}>
              第 {questionIndexInGroup + 1} 题：{currentQuestion.title}
            </h3>
            <div className="optionGrid" style={{ gap: '12px' }}>
              {currentQuestion.options?.map((option, idx) => (
                <button
                  className={selectedAnswer === option ? "selected" : ""}
                  disabled={Boolean(existing) || !quizIsOpen || waitingForNextGroup || !hasStarted}
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

      {waitingForNextGroup && (
        <section className="statusBanner" style={{ margin: '20px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p>本板块已完成！</p>
          <p style={{ color: 'var(--muted)', marginTop: '8px' }}>{message}</p>
        </section>
      )}

      {hasStarted && !waitingForNextGroup && (
        <section className="statusPanel">
          <b>已完成 {Object.keys(answers).length}/{TOTAL_GROUPS * QUESTIONS_PER_GROUP}</b>
          <span>{message || "选择答案后点击继续"}</span>
        </section>
      )}

      {hasStarted && !waitingForNextGroup && currentQuestion && (
        <button className="primaryButton" disabled={Boolean(existing) || !quizIsOpen || !selectedAnswer} type="button" onClick={goNext}>
          {isGroupComplete && isLastGroup ? "提交成绩" : isGroupComplete ? "完成本板块" : "继续"}
        </button>
      )}

      <QuizStartModal
        open={showStartModal && !existing && quizIsOpen}
        onStart={handleStart}
      />

      <ResultModal
        open={modal.open}
        gameName="Sector Quiz"
        roundScore={modal.score}
        totalScore={modal.total}
        rank={modal.rank}
        onBackLobby={goLobby}
      />
    </Layout>
  );
}
