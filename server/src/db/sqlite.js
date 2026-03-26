const { getDb, saveDatabase } = require('../config/database-sqlite')

// 生成唯一 ID
const generateId = (prefix = 'id') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 通用查询函数
const query = (sql, params = []) => {
  const db = getDb()
  if (!db) {
    throw new Error('数据库未初始化')
  }
  
  try {
    db.run(sql, params)
    saveDatabase()
    return { success: true }
  } catch (error) {
    console.error('SQL 执行错误:', error)
    throw error
  }
}

// 查询返回多行
const queryAll = (sql, params = []) => {
  const db = getDb()
  if (!db) {
    throw new Error('数据库未初始化')
  }
  
  try {
    const stmt = db.prepare(sql)
    stmt.bind(params)
    const results = []
    
    while (stmt.step()) {
      results.push(stmt.getAsObject())
    }
    
    stmt.free()
    return results
  } catch (error) {
    console.error('SQL 查询错误:', error)
    throw error
  }
}

// 查询返回单行
const queryOne = (sql, params = []) => {
  const results = queryAll(sql, params)
  return results.length > 0 ? results[0] : null
}

module.exports = {
  generateId,
  query,
  queryAll,
  queryOne
}
