"use client";

import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { GAME_ORDER } from "@/lib/constants";
import { loadState, resetDemoData } from "@/lib/storage";
import { useAdminActions, useAppState } from "@/hooks/use-game-data";
import type { GameKey } from "@/types";

const QUIZ_SECTOR_COUNT = 5;

function getQuizSessionIndex(question: any): number {
  if (Number.isInteger(question.quizSessionIndex)) {
    return question.quizSessionIndex as number;
  }
  return Math.max(0, Math.min(QUIZ_SECTOR_COUNT - 1, Math.floor((Math.max(1, question.order) - 1) / 2)));
}

function getSectorName(index: number, questions: any[]): string {
  return questions.find((question) => question.sectorName)?.sectorName || `Sector ${index + 1}`;
}

export default function AdminControlPage() {
  const { state, refresh } = useAppState();
  const {
    toggleGameOpen,
    triggerBingoScore,
    closeBingoGame,
    openQuizGroup,
    closeQuizGroup
  } = useAdminActions();
  const [exportText, setExportText] = useState("");

  const completion = useMemo(() => {
    return GAME_ORDER.map((key) => ({
      key,
      count: state.gameResults.filter((result) => result.gameKey === key).length
    }));
  }, [state.gameResults]);

  const bingoGame = state.games.find((game) => game.key === "bingo");
  const bingoPhase = bingoGame?.bingoPhase || "open";
  const bingoCompletionCount = completion.find((item) => item.key === "bingo")?.count || 0;
  const pendingBingoCount = state.gameResults.filter((result) => result.gameKey === "bingo" && result.pendingBingoScore).length;

  const quizGame = state.games.find((game) => game.key === "quiz");
  const quizOpenGroups = quizGame?.quizOpenGroups || [];

  const quizSectors = useMemo(() => {
    const activeQuizQuestions = state.questions
      .filter((question) => question.gameKey === "quiz" && question.isActive === true)
      .map((question) => ({
        ...question,
        quizSessionIndex: getQuizSessionIndex(question)
      }));

    return Array.from({ length: QUIZ_SECTOR_COUNT }, (_, index) => {
      const questions = activeQuizQuestions
        .filter((question) => question.quizSessionIndex === index)
        .sort((a, b) => a.order - b.order);
      const completedPlayers = new Set(
        state.gameResults
          .filter((result) => (
            result.gameKey === "quiz" &&
            (Number.isInteger(result.quizSessionIndex) ? result.quizSessionIndex : 0) === index
          ))
          .map((result) => result.player)
      );

      return {
        index,
        sectorName: getSectorName(index, questions),
        questions,
        isOpen: quizOpenGroups.includes(index),
        completedCount: completedPlayers.size
      };
    });
  }, [quizOpenGroups, state.gameResults, state.questions]);

  async function refreshMultiple(times: number = 3) {
    for (let i = 0; i < times; i++) {
      await refresh();
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  async function handleToggle(key: GameKey) {
    const nextState = await toggleGameOpen(key);
    const game = nextState.games.find((item) => item.key === key);
    setExportText(`${game?.name || key} 已${game?.isOpen ? "开启" : "关闭"}`);
    await refreshMultiple();
  }

  async function handleBingoScore() {
    try {
      await triggerBingoScore();
      setExportText(`已完成 Boss 发言，开启自动判分模式。本次结算 ${pendingBingoCount} 名等待用户。`);
      await refreshMultiple();
    } catch (error) {
      setExportText(error instanceof Error ? `操作失败：${error.message}` : "操作失败");
    }
  }

  async function handleCloseBingo() {
    try {
      await closeBingoGame();
      setExportText("Bingo 已完全关闭，未完成用户不可再进入。");
      await refreshMultiple();
    } catch (error) {
      setExportText(error instanceof Error ? `关闭失败：${error.message}` : "关闭失败");
    }
  }

  async function handleOpenQuizSector(index: number) {
    try {
      await openQuizGroup(index);
      setExportText(`已开启 Sector ${index + 1}`);
      await refreshMultiple();
    } catch (error) {
      setExportText(error instanceof Error ? `开启失败：${error.message}` : "开启失败");
    }
  }

  async function handleCloseQuizSector(index: number) {
    try {
      await closeQuizGroup(index);
      setExportText(`已关闭 Sector ${index + 1}`);
      await refreshMultiple();
    } catch (error) {
      setExportText(error instanceof Error ? `关闭失败：${error.message}` : "关闭失败");
    }
  }

  async function handleExport() {
    const state = await loadState();
    setExportText(JSON.stringify(state, null, 2));
  }

  async function handleReset() {
    await resetDemoData();
    setExportText("");
    await refreshMultiple();
  }

  return (
    <Layout title="现场控制台" eyebrow="ADMIN CONTROL">
      <section className="scoreGrid">
        <div>
          <span>参与人数</span>
          <b>{state.players.length}</b>
        </div>
        <div>
          <span>结果记录</span>
          <b>{state.gameResults.length}</b>
        </div>
        <div>
          <span>已完成</span>
          <b>{state.players.filter((player) => player.finalSubmitted).length}</b>
        </div>
      </section>

      <section className="sectionBlock">
        <h2>游戏开关</h2>
        <div className="adminList">
          {[...state.games].sort((a, b) => a.order - b.order).map((game) => (
            <div className="adminRow" key={game.key}>
              <div>
                <b>{game.name}</b>
                <span>
                  当前状态：{game.isOpen ? "开放中" : "已关闭"} / 完成人数{" "}
                  {completion.find((item) => item.key === game.key)?.count || 0}
                </span>
              </div>
              <button
                className={game.isOpen ? "primaryButton smallButton" : "secondaryButton smallButton"}
                type="button"
                onClick={() => handleToggle(game.key)}
              >
                {game.isOpen ? "点击关闭" : "点击开启"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="sectionBlock">
        <h2>Bingo 控制</h2>
        <div className="adminRow" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <b>当前阶段</b>
            <span>
              {bingoPhase === "open" && "正常开放，提交后等待 Boss 判分"}
              {bingoPhase === "auto_score" && "自动判分，未完成用户提交后立即得分"}
              {bingoPhase === "closed" && "已完全关闭，未完成用户不可进入"}
              {" / 完成 "}{bingoCompletionCount}{" 人 / 等待判分 "}{pendingBingoCount}{" 人"}
            </span>
          </div>
        </div>
        <div className="adminRow" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <b>完成 Boss 发言并开启自动判分</b>
            <span>结算所有等待用户，后续未完成用户可继续提交并立即判分</span>
          </div>
          <button
            className="primaryButton smallButton"
            type="button"
            disabled={bingoPhase !== "open"}
            onClick={handleBingoScore}
          >
            {bingoPhase === "open" ? "触发判分" : bingoPhase === "auto_score" ? "已开启自动判分" : "已关闭"}
          </button>
        </div>
        <div className="adminRow" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <b>完全关闭 Bingo</b>
            <span>关闭后未完成用户不能再进入或提交</span>
          </div>
          <button
            className="secondaryButton smallButton"
            type="button"
            disabled={bingoPhase === "closed"}
            onClick={handleCloseBingo}
          >
            {bingoPhase === "closed" ? "已关闭" : "完全关闭"}
          </button>
        </div>
      </section>

      <section className="sectionBlock">
        <h2>Sector Quiz 控制</h2>
        <div className="adminList" style={{ marginTop: 16 }}>
          {quizSectors.map((sector) => (
            <div key={sector.index} style={{ marginBottom: 16 }}>
              <div className="adminRow" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <b>{sector.sectorName}</b>
                  <span>当前状态：{sector.isOpen ? "已开启" : "未开启"} / 已完成人数：{sector.completedCount}</span>
                </div>
              </div>

              {sector.questions.length > 0 && (
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {sector.questions.map((question, questionIndex) => (
                    <div key={question.id} style={{ padding: 8, borderRadius: 4, background: "rgba(64, 216, 138, 0.08)", border: "1px solid rgba(64, 216, 138, 0.15)" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600 }}>题目 {questionIndex + 1}：</span>
                      <span style={{ fontSize: "14px", color: "var(--ink)" }}>{question.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {sector.questions.length === 0 && (
                <div style={{ padding: "12px 16px", color: "var(--ink)" }}>
                  <span>暂无题目，请检查 questions 数据是否设置 gameKey=quiz 且 isActive=true。</span>
                </div>
              )}

              <div className="adminRow" style={{ justifyContent: "flex-end", alignItems: "center" }}>
                <div className="pageActions" style={{ marginTop: 0 }}>
                  <button
                    className="primaryButton smallButton"
                    type="button"
                    disabled={sector.isOpen}
                    onClick={() => handleOpenQuizSector(sector.index)}
                  >
                    开启此 Sector
                  </button>
                  <button
                    className="secondaryButton smallButton"
                    type="button"
                    disabled={!sector.isOpen}
                    onClick={() => handleCloseQuizSector(sector.index)}
                  >
                    关闭此 Sector
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="sectionBlock">
        <h2>数据导出</h2>
        <div className="pageActions">
          <button className="primaryButton" type="button" onClick={handleExport}>
            生成 JSON
          </button>
          <button className="secondaryButton" type="button" onClick={handleReset}>
            重置 DEMO 数据
          </button>
        </div>
        {exportText && <textarea className="exportBox" value={exportText} readOnly />}
      </section>
    </Layout>
  );
}
