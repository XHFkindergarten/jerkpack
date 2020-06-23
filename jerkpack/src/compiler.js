/*
 * @Author: 风魔小次郎
 * @Description: 编译类
 * @Date: 2020-06-16 20:17:49
 * @LastEditors: 风魔小次郎
 * @LastEditTime: 2020-06-23 23:12:24
 */ 
const { AsyncSeriesHook } = require('tapable')
const path = require('path')
const fs = require('fs')
const babel = require('@babel/core')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const types = require('@babel/types')
const generator = require('@babel/generator').default
const ejs = require("ejs");



class Compiler {
  constructor(config, _callback) {
    const {
      entry,
      output,
      module,
      plugins
    } = config
    this.entryPath = entry
    this.distPath = output.path
    this.loaders = module.rules
    this.plugins = plugins
    this.root = process.cwd() // 根目录
    this.moduleMap = {} // 全局依赖Map
    // 入口文件在module中的id
    this.entryId = this.getRootPath(this.root, entry)
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
    this.emitFile()
  }

  // 根据依赖将所有被引用过的文件都进行编译
  moduleWalker(sourcePath) {
    if (sourcePath in this.moduleMap) return
    let content
    try {
      if (!sourcePath.endsWith('.js')) {
        // 如果路径不以.js结尾，那么需要做判断
        if (fs.existsSync(sourcePath + '.js')) {
          // 如果加上.js就是存在的文件，那么直接使用
          sourcePath += '.js'
        } else if (fs.existsSync(sourcePath + '/index.js')) {
          sourcePath += '/index.js'
        } else {
          throw new Error(`[error]读取${sourcePath}内容时出错`)
        }
      }
    } catch (e) {
      console.log(e)
    }
    const sourceCode = this.generateSourceCode(sourcePath)
    const modulePath = this.getRootPath(this.root, sourcePath)
    // 获取模块编译后的代码和模块内的依赖数组
    const [ moduleCode, relyInModule ] = this.parse(sourceCode, path.dirname(modulePath))
    // 将模块代码放入ModuleMap
    this.moduleMap[modulePath] = moduleCode
    // 再依次对模块中的依赖项进行解析
    for(let i=0;i<relyInModule.length;i++) {
      this.moduleWalker(relyInModule[i], path.dirname(relyInModule[i]))
    }
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
              // loader也可能来源于package包例如babel-loader
              // 但是这里并不可以用babel-loader,因为babel-loader需要在webpack提前生成的上下文中才能正常运行
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

  /**
   * 将某个节点的name和arguments转换成目标
   */
  convertNode = (node, dirpath, relyInModule) => {
    node.callee.name = '__webpack_require__'
    // 参数字符串名称，例如'react', './MyName.js'
    const moduleName = node.arguments[0].value
    // 生成依赖模块相对【项目根目录】的路径
    const moduleKey = this.getRootPath(dirpath, moduleName)
    // 收集module数组
    relyInModule.push(moduleKey)
    // 替换__webpack_require__的参数字符串，因为这个字符串也是对应模块的moduleKey,需要保持统一
    // 因为ast树中的每一个元素都是babel节点，所以需要使用'@babel/types'来进行生成
    node.arguments = [ types.stringLiteral(moduleKey) ]
  }

  // 解析源码，替换其中的require方法来构建ModuleMap
  parse(source, dirpath) {
    const inst = this
    const ast = parser.parse(source)
    const relyInModule = [] // 获取文件依赖的所有模块
    traverse(ast, {
      // 检索所有的词法分析节点,当遇到函数调用表达式的时候执行,对ast树进行改写
      CallExpression(p) {
        // 因为解析的require是被_interopRequireDefault封装了的
        // 所以需要先找到_interopRequireDefault节点
        if (p.node.callee && p.node.callee.name === '_interopRequireDefault') {
          const innerNode = p.node.arguments[0]
          if (innerNode.callee.name === 'require') {
            inst.convertNode(innerNode, dirpath, relyInModule)
          }
        } else if (p.node.callee.name === 'require') {
          inst.convertNode(p.node, dirpath, relyInModule)
        }
      }
    })
    // 将改写后的ast树重新组装成一份新的代码, 并且和依赖项一同返回
    const moduleCode = generator(ast).code
    return [ moduleCode, relyInModule ]
  }


  /**
   * 根据【文件所在目录】和【文件引入模块的名称】生成【项目根目录的相对路径】
   */
  getRootPath(dirpath, moduleName) {
    if (/^[a-zA-Z\$_][a-zA-Z\d_]*/.test(moduleName)) {
      // 如果模块名满足一个变量的正则，说明引用的是node模块
      return './node_modules/' + moduleName
    } else {
      return './'
      + path.relative(this.root, path.resolve(dirpath, moduleName))
      + (path.extname(moduleName).length === 0 ? '.js' : '')
    }
  }

  /**
   * 发射文件,生成最终的bundle.js
   */
  emitFile() { // 发射打包后的输出结果文件
    // 获取输出文件路径
    const outputFile = path.join(this.distPath, 'bundle.js');
    // 获取输出文件模板
    const templateStr = this.generateSourceCode(path.join(__dirname, '..', "bundleTemplate.ejs"));
    // 渲染输出文件模板
    const code = ejs.render(templateStr, {entryId: this.entryId, modules: this.moduleMap});
    
    this.assets = {};
    this.assets[outputFile] = code;
    // 将渲染后的代码写入输出文件中
    fs.writeFile(outputFile, this.assets[outputFile], function(e) {
      console.log(e)
    });
  }
}

module.exports = Compiler