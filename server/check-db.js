const { initDatabase, getDb } = require('./src/config/database-sqlite');

async function checkDatabase() {
  await initDatabase();
  const db = getDb();
  
  if (!db) {
    console.error('数据库未初始化');
    return;
  }
  
  console.log('检查 reports 表结构:');
  const stmt = db.prepare('PRAGMA table_info(reports)');
  while (stmt.step()) {
    console.log(stmt.getAsObject());
  }
  stmt.free();
  
  console.log('\n检查 indicators 表结构:');
  const stmt2 = db.prepare('PRAGMA table_info(indicators)');
  while (stmt2.step()) {
    console.log(stmt2.getAsObject());
  }
  stmt2.free();
}

checkDatabase();