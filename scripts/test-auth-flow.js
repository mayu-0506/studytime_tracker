const fetch = require('node-fetch');

async function testAuthFlow(email, password) {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🔍 Testing auth flow...\n');
  
  // 1. Test debug endpoint
  try {
    const debugRes = await fetch(`${baseUrl}/api/debug-auth`);
    const debugData = await debugRes.json();
    console.log('📊 Current auth state:', debugData);
  } catch (error) {
    console.error('❌ Debug endpoint error:', error.message);
  }
  
  // 2. Test settings page access
  try {
    console.log('\n🔗 Testing settings page access...');
    const settingsRes = await fetch(`${baseUrl}/main/setting`, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    console.log('  Status:', settingsRes.status);
    console.log('  Location:', settingsRes.headers.get('location'));
    
    if (settingsRes.status === 302 || settingsRes.status === 307) {
      console.log('  ⚠️  Redirected - likely not authenticated');
    } else if (settingsRes.status === 200) {
      console.log('  ✅ Settings page accessible');
    } else {
      console.log('  ❌ Unexpected status');
    }
  } catch (error) {
    console.error('❌ Settings page error:', error.message);
  }
  
  console.log('\n💡 To manually test:');
  console.log('1. Open browser to http://localhost:3000');
  console.log('2. Login with your credentials');
  console.log('3. Try accessing http://localhost:3000/main/setting');
  console.log('4. Check browser console for any errors');
  console.log('5. Check network tab for redirects or failed requests');
}

// Run test
testAuthFlow().catch(console.error);