const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, '../../data/database.sqlite')

let db = null

const initDatabase = async () => {
  const SQL = await initSqlJs()
  
  // 确保 data 目录存在
  const dataDir = path.dirname(DB_PATH)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  
  // 加载或创建数据库
  try {
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH)
      db = new SQL.Database(fileBuffer)
      console.log('已加载现有 SQLite 数据库')
    } else {
      db = new SQL.Database()
      console.log('创建新的 SQLite 数据库')
    }
    
    // 创建表
    createTables()
    
    // 保存数据库
    saveDatabase()
    
    console.log('SQLite 数据库初始化完成')
    return true
  } catch (error) {
    console.error('SQLite 初始化失败:', error)
    return false
  }
}

const createTables = () => {
  if (!db) return
  
  const tables = `
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS patients (
      patient_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      gender TEXT NOT NULL,
      birthday TEXT,
      tumor_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
    
    CREATE TABLE IF NOT EXISTS reports (
      report_id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      test_time TEXT NOT NULL,
      test_hospital TEXT,
      overall_level TEXT,
      abnormal_count INTEGER DEFAULT 0,
      abnormal_summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
    );
    
    CREATE TABLE IF NOT EXISTS indicators (
      indicator_id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      indicator_code TEXT NOT NULL,
      indicator_name TEXT NOT NULL,
      test_value REAL NOT NULL,
      test_unit TEXT,
      standard_value REAL,
      standard_min REAL,
      standard_max REAL,
      level TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES reports(report_id)
    );
    
    CREATE TABLE IF NOT EXISTS reminders (
      reminder_id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      reminder_date TEXT NOT NULL,
      reminder_time TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
    );
    
    CREATE TABLE IF NOT EXISTS references_data (
      reference_id TEXT PRIMARY KEY,
      indicator_code TEXT NOT NULL,
      indicator_name TEXT NOT NULL,
      unit TEXT,
      clinical_significance TEXT,
      care_tips TEXT,
      grades TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `
  
  db.run(tables)
  
  // 数据库迁移：检查并添加缺失的列
  migrateDatabase()
}

const migrateDatabase = () => {
  try {
    // 检查 reports 表是否有 abnormal_count 列
    const reportsInfo = db.exec("PRAGMA table_info(reports)")
    if (reportsInfo.length > 0) {
      const columns = reportsInfo[0].values.map(col => col[1])
      
      if (!columns.includes('abnormal_count')) {
        console.log('迁移数据库：添加 reports.abnormal_count 列')
        db.run('ALTER TABLE reports ADD COLUMN abnormal_count INTEGER DEFAULT 0')
      }
      
      if (!columns.includes('abnormal_summary')) {
        console.log('迁移数据库：添加 reports.abnormal_summary 列')
        db.run('ALTER TABLE reports ADD COLUMN abnormal_summary TEXT')
      }
    }
  } catch (error) {
    console.error('数据库迁移失败:', error)
  }
}

const saveDatabase = () => {
  if (!db) return
  
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buffer)
  } catch (error) {
    console.error('保存数据库失败:', error)
  }
}

const getDb = () => {
  return db
}

// 自动保存数据库（每 5 秒）
setInterval(() => {
  saveDatabase()
}, 5000)

module.exports = {
  initDatabase,
  getDb,
  saveDatabase
}
