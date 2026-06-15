const mysql = require('mysql2/promise');

async function test() {
  try {
    const connection = await mysql.createConnection({
      host: 'ip4.id.lavahosting.id',
      port: 3306,
      user: 'u342_zBXwUxO9MH',
      password: '!9JnzT0BO=MX7qc9+G.THTFk',
      database: 's342_luxian_player_data'
    });
    
    const [tables] = await connection.query('SHOW TABLES');
    console.log(tables);
    for (const t of tables) {
        const name = Object.values(t)[0];
        console.log('TABLE:', name);
        const [cols] = await connection.query(`SHOW COLUMNS FROM \`${name}\``);
        console.log(cols.map(c => c.Field).join(', '));
    }
    
    await connection.end();
  } catch(e) {
    console.error(e.message);
  }
}
test();
