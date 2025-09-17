// Test script to verify API functionality
const API_URL = 'https://gapapi.karmahq.xyz/v2/communities/celo/projects?page=1&limit=10&programIds=944_42161';

async function testAPI() {
  console.log('Testing API call to:', API_URL);
  console.log('-----------------------------------');

  try {
    const response = await fetch(API_URL);

    console.log('Response Status:', response.status);
    console.log('Response OK:', response.ok);
    console.log('Content-Type:', response.headers.get('content-type'));

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log('\nAPI Response Summary:');
    console.log('- Total projects:', data.projects?.length || 0);

    if (data.projects && data.projects.length > 0) {
      console.log('\nFirst 3 projects:');
      data.projects.slice(0, 3).forEach((project, index) => {
        console.log(`\n${index + 1}. ${project.details.title}`);
        console.log(`   - Description: ${project.details.description.substring(0, 100)}...`);
        console.log(`   - Progress: ${project.percentCompleted}%`);
        console.log(`   - Transactions: ${project.numTransactions}`);
        console.log(`   - Owner: ${project.members.find(m => m.role === 'owner')?.address || 'No owner'}`);
      });
    }

    console.log('\n✅ API test successful!');
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    process.exit(1);
  }
}

testAPI();