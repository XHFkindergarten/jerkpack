/*
 * @Author: 风魔小次郎
 * @Description: Compiler
 */ 
const { AsyncSeriesHook } = require('tapable')
const path = require('path')
const fs = require('fs')
const { getRootPath, completeFilePath } = require('./utils')
const Compilation = require('./Compilation')
const ejs = require("ejs");
const { performance } = require('perf_hooks')
const loadsh = require('lodash')
const resolve = path.resolve

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
    this.distName = output.fileName
    this.loaders = module.rules
    this.plugins = plugins
    this.root = process.cwd() // 根目录
    this.compilation = {} // 编译工具类
    // 入口文件在module中的id
    this.entryId = getRootPath(this.root, entry, this.root)
    this.hooks = {
      // 生命周期
      beforeRun: new AsyncSeriesHook(['compiler']),
      afterRun: new AsyncSeriesHook(['compiler']),
      beforeCompile: new AsyncSeriesHook(['compiler']),
      afterCompile: new AsyncSeriesHook(['compiler']),
      emit: new AsyncSeriesHook(['compiler']),
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
  async run() {
    const startTime = performance.nodeTiming.duration
    // 在特定的生命周期发布消息，触发对应的订阅事件
    this.hooks.beforeRun.callAsync(this)
    this.compilation = new Compilation({
      root: this.root,
      entry: this.entryPath,
      loaders: this.loaders,
      hooks: this.hooks,
      distPath: this.distPath,
      distName: this.distName
    })
    await this.compilation.make()
    // this.hooks.emit.callAsync(this)
    this.emitFile()
    // this.hooks.afterRun.callAsync(this)
    const endTime = performance.nodeTiming.duration
    console.log(`总编译耗时${endTime - startTime}ms`)
  }

  // 读取缓存文件信息
  getStorageCache() {
    const cachePath = resolve(this.distPath, 'manifest.json')
    if (fs.existsSync(cachePath)) {
      const asset = require(cachePath, 'utf-8')
      return asset || {}
    } else {
      return {}
    }
  }

  /**
   * 发射文件,生成最终的bundle.js
   */
  emitFile() { // 发射打包后的输出结果文件
    // 首先对比缓存判断文件是否变化
    const assets = this.compilation.assets
    const pastAssets = this.getStorageCache()
    if (loadsh.isEqual(assets, pastAssets)) {
      // 如果文件hash值没有变化，说明无需重写文件
      // 只需要依次判断每个对应的文件是否存在即可
      // 这一步省略！
    } else {
      // 缓存未能命中
      // 获取输出文件路径
      const outputFile = path.join(this.distPath, this.distName);
      // 获取输出文件模板
      // const templateStr = this.generateSourceCode(path.join(__dirname, '..', "bundleTemplate.ejs"));
      const templateStr = fs.readFileSync(path.join(__dirname, '..', "template.ejs"), 'utf-8');
      // 渲染输出文件模板
      const code = ejs.render(templateStr, {entryId: this.entryId, modules: this.compilation.moduleMap});
      
      this.assets = {};
      this.assets[outputFile] = code;
      // 将渲染后的代码写入输出文件中
      fs.writeFile(outputFile, this.assets[outputFile], function(e) {
        if (e) {
          console.log('[Error] ' + e)
        } else {
          console.log('[Success] 编译成功')
        }
      });
      // 将缓存信息写入缓存文件
      fs.writeFileSync(resolve(this.distPath, 'manifest.json'), JSON.stringify(assets, null, 2))
    }
  }
}

module.exports = Compiler