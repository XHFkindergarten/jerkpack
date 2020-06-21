#! /usr/bin/env node

// const filePath = './wahtever.js'

// const types = require('@babel/types')

// const output = types.stringLiteral(filePath)

// console.log(output)

const path = './src/main.js'

const fs = require('fs')
const { type } = require('os')

let file = fs.readFileSync(path, 'utf-8').trim()




console.log(file)

// fs.writeFileSync('./tempfile', file)

// const ast = require('babylon').parse(file)

// ast.program.body.forEach(item => {
//   console.log(item)
// });

// console.log(ast.program.body[0].declarations)

// const traverse = require('@babel/traverse').default


// traverse(ast, {
//   CallExpression(p) {
//     console.log(p.node)
//   }
// })