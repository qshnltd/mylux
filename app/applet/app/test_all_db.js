const mysql = require('mysql2/promise');

async function test() {
  try {
    const connection = await mysql.createConnection({
      host: 'ip4.id.lavahosting.id',
      port: 3306,
      user: 'u342_zBXwUxO9MH',
      password: '!9JnzT0BO=MX7qc9+G.THTFk'
    });
    
    const [rows] = await connection.query("SHOW DATABASES");
    console.log("Databases:", rows);
    
    await connection.end();
  } catch(e) {
    console.error(e.message);
  }
}
test();
