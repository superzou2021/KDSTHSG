const PocketBase = require("pocketbase/cjs");

// 模拟 pb-storage 中的函数
const GAME_ORDER = ["bingo", "quiz", "story", "elimination"];
const pb = new PocketBase("http://localhost:8090");

function nowIso() {
  return new Date().toISOString();
}

function mapPendingBingoScore(record) {
  if (typeof record.pendingBingoScore === "boolean") {
    return record.pendingBingoScore;
  }
  return Boolean(record.answers?.pendingBingoScore);
}

function buildPlayerUpdate(player) {
  const playerUpdate = {
    totalScore: player.totalScore,
    completedGames: player.completedGames,
    finalSubmitted: player.finalSubmitted
  };
  if (player.finalCompletedAt) {
    playerUpdate.finalCompletedAt = player.finalCompletedAt;
  }
  return playerUpdate;
}

async function triggerBingoScore() {
  console.log("🎮 正在触发 BINGO 判分...\n");

  try {
    // 加载当前状态
    const [players, gameResults, games] = await Promise.all([
      pb.collection("players").getFullList(),
      pb.collection("game_results").getFullList(),
      pb.collection("games").getFullList()
    ]);

    console.log(`📊 当前状态：`);
    console.log(`  玩家数：${players.length}`);
    console.log(`  游戏结果数：${gameResults.length}`);
    console.log(`  游戏数：${games.length}\n`);

    // 处理 gameResults
    const processedGameResults = gameResults.map((result) => {
      if (result.gameKey !== "bingo" || !mapPendingBingoScore(result)) return result;
      return {
        ...result,
        answers: { ...result.answers, pendingBingoScore: false },
        pendingBingoScore: false
      };
    });

    // 处理 players
    const processedPlayers = players.map((player) => {
      const playerResults = processedGameResults.filter((result) => result.player === player.id && !result.pendingBingoScore);
      const completedGames = [...new Set(playerResults.map((result) => result.gameKey))];
      const finalSubmitted = GAME_ORDER.every((key) => completedGames.includes(key));
      const totalScore = playerResults.reduce((sum, result) => sum + result.score, 0);

      console.log(`👤 处理玩家 ${player.name}：`);
      console.log(`   completedGames 之前：`, player.completedGames);
      console.log(`   completedGames 之后：`, completedGames);
      console.log(`   totalScore 之前：${player.totalScore}，之后：${totalScore}\n`);

      return {
        ...player,
        totalScore,
        completedGames,
        finalSubmitted,
        finalCompletedAt: finalSubmitted ? player.finalCompletedAt || nowIso() : player.finalCompletedAt,
        updated: nowIso()
      };
    });

    // 更新 gameResults
    for (const result of gameResults) {
      if (result.gameKey === "bingo" && mapPendingBingoScore(result)) {
        console.log(`✓ 更新 BINGO 结果：${result.player}`);
        await pb.collection("game_results").update(result.id, {
          pendingBingoScore: false,
          answers: { ...result.answers, pendingBingoScore: false }
        });
      }
    }

    // 更新 players
    for (const player of processedPlayers) {
      console.log(`✓ 更新玩家 ${player.name}`);
      await pb.collection("players").update(player.id, buildPlayerUpdate(player));
    }

    // 更新 games
    const bingo = games.find(g => g.key === "bingo");
    if (bingo) {
      console.log(`✓ 更新 BINGO 游戏：isOpen=false, bingoScored=true`);
      await pb.collection("games").update(bingo.id, { isOpen: false, bingoScored: true });
    }

    console.log("\n✅ BINGO 判分完成！");
    console.log("\n请刷新浏览器查看结果。");
  } catch (error) {
    console.error("❌ 发生错误:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

triggerBingoScore();
