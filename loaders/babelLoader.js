/*
 * @Author: 风魔小次郎
 * @Description: 利用babel来转换代码
 * @Date: 2020-06-22 21:15:34
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2020-06-27 18:20:47
 */ 
const babel = require('@babel/core')
const fs = require('fs')
let i=1

module.exports = function BabelLoader (source) {
  const res = babel.transform(source, {
    sourceType: 'module' // 允许使用import和export语法
  })
  if (i > 0) {
    fs.writeFileSync('./test.js', res.code)
  }
  i--
  return res.code
}
