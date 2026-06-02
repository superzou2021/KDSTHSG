const PocketBase = require("pocketbase/cjs");

async function main() {
  const pb = new PocketBase("http://localhost:8090");
  
  console.log("正在连接 PocketBase...\n");
  
  try {
    const players = await pb.collection("players").getFullList();
    console.log(`📊 玩家数据 (${players.length} 人):`);
    for (const player of players) {
      console.log(`  👤 ${player.name} (${player.id})`);
      console.log(`     totalScore: ${player.totalScore}`);
      console.log(`     completedGames:`, player.completedGames);
      console.log(`     finalSubmitted: ${player.finalSubmitted}`);
      console.log();
    }

    const gameResults = await pb.collection("game_results").getFullList();
    console.log(`🎯 游戏结果 (${gameResults.length} 条):`);
    for (const result of gameResults) {
      console.log(`  ${result.gameKey.toUpperCase()}: ${result.player} - 得分 ${result.score}`);
      console.log(`     pendingBingoScore: ${result.pendingBingoScore}`);
      console.log();
    }

    const games = await pb.collection("games").getFullList();
    console.log(`🎮 游戏状态:`);
    for (const game of games) {
      console.log(`  ${game.name} (${game.key}):`);
      console.log(`     isOpen: ${game.isOpen}`);
      if (game.key === "bingo") console.log(`     bingoScored: ${game.bingoScored}`);
      if (game.key === "quiz") console.log(`     quizCurrentGroup: ${game.quizCurrentGroup}`);
      console.log();
    }
  } catch (error) {
    console.error("❌ 发生错误:", error.message);
    process.exit(1);
  }
}

main();
