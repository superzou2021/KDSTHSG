"use client";

import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { GAME_ORDER } from "@/lib/constants";
import { loadState, resetDemoData } from "@/lib/storage";
import { useAdminActions, useAppState } from "@/hooks/use-game-data";
import type { GameKey } from "@/types";

export default function AdminControlPage() {
  const { state, refresh } = useAppState();
  const { toggleGameOpen, triggerBingoScore } = useAdminActions();
  const [exportText, setExportText] = useState("");

  const completion = useMemo(() => {
    return GAME_ORDER.map((key) => ({
      key,
      count: state.gameResults.filter((result) => result.gameKey === key).length
    }));
  }, [state.gameResults]);
  const bingoGame = state.games.find(g => g.key === "bingo");
  const bingoCompletionCount = completion.find((item) => item.key === "bingo")?.count || 0;
  const pendingBingoCount = state.gameResults.filter((result) => result.gameKey === "bingo" && result.pendingBingoScore).length;
  const bingoScoreTriggered = Boolean(pendingBingoCount === 0 && (bingoGame?.bingoScored || (bingoCompletionCount > 0 && bingoGame?.isOpen === false)));

  async function handleToggle(key: GameKey) {
    const nextState = await toggleGameOpen(key);
    const game = nextState.games.find((item) => item.key === key);
    setExportText(`${game?.name || key} 已${game?.isOpen ? "开启" : "关闭"}`);
    await refresh();
  }

  async function handleBingoScore() {
    try {
      await triggerBingoScore();
      setExportText("Bingo 判分已触发！");
      await refresh();
    } catch (error) {
      setExportText(error instanceof Error ? `Bingo 判分失败：${error.message}` : "Bingo 判分失败");
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
            <b>Bingo 判分</b>
            <span>
              状态：{bingoScoreTriggered ? "已触发，Bingo 已关闭" : "待触发"}
            </span>
          </div>
          <button
            className="primaryButton smallButton"
            type="button"
            disabled={bingoScoreTriggered}
            onClick={handleBingoScore}
          >
            {bingoScoreTriggered ? "已触发" : "触发判分"}
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
