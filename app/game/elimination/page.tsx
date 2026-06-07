"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import GameBannerIcon from "@/components/GameBannerIcon";
import Layout from "@/components/Layout";
import PageBackground from "@/components/PageBackground";
import EliminationModal from "@/components/EliminationModal";
import ResultModal from "@/components/ResultModal";
import { calculateEliminationScore } from "@/lib/scoring";
import { getGameResult } from "@/lib/storage";
import { useCurrentPlayer, useGameStatus, useQuestions, useRanking, useSubmitGameResult } from "@/hooks/use-game-data";

function EliminationNav() {
  return (
    <header className="eliminationNav">
      <Link className="eliminationNavLink" href="/lobby">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
          <path
            opacity="0.9"
            d="M0.513405 0.994867H9.4866C9.77058 0.994867 10 0.772058 10 0.497434C10 0.222938 9.77071 0 9.4866 0H0.513405C0.229945 0 0 0.222809 0 0.497434C0 0.772058 0.229945 0.994867 0.513405 0.994867ZM9.48646 3.48203H0.513405C0.229294 3.48203 0 3.70484 0 3.97947C0 4.25409 0.229294 4.4769 0.513405 4.4769H9.4866C9.77058 4.4769 10 4.25409 10 3.97947C9.99987 3.70484 9.76914 3.48203 9.48646 3.48203ZM9.48646 7.00513H0.513405C0.230075 7.00513 0 7.22794 0 7.50257C0 7.77719 0.229945 8 0.513405 8H9.4866C9.77058 8 10 7.77719 10 7.50257C9.99987 7.22807 9.77058 7.00513 9.48646 7.00513Z"
            fill="white"
          />
        </svg>
        活动大厅
      </Link>
      <h1>站立淘汰</h1>
      <Link className="eliminationNavLink" href="/ranking">
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

function EliminationShell({ children }: { children: ReactNode }) {
  return (
    <Layout title="站立淘汰" hideHeader>
      <section className="eliminationPage">
        <PageBackground />
        <div className="eliminationPageContent">
          <EliminationNav />
          <div className="eliminationBanner">
            <GameBannerIcon
              className="eliminationBannerLogo"
              src="/image/source/lobby/game-elimination.png"
              width={64}
              height={78}
              left={20}
              offsetY={13}
              showReflection={false}
            />
            <Image
              className="eliminationBannerTitle"
              src="/image/source/elimination/elimination-title.png"
              alt="站立淘汰"
              width={85}
              height={20}
            />
            <p>Last one standing wins</p>
          </div>
          {children}
        </div>
      </section>
    </Layout>
  );
}

export default function EliminationPage() {
  const router = useRouter();
  const { playerId, refresh, player } = useCurrentPlayer();
  const { ranking } = useRanking(playerId);
  const questions = useQuestions("elimination");
  const submitGameResult = useSubmitGameResult();
  const isOpen = useGameStatus("elimination");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [existing, setExisting] = useState<Awaited<ReturnType<typeof getGameResult>>>(null);
  const [existingLoading, setExistingLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, score: 0, total: 0, rank: 0, isEliminated: false });
  const [eliminationModal, setEliminationModal] = useState({ open: false, score: 0 });
  const [message, setMessage] = useState("");
  const [isLeaving, setIsLeaving] = useState(false);

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

  function goLobby() {
    setIsLeaving(true);
    router.push("/lobby");
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
        setEliminationModal({ open: true, score: newScore });
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
    setEliminationModal({ open: false, score: 0 });
    setMessage("");
  }

  if (isLeaving) {
    return (
      <EliminationShell>
        <section className="eliminationStatusCard">
          <p className="eliminationStatusMessage">正在跳转...</p>
        </section>
      </EliminationShell>
    );
  }

  if (isOpen === false) {
    return (
      <EliminationShell>
        <section className="eliminationStatusCard">
          <p className="eliminationStatusMessage">游戏加载中，请耐心等待</p>
        </section>
        <button className="eliminationNextButton" type="button" onClick={goLobby}>
          回到大厅
        </button>
      </EliminationShell>
    );
  }

  if (existingLoading) {
    return (
      <EliminationShell>
        <section className="eliminationStatusCard">
          <p className="eliminationStatusMessage">游戏加载中，请耐心等待</p>
        </section>
      </EliminationShell>
    );
  }

  return (
    <EliminationShell>
      {!existingLoading && existing && (
        <section className="eliminationStatusCard">
          <p className="eliminationStatusMessage">该游戏已完成，本关得分 {existing.score}，不能重复提交。</p>
        </section>
      )}

      {currentQuestion && !eliminationModal.open && (
        <section className="eliminationQuestionCard">
          <h3>
            Round{currentIndex + 1}：{currentQuestion.title}
          </h3>
          <div className="eliminationOptions">
            {currentQuestion.options?.map((option) => (
              <button
                className={selectedAnswer === option ? "selected" : ""}
                disabled={Boolean(existing) || isOpen !== true}
                key={option}
                type="button"
                onClick={() => chooseAnswer(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="eliminationHintCard">
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
        eliminationModalStyle={modal.isEliminated ? "wrong" : "standard"}
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
        roundScore={eliminationModal.score}
        totalScore={player?.totalScore ?? 0}
        rank={ranking.context?.rank ?? 0}
        onNext={goNext}
      />
    </EliminationShell>
  );
}
