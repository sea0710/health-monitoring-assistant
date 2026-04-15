const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action, ...params } = event
  
  switch (action) {
    case 'create':
      return await createReport(params)
    case 'getList':
      return await getReportList(params)
    case 'getDetail':
      return await getReportDetail(params)
    case 'update':
      return await updateReport(params)
    case 'delete':
      return await deleteReport(params)
    case 'getPatient':
      return await getPatient(params)
    case 'createPatient':
      return await createPatient(params)
    case 'updatePatient':
      return await updatePatient(params)
    case 'deletePatient':
      return await deletePatient(params)
    case 'getTrends':
      return await getTrends(params)
    case 'getBatchDetails':
      return await getBatchReportDetails(params)
    case 'getReminders':
      return await getReminders(params)
    case 'createReminder':
      return await createReminder(params)
    case 'addReminder':
      return await addReminder(params)
    case 'updateReminder':
      return await updateReminder(params)
    case 'deleteReminder':
      return await deleteReminder(params)
    default:
      return { code: 400, message: '无效的操作' }
  }
}

async function createReport(params) {
  const { user_id, patient_id, report_type, test_time, test_hospital, indicators } = params
  
  try {
    const abnormalCount = 0
    
    const reportResult = await db.collection('reports').add({
      data: {
        user_id: user_id || '',
        patient_id,
        report_type: report_type || '血常规',
        test_time,
        test_hospital: test_hospital || '',
        abnormal_count: abnormalCount,
        created_at: new Date(),
        updated_at: new Date()
      }
    })
    
    const indicatorPromises = indicators.map(ind => {
      return db.collection('indicators').add({
        data: {
          report_id: reportResult._id,
          indicator_code: ind.indicator_code,
          indicator_name: ind.indicator_name,
          test_value: ind.test_value,
          reference_min: ind.reference_min || 0,
          reference_max: ind.reference_max || 0,
          unit: ind.unit,
          is_abnormal: false,
          abnormal_level: 'normal',
          created_at: new Date()
        }
      })
    })
    
    await Promise.all(indicatorPromises)
    
    return {
      code: 0,
      message: '报告创建成功',
      data: { report_id: reportResult._id }
    }
  } catch (error) {
    console.error('创建报告失败:', error)
    return {
      code: 500,
      message: '创建报告失败'
    }
  }
}

async function getReportList(params) {
  const { patientId } = params
  
  if (!patientId) {
    return { code: 400, message: '患者ID不能为空' }
  }
  
  try {
    const result = await db.collection('reports')
      .where({ patient_id: patientId })
      .orderBy('test_time', 'desc')
      .get()
    
    return {
      code: 0,
      message: '获取成功',
      data: result.data
    }
  } catch (error) {
    console.error('获取报告列表失败:', error)
    return {
      code: 500,
      message: '获取报告列表失败: ' + error.message
    }
  }
}

async function getReportDetail(params) {
  const { reportId } = params
  
  try {
    const reportResult = await db.collection('reports')
      .doc(reportId)
      .get()
    
    const indicatorsResult = await db.collection('indicators')
      .where({ report_id: reportId })
      .get()
    
    let patientName = '未知'
    if (reportResult.data.patient_id) {
      try {
        const patientResult = await db.collection('patients')
          .doc(reportResult.data.patient_id)
          .get()
        if (patientResult.data) {
          patientName = patientResult.data.name
        }
      } catch (e) {
        console.error('获取患者信息失败:', e)
      }
    }
    
    return {
      code: 0,
      message: '获取成功',
      data: {
        report: {
          ...reportResult.data,
          patient_name: patientName
        },
        indicators: indicatorsResult.data
      }
    }
  } catch (error) {
    console.error('获取报告详情失败:', error)
    return {
      code: 500,
      message: '获取报告详情失败'
    }
  }
}

async function updateReport(params) {
  const { reportId, test_time, test_hospital, indicators } = params
  
  try {
    await db.collection('reports')
      .doc(reportId)
      .update({
        data: {
          test_time: test_time,
          test_hospital: test_hospital,
          updated_at: new Date()
        }
      })
    
    await db.collection('indicators')
      .where({ report_id: reportId })
      .remove()
    
    const indicatorPromises = indicators.map(ind => {
      return db.collection('indicators').add({
        data: {
          report_id: reportId,
          indicator_code: ind.indicator_code,
          indicator_name: ind.indicator_name,
          test_value: ind.test_value,
          reference_min: ind.reference_min,
          reference_max: ind.reference_max,
          unit: ind.unit,
          is_abnormal: ind.is_abnormal,
          abnormal_level: ind.abnormal_level,
          created_at: new Date()
        }
      })
    })
    
    await Promise.all(indicatorPromises)
    
    return {
      code: 0,
      message: '更新成功'
    }
  } catch (error) {
    console.error('更新报告失败:', error)
    return {
      code: 500,
      message: '更新报告失败'
    }
  }
}

async function deleteReport(params) {
  const { reportId } = params
  
  try {
    await db.collection('reports')
      .doc(reportId)
      .remove()
    
    await db.collection('indicators')
      .where({ report_id: reportId })
      .remove()
    
    return {
      code: 0,
      message: '删除成功'
    }
  } catch (error) {
    console.error('删除报告失败:', error)
    return {
      code: 500,
      message: '删除报告失败'
    }
  }
}

async function getPatient(params) {
  const { userId } = params
  
  try {
    const result = await db.collection('patients')
      .where({ user_id: userId })
      .get()
    
    return {
      code: 0,
      message: '获取成功',
      data: result.data.length > 0 ? result.data[0] : null
    }
  } catch (error) {
    console.error('获取患者信息失败:', error)
    return {
      code: 500,
      message: '获取患者信息失败'
    }
  }
}

async function createPatient(params) {
  const { user_id, name, gender, birthday, tumor_type, treatment_plan, chemotherapy_cycles, last_chemo_end_date } = params
  
  if (!user_id) {
    return { code: 400, message: '用户ID不能为空' }
  }
  
  if (!name) {
    return { code: 400, message: '患者姓名不能为空' }
  }
  
  if (!gender) {
    return { code: 400, message: '性别不能为空' }
  }
  
  try {
    const result = await db.collection('patients').add({
      data: {
        user_id,
        name,
        gender,
        birthday: birthday || null,
        tumor_type: tumor_type || null,
        treatment_plan: treatment_plan || null,
        chemotherapy_cycles: chemotherapy_cycles || null,
        last_chemo_end_date: last_chemo_end_date || null,
        created_at: new Date(),
        updated_at: new Date()
      }
    })
    
    return {
      code: 0,
      message: '创建成功',
      data: {
        _id: result._id,
        patient_id: result._id,
        user_id,
        name,
        gender,
        birthday: birthday || null,
        tumor_type: tumor_type || null,
        treatment_plan: treatment_plan || null,
        created_at: new Date(),
        updated_at: new Date()
      }
    }
  } catch (error) {
    console.error('创建患者信息失败:', error)
    return {
      code: 500,
      message: '创建患者信息失败: ' + error.message
    }
  }
}

async function updatePatient(params) {
  const { patient_id, name, gender, birthday, tumor_type, treatment_plan, chemotherapy_cycles, last_chemo_end_date } = params
  
  if (!patient_id) {
    return { code: 400, message: '患者ID不能为空' }
  }
  
  try {
    await db.collection('patients')
      .doc(patient_id)
      .update({
        data: {
          name,
          gender,
          birthday,
          tumor_type,
          treatment_plan,
          chemotherapy_cycles,
          last_chemo_end_date,
          updated_at: new Date()
        }
      })
    
    return {
      code: 0,
      message: '更新成功'
    }
  } catch (error) {
    console.error('更新患者信息失败:', error, 'patient_id:', patient_id)
    
    if (error.message && error.message.includes('does not exist')) {
      return { code: 404, message: '患者记录不存在，请重新创建' }
    }
    
    return {
      code: 500,
      message: '更新患者信息失败: ' + (error.message || '未知错误')
    }
  }
}

async function deletePatient(params) {
  const { patientId } = params
  
  if (!patientId) {
    return { code: 400, message: '患者ID不能为空' }
  }
  
  try {
    await db.collection('patients').doc(patientId).remove()
    
    const reportsResult = await db.collection('reports').where({ patient_id: patientId }).get()
    const deletePromises = reportsResult.data.map(report => 
      db.collection('reports').doc(report._id).remove()
    )
    await Promise.all(deletePromises)
    
    const remindersResult = await db.collection('reminders').where({ patient_id: patientId }).get()
    const deleteReminderPromises = remindersResult.data.map(reminder => 
      db.collection('reminders').doc(reminder._id).remove()
    )
    await Promise.all(deleteReminderPromises)
    
    return { code: 0, message: '删除成功' }
  } catch (error) {
    console.error('删除患者失败:', error)
    return { code: 500, message: '删除患者失败: ' + (error.message || '未知错误') }
  }
}

async function getTrends(params) {
  const { patientId } = params
  
  try {
    const reportsResult = await db.collection('reports')
      .where({ patient_id: patientId })
      .orderBy('test_time', 'asc')
      .get()
    
    const reportIds = reportsResult.data.map(report => report._id)
    
    if (reportIds.length === 0) {
      return {
        code: 0,
        message: '暂无数据',
        data: {}
      }
    }
    
    const indicatorsResult = await db.collection('indicators')
      .where({ report_id: db.command.in(reportIds) })
      .get()
    
    const trends = {}
    reportsResult.data.forEach(report => {
      const reportIndicators = indicatorsResult.data.filter(ind => ind.report_id === report._id)
      reportIndicators.forEach(ind => {
        if (!trends[ind.indicator_code]) {
          trends[ind.indicator_code] = []
        }
        trends[ind.indicator_code].push({
          test_time: report.test_time,
          value: ind.test_value,
          level: ind.abnormal_level
        })
      })
    })
    
    return {
      code: 0,
      message: '获取成功',
      data: trends
    }
  } catch (error) {
    console.error('获取趋势数据失败:', error)
    return {
      code: 500,
      message: '获取趋势数据失败'
    }
  }
}

async function getBatchReportDetails(params) {
  const { reportIds } = params
  
  if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
    return { code: 400, message: '报告ID列表不能为空' }
  }
  
  try {
    // 批量获取所有报告的指标
    const indicatorsResult = await db.collection('indicators')
      .where({ report_id: db.command.in(reportIds) })
      .get()
    
    // 按报告ID分组指标
    const indicatorsMap = {}
    reportIds.forEach(id => {
      indicatorsMap[id] = []
    })
    
    indicatorsResult.data.forEach(ind => {
      if (indicatorsMap[ind.report_id]) {
        indicatorsMap[ind.report_id].push(ind)
      }
    })
    
    return {
      code: 0,
      message: '获取成功',
      data: indicatorsMap
    }
  } catch (error) {
    console.error('批量获取报告详情失败:', error)
    return {
      code: 500,
      message: '批量获取报告详情失败: ' + error.message
    }
  }
}

async function getReminders(params) {
  const { patientId } = params
  
  if (!patientId) {
    return { code: 400, message: '患者ID不能为空' }
  }
  
  try {
    const result = await db.collection('reminders')
      .where({ patient_id: patientId })
      .orderBy('reminder_date', 'asc')
      .orderBy('reminder_time', 'asc')
      .get()
    
    console.log('获取提醒列表 - 原始数据:', result.data)
    
    // 将 _id 映射为 reminder_id，方便前端使用
    const reminders = result.data.map(item => ({
      ...item,
      reminder_id: item._id
    }))
    
    console.log('获取提醒列表 - 处理后数据:', reminders)
    
    return {
      code: 0,
      message: '获取成功',
      data: reminders
    }
  } catch (error) {
    console.error('获取提醒列表失败:', error)
    return {
      code: 500,
      message: '获取提醒列表失败: ' + error.message
    }
  }
}

async function createReminder(params) {
  const { patient_id, reminders } = params
  const { OPENID } = cloud.getWXContext()
  
  if (!patient_id) {
    return { code: 400, message: '患者ID不能为空' }
  }
  
  if (!reminders || !Array.isArray(reminders)) {
    return { code: 400, message: '提醒数据不能为空' }
  }
  
  try {
    // 检查集合是否存在，如果不存在则创建
    try {
      await db.collection('reminders').limit(1).get()
    } catch (collectionError) {
      if (collectionError.message && collectionError.message.includes('not exist')) {
        console.log('reminders集合不存在，需要手动创建')
        return {
          code: 500,
          message: '数据库集合未创建，请在云开发控制台创建reminders集合'
        }
      }
    }
    
    // 先删除该患者的所有提醒（忽略集合不存在的错误）
    try {
      await db.collection('reminders')
        .where({ patient_id: patient_id })
        .remove()
    } catch (removeError) {
      console.log('删除旧提醒失败（可能集合不存在）:', removeError.message)
    }
    
    // 批量添加新提醒
    const reminderPromises = reminders.map(reminder => {
      return db.collection('reminders').add({
        data: {
          patient_id: patient_id,
          openid: OPENID,
          reminder_date: reminder.reminder_date,
          reminder_time: reminder.reminder_time,
          is_enabled: reminder.is_enabled || false,
          created_at: new Date(),
          updated_at: new Date()
        }
      })
    })
    
    await Promise.all(reminderPromises)
    
    return {
      code: 0,
      message: '创建提醒成功',
      data: { count: reminders.length }
    }
  } catch (error) {
    console.error('创建提醒失败:', error)
    return {
      code: 500,
      message: '创建提醒失败: ' + error.message
    }
  }
}

async function updateReminder(params) {
  const { reminder_id, updates } = params
  
  if (!reminder_id) {
    return { code: 400, message: '提醒ID不能为空' }
  }
  
  try {
    await db.collection('reminders')
      .doc(reminder_id)
      .update({
        data: {
          ...updates,
          updated_at: new Date()
        }
      })
    
    return {
      code: 0,
      message: '更新提醒成功',
      data: { reminder_id: reminder_id }
    }
  } catch (error) {
    console.error('更新提醒失败:', error)
    return {
      code: 500,
      message: '更新提醒失败: ' + error.message
    }
  }
}

async function addReminder(params) {
  const { patient_id, reminder } = params
  const { OPENID } = cloud.getWXContext()
  
  if (!patient_id) {
    return { code: 400, message: '患者ID不能为空' }
  }
  
  if (!reminder || !reminder.reminder_date) {
    return { code: 400, message: '提醒日期不能为空' }
  }
  
  try {
    const result = await db.collection('reminders').add({
      data: {
        patient_id: patient_id,
        openid: OPENID,
        reminder_date: reminder.reminder_date,
        reminder_time: reminder.reminder_time || '09:00',
        is_enabled: (reminder.status || 'pending') === 'subscribed',
        status: reminder.status || 'pending',
        source: reminder.source || 'manual',
        mode: reminder.mode || 'blood_routine',
        created_at: new Date(),
        updated_at: new Date()
      }
    })
    
    return {
      code: 0,
      message: '添加提醒成功',
      data: { _id: result._id }
    }
  } catch (error) {
    console.error('添加提醒失败:', error)
    return {
      code: 500,
      message: '添加提醒失败: ' + error.message
    }
  }
}

async function deleteReminder(params) {
  const { reminderId } = params
  
  if (!reminderId) {
    return { code: 400, message: '提醒ID不能为空' }
  }
  
  try {
    await db.collection('reminders')
      .doc(reminderId)
      .remove()
    
    return {
      code: 0,
      message: '删除提醒成功',
      data: { reminder_id: reminderId }
    }
  } catch (error) {
    console.error('删除提醒失败:', error)
    return {
      code: 500,
      message: '删除提醒失败: ' + error.message
    }
  }
}
