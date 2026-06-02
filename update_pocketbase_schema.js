const PocketBase = require("pocketbase/cjs");

async function main() {
  const pb = new PocketBase("http://localhost:8090");
  
  console.log("正在连接 PocketBase...");
  
  try {
    // 先获取 games 集合的现有记录
    console.log("\n获取 games 集合记录...");
    const gamesList = await pb.collection("games").getFullList();
    console.log(`找到 ${gamesList.length} 条游戏记录`);
    
    // 更新 quiz 游戏记录
    for (const game of gamesList) {
      if (game.key === "quiz") {
        console.log(`\n更新 quiz 游戏记录 (${game.id})...`);
        
        const updateData = {};
        if (game.quizCurrentGroup === undefined) {
          updateData.quizCurrentGroup = 0;
          console.log("- 添加 quizCurrentGroup 字段，值为 0");
        }
        
        if (Object.keys(updateData).length > 0) {
          await pb.collection("games").update(game.id, updateData);
          console.log("- 更新成功！");
        } else {
          console.log("- 字段已存在，无需更新");
        }
      }
      
      if (game.key === "bingo") {
        console.log(`\n更新 bingo 游戏记录 (${game.id})...`);
        
        const updateData = {};
        if (game.bingoScored === undefined) {
          updateData.bingoScored = false;
          console.log("- 添加 bingoScored 字段，值为 false");
        }
        
        if (Object.keys(updateData).length > 0) {
          await pb.collection("games").update(game.id, updateData);
          console.log("- 更新成功！");
        } else {
          console.log("- 字段已存在，无需更新");
        }
      }
    }
    
    console.log("\n✅ 所有记录更新完成！");
    console.log("\n请刷新浏览器页面重试。");
    
  } catch (error) {
    console.error("\n❌ 发生错误:", error.message);
    
    if (error.message.includes("Failed to fetch")) {
      console.error("请确保 PocketBase 正在运行！");
    }
    
    process.exit(1);
  }
}

main();
