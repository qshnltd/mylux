const rconClient = require('rcon-client');
(async () => {
  try {
    const rcon = await rconClient.Rcon.connect({
      host: 'ip1.id.geo.lavahosting.id',
      port: 25575,
      password: process.env.RCON_PASSWORD || 'test',
      timeout: 3000
    });
    console.log('Connected!');
    rcon.end();
  } catch(e) {
    console.error('Failed:', e.message);
  }
})();
