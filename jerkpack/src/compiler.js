/*
 * @Author: 风魔小次郎
 * @Description: 编译类
 * @Date: 2020-06-16 20:17:49
 * @LastEditors: 风魔小次郎
 * @LastEditTime: 2020-06-21 21:36:48
 */ 
const { AsyncSeriesHook } = require('tapable')
const path = require('path')
const fs = require('fs')
const traverse = require('@babel/traverse').default
const types = require('@babel/types')
const generator = require('@babel/generator').default
const babylon = require('babylon')

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
    this.root = process.cwd() // 根目录
    this.moduleMap = {} // 全局依赖Map
    // 入口文件在module中的id
    this.entryId = './' + path.relative(this.root, this.entryPath)
    this.hooks = {
      // 生命周期
      beforeRun: new AsyncSeriesHook(['compiler']),
      emit: new AsyncSeriesHook(['compiler']),
      run: new AsyncSeriesHook(['compiler']),
      beforeCompile: new AsyncSeriesHook(['compiler']),
      compile: new AsyncSeriesHook(['compiler']),
      afterCompile: new AsyncSeriesHook(['compiler']),
      failed: new AsyncSeriesHook(['compiler']),
    }
    this.mountPlugin()
  }

  // 注册所有的plugin
  mountPlugin() {
    for(let i=0;i<this.plugins.length;i++) {
      const item = this.plugins[i]
      if ('apply' in item && typeof item.apply === 'function') {
        // 注册各生命周期钩子的发布订阅监听事件
        item.apply(this)
      }
    }
  }

  // 开始遍历webpack
  run() {
    // 在特定的生命周期发布消息，触发对应的订阅事件
    this.hooks.beforeRun.callAsync(this)
    this.moduleWalker(this.entryPath)
  }

  // 根据依赖将所有被引用过的文件都进行编译
  moduleWalker(sourcePath) {
    const sourceCode = this.generateSourceCode(sourcePath)
    const modulePath = './' + path.relative(this.root, sourcePath)
    const parseRes = this.parse(sourceCode, path.dirname(modulePath))
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
          const loaderHandler = require(use.loader)
          content = loaderHandler(content)
        } else if (typeof use.loader === 'function') {
          const loaderHandler = use.loader
          content = loaderHandler(content)
        }
      }
    }
    return content
  }

  // 解析源码，替换其中的require方法来构建ModuleMap
  parse(source, dirpath) {
    const root = this.root
    // console.log(source)
    // 利用babylon生成AST树
    const ast = babylon.parse(source)
    // ast遍历器
    traverse(ast, {
      // 当检索到一个函数调用时
      CallExpression(p) {
        const node = p.node
        // 如果是通过require调用模块，替换成自定义方法__webpack_require__
        if (node.callee.name === 'require') {
          node.callee.name = '__webpack_require__'
          const moduleName = node.arguments[0].value
          let modulePath = './' + path.relative(root, path.resolve(dirpath, moduleName))

          if (!path.extname(modulePath)) {
            modulePath += '.js'
          }
          // const modulePath = path.relative(dirpath, )
          node.arguments = [
            types.stringLiteral(modulePath)
          ]
        }
      }
    })
    const newcode = generator(ast).code
    console.log(newcode)
  }
}

module.exports = Compiler