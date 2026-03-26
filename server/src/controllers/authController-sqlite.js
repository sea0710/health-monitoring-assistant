const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('../config/index').jwt
const { generateId, query, queryAll, queryOne } = require('../db/sqlite')

const generateToken = (userId) => {
  return jwt.sign({ userId }, config.secret, { expiresIn: config.expiresIn })
}

const hashPassword = async (password) => {
  return bcrypt.hash(password, 10)
}

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash)
}

const register = async (req, res) => {
  try {
    const { phone, password } = req.body

    if (!phone || !password) {
      return res.status(400).json({
        code: 400,
        message: '手机号和密码不能为空',
        timestamp: new Date().toISOString()
      })
    }

    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        code: 400,
        message: '请输入正确的 11 位手机号',
        timestamp: new Date().toISOString()
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        code: 400,
        message: '密码至少需要 6 位',
        timestamp: new Date().toISOString()
      })
    }

    // 检查用户是否已存在
    const existingUser = queryOne('SELECT * FROM users WHERE phone = ?', [phone])
    if (existingUser) {
      return res.status(400).json({
        code: 400,
        message: '该手机号已注册',
        timestamp: new Date().toISOString()
      })
    }

    const userId = generateId('user')
    const hashedPassword = await hashPassword(password)

    // 创建用户
    query(
      'INSERT INTO users (user_id, phone, password) VALUES (?, ?, ?)',
      [userId, phone, hashedPassword]
    )

    const token = generateToken(userId)

    res.json({
      code: 0,
      message: '注册成功',
      data: {
        token,
        userId,
        phone
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json({
      code: 500,
      message: '注册失败',
      timestamp: new Date().toISOString()
    })
  }
}

const login = async (req, res) => {
  try {
    const { phone, password } = req.body

    if (!phone || !password) {
      return res.status(400).json({
        code: 400,
        message: '手机号和密码不能为空',
        timestamp: new Date().toISOString()
      })
    }

    // 查找用户
    const user = queryOne('SELECT * FROM users WHERE phone = ?', [phone])
    
    if (!user) {
      // 用户不存在，自动注册
      const userId = generateId('user')
      const hashedPassword = await hashPassword(password)
      
      query(
        'INSERT INTO users (user_id, phone, password) VALUES (?, ?, ?)',
        [userId, phone, hashedPassword]
      )
      
      const token = generateToken(userId)
      
      return res.json({
        code: 0,
        message: '登录成功（已自动注册）',
        data: {
          token,
          userId,
          phone
        },
        timestamp: new Date().toISOString()
      })
    }

    // 验证密码
    const isMatch = await comparePassword(password, user.password)
    if (!isMatch) {
      return res.status(401).json({
        code: 401,
        message: '密码错误',
        timestamp: new Date().toISOString()
      })
    }

    const token = generateToken(user.user_id)

    // 获取患者信息
    const patient = queryOne('SELECT * FROM patients WHERE user_id = ?', [user.user_id])

    res.json({
      code: 0,
      message: '登录成功',
      data: {
        token,
        userId: user.user_id,
        phone: user.phone,
        patient: patient || null
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({
      code: 500,
      message: '登录失败',
      timestamp: new Date().toISOString()
    })
  }
}

module.exports = {
  register,
  login
}
