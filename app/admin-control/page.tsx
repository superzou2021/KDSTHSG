"use client";

import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { GAME_ORDER } from "@/lib/constants";
import { loadState, resetDemoData } from "@/lib/storage";
import { useAdminActions, useAppState } from "@/hooks/use-game-data";
import type { GameKey } from "@/types";

export default function AdminControlPage() {
  const { state, refresh } = useAppState();
  const { toggleGameOpen, triggerBingoScore, closeBingoGame, advanceQuizGroup } = useAdminActions();
  const [exportText, setExportText] = useState("");

  const completion = useMemo(() => {
    return GAME_ORDER.map((key) => ({
      key,
      count: state.gameResults.filter((result) => result.gameKey === key).length
    }));
  }, [state.gameResults]);
  const bingoGame = state.games.find(g => g.key === "bingo");
  const bingoPhase = bingoGame?.bingoPhase || "open";
  const bingoCompletionCount = completion.find((item) => item.key === "bingo")?.count || 0;
  const pendingBingoCount = state.gameResults.filter((result) => result.gameKey === "bingo" && result.pendingBingoScore).length;
  const quizGame = state.games.find(g => g.key === "quiz");
  const quizCurrentGroup = quizGame?.quizCurrentGroup || 0;
  const quizCompleted = quizCurrentGroup >= 5; // 5个板块（每组2题）
  const quizCompletionCount = completion.find((item) => item.key === "quiz")?.count || 0;

  async function refreshMultiple(times: number = 3) {
    for (let i = 0; i < times; i++) {
      await refresh();
      await new Promise(resolve => setTimeout(resolve, 200));
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

  async function handleQuizNext() {
    try {
      await advanceQuizGroup();
      setExportText(`Sector Quiz 已进入第 ${quizCurrentGroup + 1} 板块！`);
      await refreshMultiple();
    } catch (error) {
      setExportText(error instanceof Error ? `Sector Quiz 操作失败：${error.message}` : "Sector Quiz 操作失败");
    }
  }

  async function handleExport() {
    const state = await loadState();
    setExportText(JSON.stringify(state, null, 2));
  }

  async function handleReset() {
    await resetDemoData();
    setExportText("");
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
          <span>已完赛</span>
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
        <div className="adminRow" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <b>当前阶段</b>
            <span>
              {bingoPhase === "open" && "正常开放（提交后等待 Boss 判分）"}
              {bingoPhase === "auto_score" && "自动判分（未完成用户提交后立即得分）"}
              {bingoPhase === "closed" && "已完全关闭（未完成用户不可进入）"}
              {" / 完成 "}{bingoCompletionCount}{" 人 / 等待判分 "}{pendingBingoCount}{" 人"}
            </span>
          </div>
        </div>
        <div className="adminRow" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
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
        <div className="adminRow" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
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
        <div className="adminRow" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <b>板块控制</b>
            <span>
              当前板块：第 {quizCurrentGroup + 1} 板块 / 完成人数 {quizCompletionCount}
            </span>
          </div>
          <button
            className="primaryButton smallButton"
            type="button"
            disabled={quizCompleted || !quizGame?.isOpen}
            onClick={handleQuizNext}
          >
            {quizCompleted ? "游戏完成" : "下一题组"}
          </button>
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
