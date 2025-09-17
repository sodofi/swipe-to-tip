// Test the actual component logic
async function testComponentLogic() {
  console.log('Testing component logic...\n');

  // Simulate the fetch that happens in the component
  try {
    const response = await fetch(
      'https://gapapi.karmahq.xyz/v2/communities/celo/projects?page=1&limit=50'
    );

    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }

    const data = await response.json();
    console.log('Raw API Response keys:', Object.keys(data));

    // The API returns data in 'payload' not 'projects'
    const projectsData = data.payload || data.projects || [];
    console.log('Number of projects found:', projectsData.length);

    if (projectsData.length > 0) {
      // Sort by numTransactions descending
      const sortedProjects = projectsData.sort((a, b) =>
        b.numTransactions - a.numTransactions
      );

      console.log('\nFirst 5 projects after sorting:');
      sortedProjects.slice(0, 5).forEach((project, index) => {
        console.log(`${index + 1}. ${project.details.title}`);
        console.log(`   Transactions: ${project.numTransactions}`);
        console.log(`   Progress: ${project.percentCompleted}%`);
        console.log(`   Grants: ${project.grantNames.length}`);
      });

      console.log('\n✅ Projects loaded successfully!');
      console.log('The app should now display these projects as swipeable cards.');
    } else {
      console.log('⚠️  No projects returned from API');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testComponentLogic();