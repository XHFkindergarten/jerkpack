/**
 * @description: 一个测试plugin
 */

class TestPlugin {
  apply(compiler) {
    compiler.hooks.emit.tap("just4fun", function() {
      console.log('.^ ^')
    })
  }
}

module.exports = TestPlugin
