const { Router } = require('express')

// 根据全局标志选择控制器
const { register, login } = global.USE_DATABASE
  ? require('../controllers/authController-db')
  : require('../controllers/authController-memory')

const router = Router()

router.post('/register', register)
router.post('/login', login)

module.exports = router
