/*
 * @author: 风魔小次郎
 * @Date: 2020-06-27 15:34:09
 * @desc: 工具类
 */ 
const path = require('path')
const fs = require('fs')

/**
 * @description: 根据用户在代码中的引用生成相对根目录的相对路径
 */
function getRootPath (dirpath, moduleName, root) {
  if (/^[a-zA-Z\$_][a-zA-Z\d_]*/.test(moduleName)) {
    // 如果模块名满足一个变量的正则，说明引用的是node模块
    return './node_modules/' + moduleName
  } else {
    return './'
    + path.relative(root, path.resolve(dirpath, moduleName))
    + (path.extname(moduleName).length === 0 ? '.js' : '')
  }
}
/**
 * @description: 模糊文件查询,补充文件后缀
 */
function completeFilePath(path) {
  try {
    if (!path.endsWith('.js')) {
      // 如果路径不以.js结尾，那么需要做判断
      if (fs.existsSync(path + '.js')) {
        // 如果加上.js就是存在的文件，那么直接使用
        return path + '.js'
      } else if (fs.existsSync(path + '/index.js')) {
        return path + '/index.js'
      } else {
        throw new Error(`[error]读取${path}内容时出错`)
      }
    } else {
      return path
    }
  } catch (e) {
    console.log(e)
  }
}


exports.getRootPath = getRootPath
exports.completeFilePath = completeFilePath