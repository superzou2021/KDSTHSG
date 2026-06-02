const PocketBase = require('pocketbase/cjs');

const pb = new PocketBase('http://localhost:8090');

async function testRegister() {
  console.log('Testing PocketBase player registration...');
  
  try {
    const collections = await pb.collections.getFullList();
    console.log('Collections:', collections.map(c => c.name));
    
    const playersCollection = collections.find(c => c.name === 'players');
    if (playersCollection) {
      console.log('\nPlayers collection schema:');
      console.log(JSON.stringify(playersCollection.schema, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testRegister();
