const fs = require('fs');
const path = require('path');
const PocketBase = require('pocketbase/cjs');

const PB_URL = 'http://192.168.71.33:8090';

async function updateStoryQuestions() {
  console.log('Connecting to PocketBase:', PB_URL);
  
  const pb = new PocketBase(PB_URL);
  
  try {
    await pb.health.check();
    console.log('PocketBase is healthy');
  } catch (error) {
    console.error('PocketBase not available:', error.message);
    process.exit(1);
  }

  // 先删除所有 story 题目
  console.log('Deleting existing story questions...');
  try {
    const existingQuestions = await pb.collection('questions').getFullList({ filter: 'gameKey = "story"' });
    for (const question of existingQuestions) {
      await pb.collection('questions').delete(question.id);
      console.log(`Deleted question: ${question.id}`);
    }
  } catch (error) {
    console.log('No existing story questions to delete');
  }

  // 创建新的 story 题目
  const newStoryQuestions = [
    {
      gameKey: "story",
      type: "story",
      title: "第一题：同事 A 的三个故事里，哪个是假故事？",
      options: ["A. 他曾经一天完成 12 场客户访谈", "B. 他把测试服误当生产服上线", "C. 他用 Excel 做过一版完整排行榜"],
      correctAnswer: "B. 他把测试服误当生产服上线",
      score: 50,
      order: 1,
      isActive: true
    },
    {
      gameKey: "story",
      type: "story",
      title: "第二题：同事 B 的三个故事里，哪个是假故事？",
      options: ["A. 她负责过 500 人现场活动", "B. 她把二维码印在胸牌背面", "C. 她在大屏上展示完整手机号"],
      correctAnswer: "C. 她在大屏上展示完整手机号",
      score: 50,
      order: 2,
      isActive: true
    }
  ];

  console.log('Creating new story questions...');
  for (const question of newStoryQuestions) {
    try {
      await pb.collection('questions').create(question);
      console.log(`Created question: ${question.id}`);
    } catch (error) {
      console.warn(`Failed to create question ${question.id}:`, error.message);
    }
  }

  console.log('Story questions updated successfully!');
}

updateStoryQuestions().catch(console.error);
