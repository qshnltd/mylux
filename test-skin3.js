const https = require('https');
https.get('https://crafty.gg/api/player/bedrock/HanQiShanMC', (res) => {
  console.log(res.statusCode, res.headers['content-type']);
});
