import PocketBase from 'pocketbase';

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('请先设置环境变量 PB_ADMIN_EMAIL 和 PB_ADMIN_PASSWORD');
  process.exit(1);
}

const pb = new PocketBase(PB_URL);

const games = [
  { key: 'bingo', name: 'Bingo 猜词', maxScore: 100, isOpen: false, order: 1 },
  { key: 'quiz', name: 'Quick Quiz', maxScore: 100, isOpen: false, order: 2 },
  { key: 'story', name: '真假故事', maxScore: 100, isOpen: false, order: 3 },
  { key: 'elimination', name: '站立淘汰', maxScore: 100, isOpen: false, order: 4 },
];

await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);

for (const game of games) {
  const existing = await pb.collection('games').getFirstListItem(`key="${game.key}"`).catch(() => null);
  if (existing) {
    await pb.collection('games').update(existing.id, game);
    console.log(`updated: ${game.key}`);
  } else {
    await pb.collection('games').create(game);
    console.log(`created: ${game.key}`);
  }
}

console.log('games 初始化完成');
