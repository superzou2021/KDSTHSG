const PocketBase = require("pocketbase/cjs");
const GAME_ORDER = ["bingo", "quiz", "story", "elimination"];

async function main() {
  const pb = new PocketBase("http://localhost:8090");
  
  console.log("正在连接 PocketBase...\n");
  
  try {
    // 1. 获取当前数据
    const players = await pb.collection("players").getFullList();
    const gameResults = await pb.collection("game_results").getFullList();
    const games = await pb.collection("games").getFullList();

    // 2. 更新 gameResults：将 pendingBingoScore 设置为 false
    for (const result of gameResults) {
      if (result.gameKey === "bingo" && result.pendingBingoScore) {
        console.log(`✓ 更新 BINGO 结果: ${result.player}`);
        await pb.collection("game_results").update(result.id, {
          pendingBingoScore: false,
          answers: { ...result.answers, pendingBingoScore: false }
        });
      }
    }

    // 3. 更新 players：确保 completedGames 包含 bingo
    for (const player of players) {
      const playerResults = gameResults.filter((result) => result.player === player.id);
      const completedGames = [...new Set(playerResults.map((result) => result.gameKey))];
      const totalScore = playerResults.reduce((sum, result) => sum + result.score, 0);
      const finalSubmitted = GAME_ORDER.every((key) => completedGames.includes(key));

      if (!completedGames.includes("bingo")) {
        console.log(`✓ 更新玩家 ${player.name} 的 completedGames，添加 bingo`);
      }

      await pb.collection("players").update(player.id, {
        totalScore,
        completedGames,
        finalSubmitted
      });
    }

    // 4. 更新 BINGO 游戏状态
    const bingo = games.find(g => g.key === "bingo");
    if (bingo) {
      console.log(`✓ 更新 BINGO 游戏状态：isOpen=false, bingoScored=true`);
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

main();
