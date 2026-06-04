const PocketBase = require('pocketbase/cjs');

const pb = new PocketBase('http://localhost:8090');

const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'password';

async function setPermissions() {
  console.log('Setting collection permissions...');
  
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('Admin authenticated');
    
    const collections = await pb.collections.getFullList();
    
    for (const collection of collections) {
      if (['players', 'game_results', 'games'].includes(collection.name)) {
        console.log(`Updating permissions for ${collection.name}...`);
        
        collection.listRule = '';
        collection.viewRule = '';
        collection.createRule = '';
        collection.updateRule = '';
        collection.deleteRule = '';
        
        await pb.collections.update(collection.id, collection);
        console.log(`Permissions updated for ${collection.name}`);
      }
    }
    
    console.log('All permissions updated successfully!');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('Trying without admin auth...');
    
    try {
      const result = await pb.collection('players').create({
        name: 'Test User',
        phone: '13912345678',
        office: '北京',
        team: 'Alpha',
        totalScore: 0,
        completedGames: [],
        finalSubmitted: false
      });
      console.log('Success! No auth needed');
      await pb.collection('players').delete(result.id);
    } catch (e) {
      console.error('Still failed:', e.message);
      console.log('\nPlease manually set permissions in PocketBase admin:');
      console.log('1. Open http://127.0.0.1:8090/_/');
      console.log('2. Go to Collections -> players -> Edit');
      console.log('3. Set all rules (List, View, Create, Update, Delete) to "" (empty)');
      console.log('4. Repeat for game_results and games collections');
    }
  }
}

setPermissions();
