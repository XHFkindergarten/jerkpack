module.exports = function (api) {
  api.cache(true)
  return {
    "presets": [
      ['@babel/preset-env', {
        targets: {
          "ie": "8"
        },
      }],
      '@babel/preset-react',
    ],
    "plugins": [
      ["@babel/plugin-transform-template-literals", {
        "loose": true
      }],
      [
        "module-resolver", {
          "root": ["."],
          "alias": {
            "react": "nervjs",
            "react-dom": "nervjs",
            // Not necessary unless you consume a module using `createClass`
            "create-react-class": "nerv-create-class"
          }
        }
      ]
    ],
    "compact": true
  }
}