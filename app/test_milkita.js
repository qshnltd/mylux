const mysql = require('mysql2/promise');
async function test() {
  const connection = await mysql.createConnection({
    host: 'ip4.id.lavahosting.id',
    port: 3306,
    user: 'u342_zBXwUxO9MH',
    password: '!9JnzT0BO=MX7qc9+G.THTFk',
    database: 's342_luxian_player_data'
  });
  
  let [rows] = await connection.query("SELECT * FROM plan_users WHERE name LIKE '%milkita%' OR name LIKE '%MILKITA%'");
  console.log("users:", rows);
  
  if (rows.length > 0) {
     let [sessions] = await connection.query("SELECT * FROM plan_sessions WHERE user_id = ?", [rows[0].id]);
     
     let totalPlaytime = sessions.reduce((acc, s) => {
         let end = s.session_end || Date.now();
         return acc + (end - s.session_start);
     }, 0);
     console.log("totalPlaytime ms:", totalPlaytime);
     console.log("totalPlaytime hrs:", totalPlaytime / 1000 / 60 / 60);
  }
  
  await connection.end();
}
test();
