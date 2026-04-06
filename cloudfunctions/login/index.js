const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { phone, password } = event
  
  try {
    // 查询用户
    const userResult = await db.collection('users').where({
      phone: phone
    }).get()
    
    if (userResult.data.length === 0) {
      // 新用户，创建账号
      const createResult = await db.collection('users').add({
        data: {
          phone: phone,
          password: password,
          created_at: new Date(),
          updated_at: new Date()
        }
      })
      
      return {
        code: 0,
        message: '注册成功',
        data: {
          user_id: createResult._id,
          phone: phone,
          is_new_user: true
        }
      }
    } else {
      // 老用户，验证密码
      const user = userResult.data[0]
      if (user.password !== password) {
        return {
          code: 401,
          message: '密码错误'
        }
      }
      
      return {
        code: 0,
        message: '登录成功',
        data: {
          user_id: user._id,
          phone: user.phone,
          is_new_user: false
        }
      }
    }
  } catch (error) {
    console.error('登录失败:', error)
    return {
      code: 500,
      message: '登录失败'
    }
  }
}
