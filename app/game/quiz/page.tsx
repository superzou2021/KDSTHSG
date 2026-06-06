"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import GameBannerIcon from "@/components/GameBannerIcon";
import Layout from "@/components/Layout";
import PageBackground from "@/components/PageBackground";
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

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function QuizNav() {
  return (
    <header className="quizNav">
      <Link className="quizNavLink" href="/lobby">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
          <path
            opacity="0.9"
            d="M0.513405 0.994867H9.4866C9.77058 0.994867 10 0.772058 10 0.497434C10 0.222938 9.77071 0 9.4866 0H0.513405C0.229945 0 0 0.222809 0 0.497434C0 0.772058 0.229945 0.994867 0.513405 0.994867ZM9.48646 3.48203H0.513405C0.229294 3.48203 0 3.70484 0 3.97947C0 4.25409 0.229294 4.4769 0.513405 4.4769H9.4866C9.77058 4.4769 10 4.25409 10 3.97947C9.99987 3.70484 9.76914 3.48203 9.48646 3.48203ZM9.48646 7.00513H0.513405C0.230075 7.00513 0 7.22794 0 7.50257C0 7.77719 0.229945 8 0.513405 8H9.4866C9.77058 8 10 7.77719 10 7.50257C9.99987 7.22807 9.77058 7.00513 9.48646 7.00513Z"
            fill="white"
          />
        </svg>
        活动大厅
      </Link>
      <h1>Sector Quiz</h1>
      <Link className="quizNavLink" href="/ranking">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="11" viewBox="0 0 12 11" fill="none" aria-hidden="true">
          <path
            opacity="0.9"
            d="M6.5364 9.64627H5.41762C5.1141 9.64628 4.8229 9.52509 4.60756 9.30916C4.39222 9.09322 4.27022 8.80007 4.2682 8.49367V1.16034C4.2682 0.852597 4.3893 0.557461 4.60486 0.339855C4.82042 0.12225 5.11278 0 5.41762 0H6.5364C6.84124 0 7.13361 0.12225 7.34916 0.339855C7.56472 0.557461 7.68582 0.852597 7.68582 1.16034V8.49367C7.6838 8.80007 7.56181 9.09322 7.34647 9.30916C7.13113 9.52509 6.83992 9.64628 6.5364 9.64627ZM5.41762 0.773558C5.31601 0.773558 5.21856 0.814308 5.1467 0.886843C5.07485 0.959379 5.03448 1.05776 5.03448 1.16034V8.49367C5.03447 8.54411 5.04443 8.59404 5.06378 8.64053C5.08313 8.68703 5.11147 8.72917 5.14715 8.76447C5.18284 8.79977 5.22514 8.82753 5.27158 8.84611C5.31802 8.8647 5.36767 8.87374 5.41762 8.87271H6.5364C6.6367 8.87274 6.73301 8.83305 6.80465 8.76218C6.87628 8.69131 6.91753 8.5949 6.91954 8.49367V1.16034C6.91758 1.05838 6.87658 0.961145 6.80515 0.889035C6.73372 0.816924 6.6374 0.775539 6.5364 0.773558H5.41762ZM2.2682 9.64627H1.14943C0.845902 9.64628 0.554696 9.52509 0.339356 9.30916C0.124016 9.09322 0.00202349 8.80007 0 8.49367V6.46695C0 6.15921 0.1211 5.86407 0.336659 5.64647C0.552218 5.42886 0.844579 5.30661 1.14943 5.30661H2.2682C2.57305 5.30661 2.86541 5.42886 3.08097 5.64647C3.29652 5.86407 3.41762 6.15921 3.41762 6.46695V8.53235C3.40574 8.83197 3.27942 9.11532 3.06513 9.32299C2.85085 9.53066 2.56524 9.64651 2.2682 9.64627ZM1.14943 6.04149C1.04781 6.04149 0.950356 6.08224 0.878503 6.15478C0.80665 6.22731 0.766283 6.32569 0.766283 6.42827V8.49367C0.766273 8.54411 0.776233 8.59404 0.79558 8.64053C0.814927 8.68703 0.843272 8.72917 0.878954 8.76447C0.914636 8.79977 0.956938 8.82753 1.00338 8.84611C1.04982 8.8647 1.09948 8.87374 1.14943 8.87271H2.2682C2.31815 8.87374 2.3678 8.8647 2.41424 8.84611C2.46069 8.82753 2.50299 8.79977 2.53867 8.76447C2.57435 8.72917 2.6027 8.68703 2.62204 8.64053C2.64139 8.59404 2.65135 8.54411 2.65134 8.49367V6.46695C2.65134 6.36437 2.61097 6.26599 2.53912 6.19345C2.46727 6.12092 2.36981 6.08017 2.2682 6.08017L1.14943 6.04149ZM10.8506 9.64627H9.7318C9.42828 9.64628 9.13707 9.52509 8.92173 9.30916C8.70639 9.09322 8.5844 8.80007 8.58238 8.49367V4.68776C8.58438 4.38065 8.70613 4.08669 8.92125 3.86952C9.13638 3.65235 9.42757 3.52945 9.7318 3.52743H10.8506C11.1554 3.52743 11.4478 3.64968 11.6633 3.86728C11.8789 4.08489 12 4.38002 12 4.68776V8.49367C11.998 8.80007 11.876 9.09322 11.6606 9.30916C11.4453 9.52509 11.1541 9.64628 10.8506 9.64627ZM9.7318 4.30098C9.6308 4.30297 9.53448 4.34435 9.46305 4.41646C9.39162 4.48857 9.35062 4.5858 9.34866 4.68776V8.49367C9.35067 8.5949 9.39192 8.69131 9.46355 8.76218C9.53519 8.83305 9.6315 8.87274 9.7318 8.87271H10.8506C10.9005 8.87374 10.9502 8.8647 10.9966 8.84611C11.0431 8.82753 11.0854 8.79977 11.121 8.76447C11.1567 8.72917 11.1851 8.68703 11.2044 8.64053C11.2238 8.59404 11.2337 8.54411 11.2337 8.49367V4.68776C11.2337 4.58518 11.1933 4.4868 11.1215 4.41427C11.0496 4.34173 10.9522 4.30098 10.8506 4.30098H9.7318ZM11.6169 11H0.383142C0.281526 11 0.184073 10.9593 0.11222 10.8867C0.0403666 10.8142 0 10.7158 0 10.6132C0 10.5106 0.0403666 10.4123 0.11222 10.3397C0.184073 10.2672 0.281526 10.2264 0.383142 10.2264H11.6169C11.7185 10.2264 11.8159 10.2672 11.8878 10.3397C11.9596 10.4123 12 10.5106 12 10.6132C12 10.7158 11.9596 10.8142 11.8878 10.8867C11.8159 10.9593 11.7185 11 11.6169 11Z"
            fill="white"
          />
        </svg>
        排行榜
      </Link>
    </header>
  );
}

function QuizShell({ children }: { children: ReactNode }) {
  return (
    <Layout title="Sector Quiz" hideHeader>
      <section className="quizPage">
        <PageBackground />
        <div className="quizPageContent">
          <QuizNav />
          {children}
        </div>
      </section>
    </Layout>
  );
}

type QuizTimerProps = {
  seconds: number;
  total: number;
  answeredCount: number;
  totalQuestions: number;
};

function QuizTimer({ seconds, total, answeredCount, totalQuestions }: QuizTimerProps) {
  const percent = total > 0 ? Math.max(0, Math.min(100, (seconds / total) * 100)) : 0;

  return (
    <div className="quizTimer">
      <div className="quizTimerMeta">
        <span>{answeredCount}/{totalQuestions}</span>
        <span className="quizTimerClock">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8.5" r="6.5" stroke="white" strokeWidth="1.2" />
            <path d="M8 5.5V8.5L10 10" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          {formatTimer(seconds)}
        </span>
      </div>
      <div className="quizTimerTrack">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
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
  const answeredCount = activeSector ? Object.keys(answers).length : 0;

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
      <QuizShell>
        <section className="quizStatusCard">
          <p className="quizStatusMessage">正在跳转...</p>
        </section>
      </QuizShell>
    );
  }

  if (stateLoading || playerId === undefined) {
    return (
      <QuizShell>
        <section className="quizStatusCard">
          <p className="quizStatusMessage">正在同步 Quiz 状态...</p>
        </section>
      </QuizShell>
    );
  }

  if (!quizIsOpen) {
    return (
      <QuizShell>
        <section className="quizStatusCard">
          <p className="quizStatusMessage">Quiz 尚未开放</p>
        </section>
        <button className="quizBackButton" type="button" onClick={goLobby}>
          返回活动大厅
        </button>
      </QuizShell>
    );
  }

  if (activeSector && currentQuestion) {
    const isLastQuestion = currentQuestionIndex === activeSector.questions.length - 1;
    const submitLabel = submitting ? "提交中..." : isLastQuestion ? "提交本组" : "继续";

    return (
      <QuizShell>
        <div className="quizPlayHeader">
          <h2>{activeSector.sectorName}</h2>
          <p>题目{currentQuestionIndex + 1}/{activeSector.questions.length}</p>
        </div>

        <QuizTimer
          answeredCount={answeredCount}
          seconds={seconds}
          total={GROUP_SECONDS}
          totalQuestions={activeSector.questions.length}
        />

        <section className="quizQuestionCard">
          <h3>{currentQuestion.title}</h3>
          <div className="quizOptions">
            {currentQuestion.options?.map((option, index) => (
              <button
                className={selectedAnswer === option ? "selected" : ""}
                disabled={submitting}
                key={option}
                type="button"
                onClick={() => chooseAnswer(option)}
              >
                {String.fromCharCode(65 + index)}. {option}
              </button>
            ))}
          </div>
        </section>

        <section className="quizHintCard">
          <b>本组已选择 {answeredCount}/{activeSector.questions.length}</b>
          <span>{message || "选择答案后继续，倒计时结束会自动提交本组答案"}</span>
        </section>

        <button
          className="quizBackButton"
          disabled={submitting || !selectedAnswer}
          type="button"
          onClick={goNext}
        >
          {submitLabel}
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
      </QuizShell>
    );
  }

  return (
    <QuizShell>
      <div className="quizBanner">
        <div className="quizBannerText">
          <Image
            alt="Sector Quiz"
            className="quizBannerTitle"
            height={20}
            src="/image/source/quiz/quiz-title.png"
            width={147}
          />
          <p>Quiz总进度已完成{completedCount}/{TOTAL_GROUPS}  当前Quiz得分{quizTotalScore}/100</p>
        </div>
        <GameBannerIcon
          className="quizBannerLogo"
          src="/image/source/quiz/quiz-cube.png"
          width={67}
          height={67}
          left={17}
          offsetY={9}
          containerSize={96}
          reflectionHeight={76}
          reflectionOverlap={12}
        />
      </div>

      <section className="quizSectorCard">
        {quizSectors.map((sector) => {
          const status = sector.result ? "已完成" : sector.isOpen ? "可答题" : "未开放";
          return (
            <div className="quizSectorRow" key={sector.index}>
              <div className="quizSectorInfo">
                <b>{sector.sectorName}</b>
                <div className="quizSectorMeta">
                  <span>状态：{status}</span>
                  <span>题目数：{sector.questions.length}/2</span>
                </div>
              </div>
              {sector.result ? (
                <button className="quizSectorAction quizSectorAction--ghost" disabled type="button">
                  已完成
                </button>
              ) : sector.isOpen ? (
                <button className="quizSectorAction quizSectorAction--primary" type="button" onClick={() => startSector(sector.index)}>
                  进入答题
                </button>
              ) : (
                <button className="quizSectorAction quizSectorAction--ghost" disabled type="button">
                  等待主持人开启
                </button>
              )}
            </div>
          );
        })}
      </section>

      <button className="quizBackButton" type="button" onClick={goLobby}>
        返回活动大厅
      </button>
    </QuizShell>
  );
}
