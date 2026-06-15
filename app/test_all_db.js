const mysql = require('mysql2/promise');

async function test() {
  try {
    const connection = await mysql.createConnection({
      host: 'ip4.id.lavahosting.id',
      port: 3306,
      user: 'u342_zBXwUxO9MH',
      password: '!9JnzT0BO=MX7qc9+G.THTFk'
    });
    
    const [rows] = await connection.query("SELECT TABLE_SCHEMA, TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')");
    console.log("All tables:", rows);
    
    await connection.end();
  } catch(e) {
    console.error(e.message);
  }
}
test();
