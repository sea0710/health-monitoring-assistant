const { Router } = require('express')
const { authMiddleware } = require('../middleware/auth')
const { getPatient, createPatient } = require('../controllers/patientController-sqlite')

const router = Router()

router.get('/:userId', authMiddleware, getPatient)
router.post('/', authMiddleware, createPatient)

module.exports = router
