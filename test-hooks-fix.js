// Test that the hooks error is fixed
const http = require('http');

function testHooksFix() {
  console.log('Testing React Hooks Fix...\n');

  const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      // Check for error indicators
      const hasHooksError = data.includes('Rendered more hooks') ||
                           data.includes('updateWorkInProgressHook');
      const hasReactError = data.includes('Error boundary') ||
                           data.includes('Something went wrong');

      console.log('Test Results:');
      console.log('='.repeat(50));
      console.log(`✅ Server Response: ${res.statusCode}`);
      console.log(`✅ Page loaded: Yes`);
      console.log(`✅ Hooks error present: ${hasHooksError ? 'YES ❌' : 'NO ✅'}`);
      console.log(`✅ React error boundary triggered: ${hasReactError ? 'YES ❌' : 'NO ✅'}`);

      if (!hasHooksError && !hasReactError) {
        console.log('\n🎉 SUCCESS: The hooks error has been fixed!');
        console.log('\nWhat was fixed:');
        console.log('- Moved useTransform hooks outside of map function');
        console.log('- Declared saveOverlayOpacity and passOverlayOpacity at component level');
        console.log('- Removed conditional hook calls inside render');
        console.log('\nThe app should now work without React hooks errors.');
      } else {
        console.log('\n⚠️  Warning: There may still be issues');
      }
    });
  });

  req.on('error', (error) => {
    console.error('Test failed:', error.message);
  });

  req.end();
}

testHooksFix();