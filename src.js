const jerkpack = require('./jerkpack/src/index')

const resolve = dir => require('path').join(__dirname, dir)

const ReactLoader = require('./loaders/ReactLoader')

const TestPlugin = require('./plugins/TestPlugin')

// 创建配置项

const config = {
  // 入口文件地址
  entry: './src/main.js',
  // 输出文件地址
  output: {
    path: resolve('dist')
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        // 编译匹配include路径的文件
        include: [
          resolve('src')
        ],
        use: {
          loader: ReactLoader
        }
      }
    ]
  },
  plugins: [
    new TestPlugin() // 一个测试plugin
  ]
}

jerkpack(config, function (err, stats) {
  if (err || stats.hasError()) {
    console.log('编译出错惹 qaq')
  }
})