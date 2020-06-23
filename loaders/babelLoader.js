/*
 * @Author: 风魔小次郎
 * @Description: 利用babel来转换代码
 * @Date: 2020-06-22 21:15:34
 * @LastEditors: 风魔小次郎
 * @LastEditTime: 2020-06-23 22:40:49
 */ 
const babel = require('@babel/core')

module.exports = function (source) {
  const res = babel.transform(source, {
    sourceType: 'module' // 允许使用import和export语法
  })
  return res.code
}
