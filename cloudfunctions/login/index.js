const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action } = event
  
  if (action === 'wechatLogin') {
    return await handleWechatLogin(event, context)
  }
  
  if (action === 'phoneLogin') {
    return await handlePhoneLogin(event)
  }
  
  if (action === 'setUserInfo') {
    return await handleSetUserInfo(event)
  }

  if (action === 'setPassword') {
    return await handleSetPassword(event)
  }

  if (action === 'changePassword') {
    return await handleChangePassword(event)
  }

  if (action === 'resetPassword') {
    return await handleResetPassword(event)
  }

  return { code: 400, message: '未知操作类型' }
}

async function handleWechatLogin(event, context) {
  try {
    const openid = cloud.getWXContext().OPENID
    
    const userResult = await db.collection('users').where({ openid }).get()
    
    if (userResult.data.length === 0) {
      const createResult = await db.collection('users').add({
        data: {
          openid: openid,
          phone: '',
          password: '',
          nickname: '',
          avatar_url: '',
          security_question: '',
          security_answer: '',
          created_at: new Date(),
          updated_at: new Date(),
          last_login_time: new Date(),
          login_count: 1
        }
      })

      return {
        code: 0,
        message: '注册成功',
        data: {
          user_id: createResult._id,
          openid: openid,
          is_new_user: true,
          hasUserInfo: false,
          user: {
            _id: createResult._id,
            openid: openid,
            nickname: '',
            avatar_url: ''
          }
        }
      }
    } else {
      const user = userResult.data[0]
      await db.collection('users').doc(user._id).update({
        data: {
          last_login_time: new Date(),
          login_count: db.command.inc(1)
        }
      })

      return {
        code: 0,
        message: '登录成功',
        data: {
          user_id: user._id,
          openid: openid,
          is_new_user: false,
          hasUserInfo: !!(user.nickname && user.avatar_url),
          user: user
        }
      }
    }
  } catch (error) {
    console.error('微信登录失败:', error)
    return { code: 500, message: '登录失败', error: error.message }
  }
}

async function handlePhoneLogin(event) {
  const { phone, password } = event
  
  try {
    const userResult = await db.collection('users').where({
      phone: phone
    }).get()
    
    if (userResult.data.length === 0) {
      return { code: 404, message: '该手机号未注册' }
    }

    const user = userResult.data[0]
    
    if (user.password && user.password !== password) {
      return { code: 401, message: '密码错误' }
    }
    
    await db.collection('users').doc(user._id).update({
      data: {
        last_login_time: new Date(),
        login_count: db.command.inc(1)
      }
    })
    
    return {
      code: 0,
      message: '登录成功',
      data: {
        user_id: user._id,
        openid: user.openid,
        is_new_user: false,
        hasUserInfo: !!(user.nickname && user.avatar_url),
        user: user
      }
    }
  } catch (error) {
    console.error('登录失败:', error)
    return { code: 500, message: '登录失败' }
  }
}

async function handleSetUserInfo(event) {
  const { userId, nickname, avatarUrl } = event
  
  try {
    await db.collection('users').doc(userId).update({
      data: {
        nickname: nickname,
        avatar_url: avatarUrl,
        updated_at: new Date()
      }
    })
    
    const userResult = await db.collection('users').doc(userId).get()
    
    return {
      code: 0,
      message: '保存成功',
      data: userResult.data
    }
  } catch (error) {
    console.error('保存用户信息失败:', error)
    return { code: 500, message: '保存失败', error: error.message }
  }
}

async function handleSetPassword(event) {
  const { userId, password, questionId, answer } = event
  
  try {
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 10)
    const hashedAnswer = answer ? await bcrypt.hash(answer, 10) : ''
    
    const SECURITY_QUESTIONS = [
      { id: 1, question: '您的小学学校名称？' },
      { id: 2, question: '您的宠物名字？' },
      { id: 3, question: '您母亲的生日？' },
      { id: 4, question: '您出生的城市？' },
      { id: 5, question: '您最喜欢的电影？' }
    ]
    
    const questionObj = SECURITY_QUESTIONS.find(q => q.id === questionId)
    
    await db.collection('users').doc(userId).update({
      data: {
        password: hashedPassword,
        security_question: questionObj ? questionObj.question : '',
        security_answer: hashedAnswer,
        updated_at: new Date()
      }
    })
    
    return { code: 0, message: '密码设置成功' }
  } catch (error) {
    console.error('设置密码失败:', error)
    return { code: 500, message: '设置密码失败', error: error.message }
  }
}

async function handleChangePassword(event) {
  const { userId, oldPassword, newPassword } = event
  
  try {
    const userResult = await db.collection('users').doc(userId).get()
    const user = userResult.data
    
    if (!user.password) {
      return { code: 400, message: '尚未设置密码' }
    }
    
    const bcrypt = require('bcryptjs')
    const isValid = await bcrypt.compare(oldPassword, user.password)
    
    if (!isValid) {
      return { code: 401, message: '原密码错误' }
    }
    
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)
    
    await db.collection('users').doc(userId).update({
      data: {
        password: hashedNewPassword,
        updated_at: new Date()
      }
    })
    
    return { code: 0, message: '密码修改成功' }
  } catch (error) {
    console.error('修改密码失败:', error)
    return { code: 500, message: '修改密码失败', error: error.message }
  }
}

async function handleResetPassword(event) {
  const { userId, answer, newPassword } = event
  
  try {
    const userResult = await db.collection('users').doc(userId).get()
    const user = userResult.data
    
    if (!user.security_answer) {
      return { code: 400, message: '未设置安全问题' }
    }
    
    const bcrypt = require('bcryptjs')
    const isAnswerCorrect = await bcrypt.compare(answer, user.security_answer)
    
    if (!isAnswerCorrect) {
      return { code: 401, message: '安全问题答案错误' }
    }
    
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)
    
    await db.collection('users').doc(userId).update({
      data: {
        password: hashedNewPassword,
        updated_at: new Date()
      }
    })
    
    return { code: 0, message: '密码重置成功' }
  } catch (error) {
    console.error('重置密码失败:', error)
    return { code: 500, message: '重置密码失败', error: error.message }
  }
}