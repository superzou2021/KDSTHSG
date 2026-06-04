const PocketBase = require("pocketbase/cjs");

async function main() {
  const pb = new PocketBase("http://localhost:8090");
  
  console.log("正在连接 PocketBase...\n");
  
  try {
    const gamesList = await pb.collection("games").getFullList();
    
    console.log(`games 集合共有 ${gamesList.length} 条记录：\n`);
    
    for (const game of gamesList) {
      console.log(`🎮 ${game.name} (key: ${game.key})`);
      console.log(`   id: ${game.id}`);
      console.log(`   isOpen: ${game.isOpen}`);
      console.log(`   order: ${game.order}`);
      console.log(`   maxScore: ${game.maxScore}`);
      if (game.key === "bingo") {
        console.log(`   bingoScored: ${game.bingoScored}`);
      }
      if (game.key === "quiz") {
        console.log(`   quizCurrentGroup: ${game.quizCurrentGroup}`);
      }
      console.log();
    }
    
  } catch (error) {
    console.error("❌ 发生错误:", error.message);
    process.exit(1);
  }
}

main();
