const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { templateId, data, page } = event
  
  console.log('发送消息 - OPENID:', OPENID)
  console.log('发送消息 - templateId:', templateId)
  console.log('发送消息 - data:', JSON.stringify(data))
  console.log('发送消息 - page:', page)
  
  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: OPENID,
      templateId: templateId,
      page: page,
      data: data
    })
    
    console.log('发送消息成功 - result:', JSON.stringify(result))
    return {
      code: 0,
      message: '发送成功',
      data: result
    }
  } catch (error) {
    console.error('发送消息失败 - 完整错误:', JSON.stringify(error))
    console.error('发送消息失败 - errCode:', error.errCode)
    console.error('发送消息失败 - errMsg:', error.errMsg)
    return {
      code: 500,
      message: '发送消息失败',
      errCode: error.errCode || '',
      errMsg: error.errMsg || '',
      detail: JSON.stringify(error)
    }
  }
}
