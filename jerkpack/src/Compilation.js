/*
 * @author: 风魔小次郎
 * @Date: 2020-06-27 15:18:20
 * @desc: Compilation类，编译过程中真正干活的类
 */ 


const fs = require('fs')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const types = require('@babel/types')
const generator = require('@babel/generator').default
const { 
  getRootPath,
  completeFilePath,
  readFileWithHash
} = require('./utils')
const path = require('path')

const resolve = path.resolve

module.exports = class Compilation {
  constructor(props) {
    const {
      entry,
      root,
      loaders,
      hooks,
      distPath,
      distName
    } = props
    this.entry = entry
    this.root = root
    this.loaders = loaders
    this.hooks = hooks
    this.distPath = distPath
    this.assets = {}
  }
  // 入口路径
  entry = ''

  // 存放处理完毕的模块代码Map
  moduleMap = {}

  // 开始编译
  async make() {
    await this.moduleWalker(this.entry)
  }
  

  // 根据依赖将所有被引用过的文件都进行编译
  async moduleWalker(sourcePath) {
    if (sourcePath in this.moduleMap) return
    // 在读取文件时，我们需要完整的以.js结尾的文件路径
    sourcePath = completeFilePath(sourcePath)
    const [ sourceCode, md5Hash ] = await this.loaderParse(sourcePath)
    const modulePath = getRootPath(this.root, sourcePath, this.root)
    // 获取模块编译后的代码和模块内的依赖数组
    const [ moduleCode, relyInModule ] = this.parse(sourceCode, path.dirname(modulePath))
    // 将模块代码放入ModuleMap
    this.moduleMap[modulePath] = moduleCode
    this.assets[modulePath] = md5Hash
    // 再依次对模块中的依赖项进行解析
    for(let i=0;i<relyInModule.length;i++) {
      await this.moduleWalker(relyInModule[i], path.dirname(relyInModule[i]))
    }
  }

  // 生成源代码
  async loaderParse(entryPath) {
    // 用utf8格式读取文件内容
    // let content = fs.readFileSync(entryPath, 'utf-8')
    let [ content, md5Hash ] = await readFileWithHash(entryPath)
    // 获取用户注入的loader
    const { loaders } = this
    // 依次遍历所有loader
    for(let i=0;i<loaders.length;i++) {
      const loader = loaders[i]
      const { test : reg, use } = loader
      if (entryPath.match(reg)) {
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
    return [ content, md5Hash ]
  }

  /**
   * 将某个节点的name和arguments转换成目标
   */
  convertNode = (node, dirpath, relyInModule) => {
    node.callee.name = '__webpack_require__'
    // 参数字符串名称，例如'react', './MyName.js'
    let moduleName = node.arguments[0].value
    // 生成依赖模块相对【项目根目录】的路径
    let moduleKey = completeFilePath(getRootPath(dirpath, moduleName, this.root))
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
      // 删除所有的注释节点
      // enter(p) {
      //   if (p.node.leadingComments) {
      //     p.node.leadingComments = undefined
      //   }
      //   if (p.node.trailingComments) {
      //     p.node.trailingComments = undefined
      //   }
      // },
      // 检索所有的词法分析节点,当遇到函数调用表达式的时候执行,对ast树进行改写
      CallExpression(p) {
        // 有些require是被_interopRequireDefault包裹的
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
}
