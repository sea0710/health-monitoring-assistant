const { query, transaction } = require('../config/database')

class DatabaseService {
  // User operations
  async createUser(userData) {
    const sql = `
      INSERT INTO user (user_id, phone, password, nickname, avatar, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    const params = [
      userData.user_id,
      userData.phone,
      userData.password,
      userData.nickname || null,
      userData.avatar || null,
      userData.create_time,
      userData.update_time
    ]
    await query(sql, params)
    return userData
  }

  async getUserByPhone(phone) {
    const sql = 'SELECT * FROM user WHERE phone = ?'
    const rows = await query(sql, [phone])
    return rows[0] || null
  }

  async getUserById(userId) {
    const sql = 'SELECT * FROM user WHERE user_id = ?'
    const rows = await query(sql, [userId])
    return rows[0] || null
  }

  // Patient operations
  async createPatient(patientData) {
    const sql = `
      INSERT INTO patient (patient_id, user_id, name, gender, birthday, tumor_type, treatment_plan, chemotherapy_cycles, last_chemo_end_date, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const params = [
      patientData.patient_id,
      patientData.user_id,
      patientData.name,
      patientData.gender || null,
      patientData.birthday || null,
      patientData.tumor_type || null,
      patientData.treatment_plan || null,
      patientData.chemotherapy_cycles || 0,
      patientData.last_chemo_end_date || null,
      patientData.create_time,
      patientData.update_time
    ]
    await query(sql, params)
    return patientData
  }

  async getPatientByUserId(userId) {
    const sql = 'SELECT * FROM patient WHERE user_id = ? ORDER BY create_time DESC LIMIT 1'
    const rows = await query(sql, [userId])
    return rows[0] || null
  }

  async getPatientById(patientId) {
    const sql = 'SELECT * FROM patient WHERE patient_id = ?'
    const rows = await query(sql, [patientId])
    return rows[0] || null
  }

  async updatePatient(patientId, updateData) {
    const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ')
    const sql = `UPDATE patient SET ${setClause}, update_time = ? WHERE patient_id = ?`
    const params = [...Object.values(updateData), new Date(), patientId]
    await query(sql, params)
    return this.getPatientById(patientId)
  }

  // Report operations
  async createReport(reportData) {
    const sql = `
      INSERT INTO report (report_id, patient_id, report_type, test_time, test_hospital, raw_image_url, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    const params = [
      reportData.report_id,
      reportData.patient_id,
      reportData.report_type,
      reportData.test_time,
      reportData.test_hospital || null,
      reportData.raw_image_url || null,
      reportData.create_time,
      reportData.update_time
    ]
    await query(sql, params)
    return reportData
  }

  async getReportsByPatientId(patientId) {
    const sql = 'SELECT * FROM report WHERE patient_id = ? ORDER BY test_time DESC'
    return await query(sql, [patientId])
  }

  async getReportById(reportId) {
    const sql = 'SELECT * FROM report WHERE report_id = ?'
    const rows = await query(sql, [reportId])
    return rows[0] || null
  }

  async deleteReport(reportId) {
    const sql = 'DELETE FROM report WHERE report_id = ?'
    await query(sql, [reportId])
  }

  async updateReport(reportId, updateData) {
    const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ')
    const sql = `UPDATE report SET ${setClause}, update_time = ? WHERE report_id = ?`
    const params = [...Object.values(updateData), new Date(), reportId]
    await query(sql, params)
    return this.getReportById(reportId)
  }

  // Indicator operations
  async createIndicator(indicatorData) {
    const sql = `
      INSERT INTO indicator (indicator_id, report_id, indicator_code, indicator_name, test_value, reference_min, reference_max, unit, is_abnormal, abnormal_level, create_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const params = [
      indicatorData.indicator_id,
      indicatorData.report_id,
      indicatorData.indicator_code,
      indicatorData.indicator_name,
      indicatorData.test_value,
      indicatorData.reference_min,
      indicatorData.reference_max,
      indicatorData.unit,
      indicatorData.is_abnormal,
      indicatorData.abnormal_level,
      indicatorData.create_time
    ]
    await query(sql, params)
    return indicatorData
  }

  async getIndicatorsByReportId(reportId) {
    const sql = 'SELECT * FROM indicator WHERE report_id = ?'
    return await query(sql, [reportId])
  }

  async deleteIndicatorsByReportId(reportId) {
    const sql = 'DELETE FROM indicator WHERE report_id = ?'
    await query(sql, [reportId])
  }

  async updateIndicator(indicatorId, updateData) {
    const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ')
    const sql = `UPDATE indicator SET ${setClause} WHERE indicator_id = ?`
    const params = [...Object.values(updateData), indicatorId]
    await query(sql, params)
  }

  // Reminder operations
  async createReminder(reminderData) {
    const sql = `
      INSERT INTO reminder (reminder_id, patient_id, reminder_date, reminder_time, is_enabled, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    const params = [
      reminderData.reminder_id,
      reminderData.patient_id,
      reminderData.reminder_date,
      reminderData.reminder_time,
      reminderData.is_enabled,
      reminderData.create_time,
      reminderData.update_time
    ]
    await query(sql, params)
    return reminderData
  }

  async getRemindersByPatientId(patientId) {
    const sql = 'SELECT * FROM reminder WHERE patient_id = ? ORDER BY reminder_date ASC'
    return await query(sql, [patientId])
  }

  async getReminderById(reminderId) {
    const sql = 'SELECT * FROM reminder WHERE reminder_id = ?'
    const rows = await query(sql, [reminderId])
    return rows[0] || null
  }

  async deleteReminder(reminderId) {
    const sql = 'DELETE FROM reminder WHERE reminder_id = ?'
    await query(sql, [reminderId])
  }

  async updateReminder(reminderId, updateData) {
    const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ')
    const sql = `UPDATE reminder SET ${setClause}, update_time = ? WHERE reminder_id = ?`
    const params = [...Object.values(updateData), new Date(), reminderId]
    await query(sql, params)
    return this.getReminderById(reminderId)
  }

  // Reference operations
  async getReferences() {
    const sql = 'SELECT * FROM reference ORDER BY indicator_code'
    return await query(sql, [])
  }
}

module.exports = new DatabaseService()
