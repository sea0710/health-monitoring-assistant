const mysql = require('mysql2/promise')
const config = require('./index').database

let pool = null

const createPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    })
  }
  return pool
}

const query = async (sql, params = []) => {
  const pool = createPool()
  const [rows] = await pool.execute(sql, params)
  return rows
}

const transaction = async (callback) => {
  const pool = createPool()
  const connection = await pool.getConnection()
  
  try {
    await connection.beginTransaction()
    const result = await callback(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

const initDatabase = async () => {
  const fs = require('fs')
  const path = require('path')
  const sqlPath = path.join(__dirname, '../../sql/init.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  
  const statements = sql.split(';').filter(s => s.trim())
  
  for (const statement of statements) {
    if (statement.trim()) {
      await query(statement)
    }
  }
  
  console.log('数据库表初始化完成')
}

module.exports = {
  createPool,
  query,
  transaction,
  initDatabase
}
