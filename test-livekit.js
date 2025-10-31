const { AccessToken } = require('livekit-server-sdk');

// Test LiveKit token generation
const apiKey = 'avinashashokshettyandchatgptpartnership';
const apiSecret = 'avinashashokshettyandchatgptpartnership';

function createTestToken() {
  const token = new AccessToken(apiKey, apiSecret, {
    identity: 'test-user',
    name: 'Test User',
    ttl: '1h',
  });

  token.addGrant({
    roomJoin: true,
    room: 'test-room',
    canSubscribe: true,
    canPublish: true,
    canPublishData: true,
  });

  return token.toJwt();
}

console.log('Testing LiveKit Token Generation...');
console.log('Generated Token:', createTestToken());
console.log('Server URL: ws://localhost:7880');
console.log('\nTest completed successfully!');