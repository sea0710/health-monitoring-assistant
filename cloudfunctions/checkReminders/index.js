const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

function getBeijingDateStr(utcDate) {
  const beijingOffset = 8 * 60 * 60 * 1000
  const beijingTime = new Date(utcDate.getTime() + beijingOffset)
  const year = beijingTime.getUTCFullYear()
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(beijingTime.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getBeijingTimeStr(utcDate) {
  const beijingOffset = 8 * 60 * 60 * 1000
  const beijingTime = new Date(utcDate.getTime() + beijingOffset)
  const hour = String(beijingTime.getUTCHours()).padStart(2, '0')
  const minute = String(beijingTime.getUTCMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

exports.main = async (event, context) => {
  const now = new Date()
  const todayStr = getBeijingDateStr(now)
  const currentTime = getBeijingTimeStr(now)
  
  try {
    const remindersRes = await db.collection('reminders')
      .where({
        reminder_date: todayStr,
        is_enabled: true
      })
      .get()
    
    const reminders = remindersRes.data
    console.log('今天的提醒数量:', reminders.length)
    console.log('当前时间(北京):', currentTime)
    console.log('今天日期(北京):', todayStr)
    console.log('提醒列表:', JSON.stringify(reminders.map(r => ({ 
      time: r.reminder_time, 
      openid: r.openid ? r.openid.substring(0,10) + '...' : null 
    }))))
    
    let sentCount = 0
    
    for (const reminder of reminders) {
      if (reminder.reminder_time === currentTime) {
        console.log('⏰ 时间匹配，准备发送提醒')
        
        if (!reminder.openid) {
          console.error('❌ 该提醒缺少openid，跳过:', reminder._id)
          continue
        }
        
        try {
          const result = await cloud.openapi.subscribeMessage.send({
            touser: reminder.openid,
            templateId: 'VWOzjsDFnzLc4va2_M-zjWSOjhlVw1E_NSo_OPT0a2M',
            page: 'pages/reminder/reminder',
            data: {
              name1: { value: '血常规复查' },
              time2: { value: `${todayStr} ${reminder.reminder_time}` },
              thing6: { value: '请记得前往医院进行血常规检查' }
            }
          })
          console.log('✅ 发送成功:', JSON.stringify(result))
          sentCount++
        } catch (messageError) {
          console.error('❌ 发送消息失败:', JSON.stringify(messageError))
        }
      } else {
        console.log(`跳过: 提醒=${reminder.reminder_time}, 当前=${currentTime}`)
      }
    }
    
    return {
      code: 0,
      message: '检查提醒完成',
      data: {
        checked: reminders.length,
        sentCount: sentCount,
        currentDate: todayStr,
        currentTime: currentTime
      }
    }
  } catch (error) {
    console.error('检查提醒失败:', error)
    return {
      code: 500,
      message: '检查提醒失败',
      error: error.message
    }
  }
}
