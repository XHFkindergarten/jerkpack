const BabelLoader = require('./loaders/babelLoader')
const TestPlugin = require('./plugins/TestPlugin')
const resolve = dir => require('path').join(__dirname, dir)

module.exports = {
  // 入口文件地址
  entry: './src/index.js',
  // 输出文件地址
  output: {
    path: resolve('dist'),
    fileName: 'bundle.js'
  },
  // loader
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        // 编译匹配include路径的文件
        include: [
          resolve('src')
        ],
        use: {
          loader: BabelLoader // 通过Babel编译react代码
        }
      }
    ]
  },
  plugins: [
    new TestPlugin() // 一个测试plugin
  ]
}