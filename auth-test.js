console.log('\n==================================');
console.log('🏁 AUTHENTICATION TESTING COMPLETE 🏁');
console.log('Summary:');
console.log(`- Registration: ${results.registration.status === 201 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`- Invalid Registration: ${results.invalidRegistration.status !== 200 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`- Login: ${results.login.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`- Invalid Login: ${results.invalidLogin.status !== 200 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`- Get Current User: ${results.currentUser.status === 200 ? '✅ PASS' : '❌ FAIL'}`); 