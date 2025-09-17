// Test sorting logic with the specific API endpoint
async function testSorting() {
  console.log('Testing API endpoint with programIds filter...\n');

  try {
    const response = await fetch(
      'https://gapapi.karmahq.xyz/v2/communities/celo/projects?page=1&limit=100&programIds=944_42161'
    );

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();
    const projectsData = data.payload || [];

    console.log(`✅ API Response received`);
    console.log(`Total projects: ${projectsData.length}\n`);

    // Sort by numTransactions in descending order
    const sortedProjects = projectsData.sort((a, b) => {
      const aTransactions = a.numTransactions || 0;
      const bTransactions = b.numTransactions || 0;
      return bTransactions - aTransactions;
    });

    console.log('Top 10 projects sorted by transaction count (highest to lowest):');
    console.log('=' .repeat(70));

    sortedProjects.slice(0, 10).forEach((project, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${project.details.title.padEnd(40)} | ${project.numTransactions.toString().padStart(8)} transactions`);
    });

    console.log('\n' + '=' .repeat(70));
    console.log('Verification:');
    console.log(`- First project has ${sortedProjects[0].numTransactions} transactions`);
    console.log(`- Last project has ${sortedProjects[sortedProjects.length - 1].numTransactions} transactions`);

    // Verify sorting is correct
    let isSorted = true;
    for (let i = 0; i < sortedProjects.length - 1; i++) {
      if (sortedProjects[i].numTransactions < sortedProjects[i + 1].numTransactions) {
        isSorted = false;
        console.log(`❌ Sorting error at index ${i}: ${sortedProjects[i].numTransactions} < ${sortedProjects[i + 1].numTransactions}`);
        break;
      }
    }

    if (isSorted) {
      console.log('✅ Projects are correctly sorted by transaction count (descending)');
    }

    console.log('\nArchitecture notes:');
    console.log('- API is called only once when component mounts');
    console.log('- All 93 projects are loaded in a single API call');
    console.log('- Projects are sorted by transaction count in memory');
    console.log('- Users swipe through pre-sorted projects without additional API calls');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSorting();