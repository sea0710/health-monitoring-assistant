const { Router } = require('express')
const { authMiddleware } = require('../middleware/auth')

const router = Router()

// PUT 路由必须在 GET 路由之前定义，避免路径冲突
router.put('/:patientId', authMiddleware, (req, res) => {
  const controller = global.USE_DATABASE
    ? require('../controllers/patientController')
    : require('../controllers/patientController-memory')
  controller.updatePatient(req, res)
})

router.get('/:userId', authMiddleware, (req, res) => {
  const controller = global.USE_DATABASE
    ? require('../controllers/patientController')
    : require('../controllers/patientController-memory')
  controller.getPatient(req, res)
})

router.post('/', authMiddleware, (req, res) => {
  const controller = global.USE_DATABASE
    ? require('../controllers/patientController')
    : require('../controllers/patientController-memory')
  controller.createPatient(req, res)
})

module.exports = router
