/**
 * 用正则实现一个JSX语法编译器
 */
module.exports = function ReactLoader (source) {
  // 收集当前模块内的所有变量,作用域链上的变量没法收集，因为需要进行词法分析
  const moduleVariableSet = new Set()
  // 将ES6的import和export语法转换为CommonJS
  // [a-zA-Z\$_][a-zA-Z\d_]* 为检索合理的变量命名
  const ImportReg = /import\s+([a-zA-Z\$_][a-zA-Z\d_]*)\s*from\s*'(\S+)'/g
  source = source.replace(ImportReg, (_, variableName, depend) => {
    if (moduleVariableSet.has(variableName)) {
      // 如果存在变量名重复
      throw new SyntaxError('存在已经声明过的变量')
    }
    // 收集被引用的变量
    moduleVariableSet.add(variableName)
    return `const ${variableName} = require('${depend}')`
  })
  const ExportReg = /export\s+default/g
  source = source.replace(ExportReg, `module.exports =`)
  const ExportVariableReg = /export\s+(const|let|var)\s+([a-zA-Z\$_][a-zA-Z\d_]*)\s+/g
  source = source.replace(ExportVariableReg, `exports.$2 `)
  const ExportFunctionReg = /export\s+function\s*([a-zA-Z\$_][a-zA-Z\d_]*)/g
  source = source.replace(ExportFunctionReg, `exports.$1 = function `)

  // 检索JSX内容的reg
  const JSXReg = /return[\s\n\r]*\(?[\n\r\s]*(<[^\)]*>)[\n\r\s]*\)?/gm

  // 将对象拼接成特殊格式的JSON字符串
  const obj2JSONSTR = obj => {
    let output = '{'
    const entries = []
    const keys = Object.keys(obj)
    for(let key of keys) {
      entries.push(`${key}: ${typeof obj[key] === 'string' ? obj[key] : obj2JSONSTR(obj[key])}`)
      output += `${key}: ${typeof obj[key] === 'string' ? obj[key] : obj2JSONSTR(obj[key])}`
    }
    return `{${entries.toString()}}`
  }
  // 将标签属性转换成对象形式
  const formatProps = (source) => {
    const keyValueReg = /(\S+)=(\S+)/ // 键值对正则
    const braceStrReg = /{['"]([^'"]*)['"]}/  // 大括号包裹字符串正则
    const braceVarReg = /{([^'"]*)}/  // 大括号包裹变量正则
    const output = {}
    if ( typeof source !== 'string') {
      return '{}'
    }
    source = source.trim()
    if (source.length === 0) {
      return '{}'
    }
    const attrs = source.split(/\s+/)
    attrs.forEach(item => {
      let [ , key, value ] = item.match(keyValueReg)
      // 处理JSX中{}大括号包裹变量的写法
      if (value.match(braceStrReg)) {
        value = value.replace(braceStrReg, '"$1"')
      } else if (value.match(braceVarReg)) {
        value = value.replace(braceVarReg, "$1")
      }
      Object.assign(output, {
        [key]: value
      })
    })
    return obj2JSONSTR(output)
  }
  // 纯Text的标签
  const TEXT_LABEL_NAME = 'TEXTLABEL'
  /**
   * 将一段JSX文本转换成JS格式
   * React.createElement(
   *   type : String,
   *   props : Object,
   *   children: Array<Element>
   * )
   */
  const JSX2Obj = target => {
    // 去除换行符
    target = target.replace(/[\n\r]/g, '')
    // 去除标签之间的空格
    target = target.replace(/>(\s+)</g, '><')
    // 将文字内容转换成标签
    target = target.replace(/>([^<>]+)</g, `><${TEXT_LABEL_NAME} content="$1" /><`)
    const tags = target.match(/<[^<>]*>/g)
    // vdom队列,作为一个栈来用
    const queue = [{
      type: 'Global',
      props: '{}',
      children: []
    }]
    // 当前语法分析所处的队列层级
    let queueIndex = 0
    // 获取标签内元素的正则
    const LabelReg = /<\/?([A-Za-z]+)\s*([^\/]*)\s*\/?>/
    // 获取文字标签的内容
    const textContentReg = /content=\s*(['"].*['"])/
    for(let i=0;i<tags.length;i++) {
      const item = tags[i]
      const [ , type, props ] = item.match(LabelReg) || [ null, TEXT_LABEL_NAME, {} ]
      if (!type) {
        throw new SyntaxError('JSX格式错误')
      }
      if (item.startsWith(`<${TEXT_LABEL_NAME}`)) {
        // 是文字内容
        queue[queueIndex].children.push({
          type: TEXT_LABEL_NAME,
          props: props.match(textContentReg)[1],
          children: []
        })
      } else if (item.endsWith('/>')) {
        // 如果是自闭合标签
        queue[queueIndex].children.push({
          type,
          props: formatProps(props),
          children: []
        })
      } else if (item.startsWith('</')) {
        // 是尾标签
        queueIndex--
        queue.pop()
      } else {
        // 是头标签
        const createElement = {
          type,
          props: formatProps(props),
          children: []
        }
        queue[queueIndex++].children.push(createElement)
        queue.push(createElement)
      }
    }
    if (queue.length > 1) {
      throw new SyntaxError('存在未闭合的标签')
    }
    
    // 深度遍历队列结构生成最终代码
    const dfs = item => {
      if (item.type === TEXT_LABEL_NAME) {
        // 纯文本直接返回文字内容
        return item.props
      }
      return `React.createElement(
    ${moduleVariableSet.has(item.type) ? item.type : `'${item.type}'`},
    ${item.props},
    ${
      !item.children || item.children.length === 0
        ? 'null'
        : `[
        ${item.children.map(i => dfs(i))}
      ]`}
  )`
    }
    return 'return ' + dfs(queue[0].children[0])
  }

  source = source.replace(JSXReg, (...args) => JSX2Obj(args[1]))
  return source
}