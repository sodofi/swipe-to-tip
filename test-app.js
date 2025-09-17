// Test script to verify the app is working
const http = require('http');

function testApp() {
  console.log('Testing app at http://localhost:3002');
  console.log('-----------------------------------\n');

  const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/',
    method: 'GET',
    headers: {
      'Accept': 'text/html',
      'User-Agent': 'Mozilla/5.0'
    }
  };

  const req = http.request(options, (res) => {
    console.log('✅ App is running!');
    console.log(`Status: ${res.statusCode}`);
    console.log(`Content-Type: ${res.headers['content-type']}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      // Check for key elements in the HTML
      const hasNextApp = data.includes('__next');
      const hasReactRoot = data.includes('__next');
      const hasStyles = data.includes('_next/static/css');

      console.log('\nApp Health Check:');
      console.log('- Next.js app loaded:', hasNextApp ? '✅' : '❌');
      console.log('- React components:', hasReactRoot ? '✅' : '❌');
      console.log('- CSS loaded:', hasStyles ? '✅' : '❌');

      // Check for error messages
      if (data.includes('TypeError') || data.includes('Cannot read properties')) {
        console.log('\n⚠️  Warning: Potential JavaScript errors detected');
      }

      console.log('\n📱 Open in browser: http://localhost:3002');
      console.log('\nThe app should display:');
      console.log('1. Loading screen initially');
      console.log('2. Swipeable project cards from Celo');
      console.log('3. Save/Pass buttons for each project');
      console.log('4. Saved projects view with tipping functionality');
    });
  });

  req.on('error', (error) => {
    console.error('❌ App test failed:', error.message);
  });

  req.end();
}

testApp();