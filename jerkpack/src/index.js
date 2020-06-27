/*
 * @Author: 风魔小次郎
 * @Description: 输出func webpack
 */ 

const Compiler = require('./compiler')

function webpack(config, callback) {
  // 此处应有参数校验
  const compiler = new Compiler(config)
  // 此处应有参数初始化
  // compiler.initOptions()
  // 开始编译
  compiler.run()
}

module.exports = webpack