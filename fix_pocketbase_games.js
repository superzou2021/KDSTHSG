const PocketBase = require("pocketbase/cjs");

async function main() {
  const pb = new PocketBase("http://localhost:8090");
  
  console.log("正在连接 PocketBase...\n");
  
  try {
    const gamesList = await pb.collection("games").getFullList();
    
    console.log("修复 games 集合记录...\n");
    
    for (const game of gamesList) {
      if (game.key === "quiz") {
        console.log(`🎮 修复 quiz 游戏记录...`);
        
        const updateData = {
          name: "Sector Quiz",
          quizCurrentGroup: 0
        };
        
        await pb.collection("games").update(game.id, updateData);
        console.log(`   - 已更新名称为: Sector Quiz`);
        console.log(`   - 已设置 quizCurrentGroup: 0`);
        console.log("   ✅ 修复成功！\n");
      }
    }
    
    // 再次检查
    console.log("验证修复结果...\n");
    const updatedGames = await pb.collection("games").getFullList();
    
    for (const game of updatedGames) {
      if (game.key === "quiz") {
        console.log(`🎮 ${game.name} (key: ${game.key})`);
        console.log(`   isOpen: ${game.isOpen}`);
        console.log(`   quizCurrentGroup: ${game.quizCurrentGroup}`);
        console.log("\n✅ 所有问题已修复！请刷新浏览器页面重试。");
      }
    }
    
  } catch (error) {
    console.error("❌ 发生错误:", error.message);
    process.exit(1);
  }
}

main();
