/*
 * @Author: 风魔小次郎
 * @Description: 编译类
 * @Date: 2020-06-16 20:17:49
 * @LastEditors: 风魔小次郎
 * @LastEditTime: 2020-06-16 21:59:03
 */ 
const { AsyncSeriesHook } = require('tapable')
const fs = require('fs')
const { type } = require('os')

class Compiler {
  constructor(config, _callback) {
    const {
      entry,
      output,
      module,
      plugins
    } = config
    this.entryPath = entry
    this.distPath = output
    this.loaders = module.rules
    this.plugins = plugins
    this.hooks = {
      shouldEmit: new AsyncSeriesHook(['whatever']),
      emit: new AsyncSeriesHook(['compiler']),
      beforeRun: new AsyncSeriesHook(['compiler']),
      run: new AsyncSeriesHook(['compiler']),
      beforeCompile: new AsyncSeriesHook(['compiler']),
      compile: new AsyncSeriesHook(['compiler']),
      afterCompile: new AsyncSeriesHook(['compiler']),
      failed: new AsyncSeriesHook(['compiler']),
    }
  }
  // 开始遍历webpack
  run() {
    this.generateSourceCode(this.entryPath)
  }
  // 生成源代码
  generateSourceCode(entryPath) {
    // 用utf8格式读取文件内容
    let content = fs.readFileSync(entryPath, 'utf-8')
    // 获取用户注入的loader
    const { loaders } = this
    // 依次遍历所有loader
    for(let i=0;i<loaders.length;i++) {
      const loader = loaders[i]
      const { test : reg, use } = loader
      if (
        (Object.prototype.toString.call(reg) === '[object RegExp]' && reg.test(entryPath))
        || (typeof reg === 'string' && entryPath.indexOf(reg) >= 0)
      ) {
        // 判断是否满足正则或字符串要求
        // 如果该规则需要应用多个loader,从最后一个开始向前执行
        if (Array.isArray(use)) {
          while(use.length) {
            const cur = use.pop()
            const loaderHandler = 
              typeof cur.loader === 'string' 
                ? require(cur.loader)
                : (
                  typeof cur.loader === 'function'
                  ? cur.loader : _ => _
                )
            content = loaderHandler(content)
          }
        } else if (typeof use.loader === 'string') {
          console.log(11)
          const loaderHandler = require(use.loader)
          content = loaderHandler(content)
        } else if (typeof use.loader === 'function') {
          const loaderHandler = use.loader
          content = loaderHandler(content)
        }
      }
    }
    console.log('content', content)
  }
}

module.exports = Compiler