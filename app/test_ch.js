const https = require('https');
https.get("https://crafthead.net/helm/00000000-0000-0000-0009-01ff958bc5b9/24", (res) => {
   console.log("floodgate uuid:", res.statusCode, res.headers['content-type']);
});
https.get("https://crafthead.net/helm/.MILKITA/24", (res) => {
   console.log("dot name:", res.statusCode, res.headers['content-type']);
});
