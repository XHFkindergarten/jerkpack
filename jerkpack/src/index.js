/*
 * @Author: 风魔小次郎
 * @Description: 
 * @Date: 2020-06-16 20:17:01
 * @LastEditors: 风魔小次郎
 * @LastEditTime: 2020-06-16 21:17:08
 */ 

const fs = require('fs')
const Compiler = require('./compiler')

function webpack(config, callback) {
  // 此处应有参数校验
  const compiler = new Compiler(config)
  // 此处应有参数初始化
  
  compiler.run()
}

module.exports = webpack