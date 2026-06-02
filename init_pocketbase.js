const fs = require('fs');
const path = require('path');
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.PB_URL || 'http://localhost:8090';

async function initPocketBase() {
  console.log('Connecting to PocketBase:', PB_URL);
  
  const pb = new PocketBase(PB_URL);
  
  try {
    await pb.health.check();
    console.log('PocketBase is healthy');
  } catch (error) {
    console.error('PocketBase not available:', error.message);
    process.exit(1);
  }

  const coreConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'pocketbase_collections_core.json'), 'utf-8'));
  
  for (const collectionConfig of coreConfig) {
    try {
      const existing = await pb.collections.getOne(collectionConfig.id);
      console.log(`Collection ${collectionConfig.name} already exists`);
    } catch {
      try {
        await pb.collections.create(collectionConfig);
        console.log(`Created collection: ${collectionConfig.name}`);
      } catch (error) {
        console.warn(`Failed to create ${collectionConfig.name}:`, error.message);
      }
    }
  }

  const gamesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'games_seed.json'), 'utf-8'));
  
  for (const game of gamesData) {
    try {
      const existing = await pb.collection('games').getFirstListItem(`key = "${game.key}"`);
      console.log(`Game ${game.key} already exists, updating...`);
      await pb.collection('games').update(existing.id, game);
    } catch {
      try {
        await pb.collection('games').create(game);
        console.log(`Created game: ${game.name}`);
      } catch (error) {
        console.warn(`Failed to create game ${game.key}:`, error.message);
      }
    }
  }

  console.log('PocketBase initialization complete!');
}

initPocketBase().catch(console.error);
