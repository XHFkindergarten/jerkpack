/**
 * @description: 一个测试plugin
 */

class TestPlugin {
  apply(compiler) {
    compiler.hooks.beforeRun.tapAsync("just4fun", function() {
      console.log('[Success] 开始编译')
    })
  }
}

module.exports = TestPlugin
