const net = require('net');

const client = new net.Socket();
client.setTimeout(2000);

client.connect(25575, 'ip1.id.geo.lavahosting.id', () => {
    console.log('Connected directly to port 25575');
    client.destroy();
});

client.on('error', (err) => {
    console.error('Connection error:', err);
});

client.on('timeout', () => {
    console.error('Connection timed out');
    client.destroy();
});
