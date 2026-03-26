const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const config = require('../config/index').jwt

const users = new Map()
const patients = new Map()
const reports = new Map()
const indicators = new Map()
const reminders = new Map()

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
        message: '请输入正确的11位手机号',
        timestamp: new Date().toISOString()
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        code: 400,
        message: '密码至少需要6位',
        timestamp: new Date().toISOString()
      })
    }

    for (const [_, user] of users) {
      if (user.phone === phone) {
        return res.status(400).json({
          code: 400,
          message: '该手机号已注册',
          timestamp: new Date().toISOString()
        })
      }
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const hashedPassword = await hashPassword(password)

    users.set(userId, {
      user_id: userId,
      phone,
      password: hashedPassword,
      nickname: null,
      avatar: null,
      create_time: new Date(),
      update_time: new Date()
    })

    const token = generateToken(userId)

    res.status(201).json({
      code: 0,
      message: '注册成功',
      data: {
        token,
        user: {
          user_id: userId,
          phone
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json({
      code: 500,
      message: '注册失败，请重试',
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

    let user = null
    for (const [_, u] of users) {
      if (u.phone === phone) {
        user = u
        break
      }
    }

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        timestamp: new Date().toISOString()
      })
    }

    const isValid = await comparePassword(password, user.password)

    if (!isValid) {
      return res.status(401).json({
        code: 401,
        message: '密码错误',
        timestamp: new Date().toISOString()
      })
    }

    let patient = null
    for (const [_, p] of patients) {
      if (p.user_id === user.user_id) {
        patient = p
        break
      }
    }

    const token = generateToken(user.user_id)

    res.json({
      code: 0,
      message: '登录成功',
      data: {
        token,
        user: {
          user_id: user.user_id,
          phone: user.phone,
          nickname: user.nickname,
          avatar: user.avatar
        },
        patient: patient ? {
          patient_id: patient.patient_id,
          name: patient.name,
          gender: patient.gender,
          birthday: patient.birthday,
          tumor_type: patient.tumor_type,
          treatment_plan: patient.treatment_plan,
          chemotherapy_cycles: patient.chemotherapy_cycles,
          last_chemo_end_date: patient.last_chemo_end_date
        } : null
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({
      code: 500,
      message: '登录失败，请重试',
      timestamp: new Date().toISOString()
    })
  }
}

module.exports = {
  register,
  login,
  generateToken,
  hashPassword,
  comparePassword,
  users,
  patients,
  reports,
  indicators,
  reminders
}
