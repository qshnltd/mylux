const mysql = require('mysql2/promise');
async function run() {
  try {
    const connection = await mysql.createConnection({
        host: 'ip4.id.lavahosting.id',
        port: 3306,
        user: 'u342_zBXwUxO9MH',
        password: '!9JnzT0BO=MX7qc9+G.THTFk'
    });
    const [rows] = await connection.query("SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = 's342_luxian_player_data'");
    console.log(rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
  }
}
run();
