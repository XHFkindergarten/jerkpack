const jerkpack = require('./jerkpack/src/index')

const config = require('./jerkpack.config.js')


jerkpack(config, function (err, stats) {
  if (err || stats.hasError()) {
    console.log('编译出错惹')
  }
})