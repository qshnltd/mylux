const https = require('https');
https.get("https://crafthead.net/helm/.MILKITA/24", (res) => {
   console.log("crafthead bedrock format returns:", res.statusCode);
});
https.get("https://crafthead.net/helm/00000000-0000-0000-0009-01ff958bc5b9/24", (res) => {
   console.log("crafthead bedrock uuid returns:", res.statusCode);
});
