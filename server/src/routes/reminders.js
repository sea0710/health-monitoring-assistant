const { Router } = require('express')
const { authMiddleware } = require('../middleware/auth')

const { getReminders, createReminders, deleteReminder, updateReminder } = global.USE_DATABASE
  ? require('../controllers/reminderController')
  : require('../controllers/reminderController-memory')

const router = Router()

router.get('/:patientId', authMiddleware, getReminders)
router.post('/', authMiddleware, createReminders)
router.put('/:reminderId', authMiddleware, updateReminder)
router.delete('/:reminderId', authMiddleware, deleteReminder)

module.exports = router
