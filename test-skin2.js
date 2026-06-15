const https = require('https');
https.get('https://mc-heads.net/body/00000000-0000-0000-0009-01c5185dbaf9', (res) => {
  console.log(res.statusCode);
});
