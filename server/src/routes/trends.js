const { Router } = require('express')
const { authMiddleware } = require('../middleware/auth')
const { getTrendData } = require('../controllers/trendController-sqlite')

const router = Router()

router.get('/:indicator', authMiddleware, getTrendData)

module.exports = router
