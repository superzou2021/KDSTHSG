const PocketBase = require("pocketbase/cjs");

const pb = new PocketBase("http://localhost:8090");

async function resetDemoData() {
  console.log("🧹 正在重置演示数据...\n");

  try {
    // 1. 删除所有 game_results
    const gameResults = await pb.collection("game_results").getFullList();
    console.log(`删除 ${gameResults.length} 条游戏结果`);
    for (const result of gameResults) {
      await pb.collection("game_results").delete(result.id);
    }

    // 2. 删除所有玩家
    const players = await pb.collection("players").getFullList();
    console.log(`删除 ${players.length} 个玩家`);
    for (const player of players) {
      await pb.collection("players").delete(player.id);
    }

    // 3. 重置 games 状态
    const games = await pb.collection("games").getFullList();
    for (const game of games) {
      const update = { isOpen: false };
      if (game.key === "bingo") {
        update.bingoScored = false;
      }
      if (game.key === "quiz") {
        update.quizCurrentGroup = 0;
      }
      await pb.collection("games").update(game.id, update);
      console.log(`重置游戏 ${game.name}`);
    }

    console.log("\n✅ 演示数据重置完成！");
    console.log("\n现在可以重新测试了。");
  } catch (error) {
    console.error("❌ 发生错误:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

resetDemoData();
