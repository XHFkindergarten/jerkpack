#! /usr/bin/env node

const filePath = './wahtever.js'

const types = require('@babel/types')

const output = types.stringLiteral(filePath)
console.log(output)
// 

// const fs = require('fs')

// const file = fs.readFileSync(path, 'utf-8')

// const babylon = require('babylon')

// const ast = babylon.parse(file)

// const traverse = require('@babel/traverse').default


// traverse(ast, {
//   CallExpression(p) {
//     console.log(p.node)
//   }
// })