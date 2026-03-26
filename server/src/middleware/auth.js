const jwt = require('jsonwebtoken')
const config = require('../config/index').jwt

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: '未提供认证令牌',
        timestamp: new Date().toISOString()
      })
    }

    const token = authHeader.split(' ')[1]
    
    try {
      const decoded = jwt.verify(token, config.secret)
      req.userId = decoded.userId
      next()
    } catch (error) {
      return res.status(401).json({
        code: 401,
        message: '令牌无效或已过期',
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('认证中间件错误:', error)
    res.status(500).json({
      code: 500,
      message: '认证失败',
      timestamp: new Date().toISOString()
    })
  }
}

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      try {
        const decoded = jwt.verify(token, config.secret)
        req.userId = decoded.userId
      } catch (error) {
        // Token invalid, but continue without user
      }
    }
    next()
  } catch (error) {
    next()
  }
}

module.exports = {
  authMiddleware,
  optionalAuth
}
