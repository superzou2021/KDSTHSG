"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Countdown from "@/components/Countdown";
import Layout from "@/components/Layout";
import ResultModal from "@/components/ResultModal";
import { useAppState, useCurrentPlayer, useQuestions, useSubmitGameResult } from "@/hooks/use-game-data";
import type { Question } from "@/types";

const GROUP_SECONDS = 60;
const TOTAL_GROUPS = 5;

type QuizModalState = {
  open: boolean;
  roundScore: number;
  totalScore: number;
  rank: number;
  quizTotalScore: number;
  completedAll: boolean;
};

function getQuizSessionIndex(question: Question): number {
  if (Number.isInteger(question.quizSessionIndex)) {
    return question.quizSessionIndex as number;
  }
  return Math.max(0, Math.min(TOTAL_GROUPS - 1, Math.floor((Math.max(1, question.order) - 1) / 2)));
}

function getSectorName(index: number, questions: Question[]): string {
  return questions.find((question) => question.sectorName)?.sectorName || `Sector ${index + 1}`;
}

function isCorrectAnswer(question: Question, answer: string | undefined): boolean {
  if (!answer) return false;
  return Array.isArray(question.correctAnswer)
    ? question.correctAnswer.includes(answer)
    : question.correctAnswer === answer;
}

export default function QuizPage() {
  const router = useRouter();
  const { playerId, refresh: refreshPlayer } = useCurrentPlayer();
  const { state, refresh: refreshState, loading: stateLoading } = useAppState();
  const questions = useQuestions("quiz");
  const submitGameResult = useSubmitGameResult();

  const [activeSectorIndex, setActiveSectorIndex] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [seconds, setSeconds] = useState(GROUP_SECONDS);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [modal, setModal] = useState<QuizModalState>({
    open: false,
    roundScore: 0,
    totalScore: 0,
    rank: 0,
    quizTotalScore: 0,
    completedAll: false
  });

  const submittingRef = useRef(false);

  const quizGame = state.games.find((game) => game.key === "quiz");
  const quizIsOpen = Boolean(quizGame?.isOpen);
  const quizOpenGroups = quizGame?.quizOpenGroups || [];
  const playerQuizResults = useMemo(() => (
    state.gameResults.filter((result) => result.player === playerId && result.gameKey === "quiz")
  ), [playerId, state.gameResults]);

  const quizSectors = useMemo(() => {
    const activeQuestions = questions
      .filter((question) => question.gameKey === "quiz" && question.isActive === true)
      .map((question) => ({
        ...question,
        quizSessionIndex: getQuizSessionIndex(question)
      }));

    return Array.from({ length: TOTAL_GROUPS }, (_, index) => {
      const sectorQuestions = activeQuestions
        .filter((question) => question.quizSessionIndex === index)
        .sort((a, b) => a.order - b.order)
        .slice(0, 2);
      const result = playerQuizResults.find((item) => (
        (Number.isInteger(item.quizSessionIndex) ? item.quizSessionIndex : 0) === index
      ));

      return {
        index,
        sectorName: getSectorName(index, sectorQuestions),
        questions: sectorQuestions,
        isOpen: quizOpenGroups.includes(index),
        result
      };
    });
  }, [playerQuizResults, questions, quizOpenGroups]);

  const completedCount = quizSectors.filter((sector) => Boolean(sector.result)).length;
  const quizTotalScore = quizSectors.reduce((sum, sector) => sum + (sector.result?.score || 0), 0);
  const activeSector = activeSectorIndex === null ? null : quizSectors[activeSectorIndex];
  const currentQuestion = activeSector?.questions[currentQuestionIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : "";

  useEffect(() => {
    if (playerId === null) router.push("/register");
  }, [playerId, router]);

  useEffect(() => {
    if (activeSectorIndex === null || modal.open || submitting) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [activeSectorIndex, modal.open, submitting]);

  useEffect(() => {
    if (seconds > 0 || activeSectorIndex === null || modal.open || submittingRef.current) return;
    submitSector();
  }, [seconds, activeSectorIndex, modal.open]);

  function goLobby() {
    setIsLeaving(true);
    router.push("/lobby");
  }

  function closeModalAndRefresh() {
    setModal({
      open: false,
      roundScore: 0,
      totalScore: 0,
      rank: 0,
      quizTotalScore: 0,
      completedAll: false
    });
    submittingRef.current = false;
    setActiveSectorIndex(null);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSeconds(GROUP_SECONDS);
    refreshState();
    refreshPlayer();
  }

  function startSector(index: number) {
    const sector = quizSectors[index];
    if (!sector || sector.result || !sector.isOpen) return;
    setActiveSectorIndex(index);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSeconds(GROUP_SECONDS);
    setMessage("");
  }

  function chooseAnswer(option: string) {
    if (!currentQuestion || submitting) return;
    setAnswers((current) => ({ ...current, [currentQuestion.id]: option }));
    setMessage("");
  }

  function goNext() {
    if (!currentQuestion || !activeSector) return;
    if (!selectedAnswer) {
      setMessage("请先选择本题答案");
      return;
    }
    if (currentQuestionIndex < activeSector.questions.length - 1) {
      setCurrentQuestionIndex((index) => index + 1);
      return;
    }
    submitSector();
  }

  async function submitSector() {
    if (!playerId || !activeSector || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const sectorScore = activeSector.questions.reduce((sum, question) => (
        sum + (isCorrectAnswer(question, answers[question.id]) ? question.score : 0)
      ), 0);
      const outcome = await submitGameResult({
        playerId,
        gameKey: "quiz",
        answers,
        score: sectorScore,
        quizSessionIndex: activeSector.index,
        sectorKey: activeSector.questions[0]?.sectorKey || `sector-${activeSector.index + 1}`,
        sectorName: activeSector.sectorName
      });

      const completedGroups = new Set([
        ...playerQuizResults
          .map((result) => result.quizSessionIndex)
          .filter((index): index is number => Number.isInteger(index)),
        activeSector.index
      ]);
      const nextQuizTotalScore = quizTotalScore + outcome.result.score;
      const completedAll = completedGroups.size >= TOTAL_GROUPS;

      await refreshState();
      await refreshPlayer();
      setModal({
        open: true,
        roundScore: outcome.result.score,
        totalScore: outcome.player.totalScore,
        rank: outcome.rank,
        quizTotalScore: nextQuizTotalScore,
        completedAll
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "提交失败";
      setMessage(errMsg);
      // 提交失败时也弹出结算框，让用户知道倒计时已结束
      try {
        await refreshState();
        await refreshPlayer();
      } catch { /* ignore refresh error */ }
      setModal({
        open: true,
        roundScore: 0,
        totalScore: 0,
        rank: 0,
        quizTotalScore: 0,
        completedAll: false
      });
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }

  if (isLeaving) {
    return (
      <Layout title="Sector Quiz" eyebrow="GAME 02">
        <section className="statusBanner">正在跳转...</section>
      </Layout>
    );
  }

  if (stateLoading || playerId === undefined) {
    return (
      <Layout title="Sector Quiz" eyebrow="GAME 02">
        <section className="statusBanner">正在同步 Quiz 状态...</section>
      </Layout>
    );
  }

  if (!quizIsOpen) {
    return (
      <Layout title="Sector Quiz" eyebrow="GAME 02">
        <section className="statusBanner">Quiz 尚未开放</section>
        <button className="primaryButton" type="button" onClick={goLobby}>
          返回活动大厅
        </button>
      </Layout>
    );
  }

  if (activeSector && currentQuestion) {
    return (
      <Layout title="Sector Quiz" eyebrow="GAME 02">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 28, fontWeight: "bold", margin: 0 }}>{activeSector.sectorName}</h2>
          <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
            Sector {activeSector.index + 1} / 题目 {currentQuestionIndex + 1}/{activeSector.questions.length}
          </p>
        </div>

        <Countdown
          seconds={seconds}
          total={GROUP_SECONDS}
          currentIndex={currentQuestionIndex}
          totalQuestions={activeSector.questions.length}
        />

        <section className="questionStack">
          <article className="questionCard" style={{ padding: "24px 20px" }}>
            <h3 style={{ fontSize: 22, fontWeight: "bold", margin: "0 0 20px", lineHeight: 1.4 }}>
              {currentQuestion.title}
            </h3>
            <div className="optionGrid" style={{ gap: 12 }}>
              {currentQuestion.options?.map((option, index) => (
                <button
                  className={selectedAnswer === option ? "selected" : ""}
                  disabled={submitting}
                  key={option}
                  type="button"
                  onClick={() => chooseAnswer(option)}
                  style={{ padding: "14px 16px", fontSize: 16, textAlign: "left" }}
                >
                  <span style={{ fontWeight: "bold", marginRight: 8 }}>{String.fromCharCode(65 + index)}.</span>
                  {option}
                </button>
              ))}
            </div>
          </article>
        </section>

        <section className="statusPanel">
          <b>本组已选择 {Object.keys(answers).length}/{activeSector.questions.length}</b>
          <span>{message || "选择答案后继续，倒计时结束会自动提交本组答案"}</span>
        </section>

        <button className="primaryButton" disabled={submitting || !selectedAnswer} type="button" onClick={goNext}>
          {submitting ? "提交中..." : currentQuestionIndex === activeSector.questions.length - 1 ? "提交本组" : "继续"}
        </button>

        <ResultModal
          open={modal.open}
          gameName={modal.completedAll ? `Sector Quiz 已完成，本游戏总分 ${modal.quizTotalScore}/100` : `${activeSector.sectorName} 已完成`}
          roundScore={modal.completedAll ? modal.quizTotalScore : modal.roundScore}
          totalScore={modal.totalScore}
          rank={modal.rank}
          buttonText={modal.completedAll ? "返回大厅" : "确定"}
          onBackLobby={goLobby}
          onClose={modal.completedAll ? undefined : closeModalAndRefresh}
        />
      </Layout>
    );
  }

  return (
    <Layout title="Sector Quiz" eyebrow="GAME 02">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 32, fontWeight: "bold", margin: 0 }}>Sector Quiz</h2>
        <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
          Quiz 总进度：已完成 {completedCount}/{TOTAL_GROUPS} / 当前 Quiz 得分：{quizTotalScore}/100
        </p>
      </div>

      <section className="adminList">
        {quizSectors.map((sector) => {
          const status = sector.result ? "已完成" : sector.isOpen ? "可答题" : "未开放";
          return (
            <div className="adminRow" key={sector.index} style={{ alignItems: "center" }}>
              <div>
                <b>{sector.sectorName}</b>
                <span>
                  Sector {sector.index + 1} / 状态：{status}
                  {sector.result ? ` / 得分：${sector.result.score}` : ""}
                </span>
                <span>题目数：{sector.questions.length}/2</span>
              </div>
              {sector.result ? (
                <button className="secondaryButton smallButton" disabled type="button">
                  已完成
                </button>
              ) : sector.isOpen ? (
                <button className="primaryButton smallButton" type="button" onClick={() => startSector(sector.index)}>
                  进入答题
                </button>
              ) : (
                <button className="secondaryButton smallButton" disabled type="button">
                  等待主持人开启
                </button>
              )}
            </div>
          );
        })}
      </section>

      <button className="secondaryButton" type="button" onClick={goLobby} style={{ marginTop: 18 }}>
        返回活动大厅
      </button>
    </Layout>
  );
}
