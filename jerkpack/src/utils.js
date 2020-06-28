/*
 * @author: 风魔小次郎
 * @Date: 2020-06-27 15:34:09
 * @desc: 工具类
 */ 
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

/**
 * 异步读取文件内容并且返回【代码字符串】和【唯一MD5哈希标识】
 * @param {*} path 文件路径
 */
const readFileWithHash = (path) => new Promise((resolve, reject) => {
  // 创建md5哈希对象
  const md5hash = crypto.createHash('md5')
  const stream = fs.createReadStream(path)
  // data收集代码片段
  let data = ''
  stream.on('data', chunk => {
    // md5哈希根据文件内容不断更新
    md5hash.update(chunk)
    data += chunk
  })
  stream.on('error', err => reject(err))
  stream.on('end', () => {
    // 生成唯一MD5标识
    const md5hashStr = md5hash.digest('hex').toUpperCase()
    // 返回文件代码字符串和哈希值
    resolve([data, md5hashStr])
  })
})

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
exports.readFileWithHash = readFileWithHash