export const dbConfig = {
  host: process.env.MYSQL_HOST || 'ip4.id.lavahosting.id',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'u342_zBXwUxO9MH',
  password: process.env.MYSQL_PASSWORD || '!9JnzT0BO=MX7qc9+G.THTFk',
  database: process.env.MYSQL_DATABASE || 's342_luxian_player_data',
};
