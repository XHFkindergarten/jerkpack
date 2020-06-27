/*
 * @author: 风魔小次郎
 * @Date: 2020-06-24 20:16:49
 * @desc: 清空所有的注释
 */ 

module.exports = function CommentLoader(source) {
  const Type1Reg = /\/\/.*[\n\r]/
  const Type2Reg = /\/\*[^\/]*\*\//
  source = source.replace(Type1Reg, '')
  source = source.replace(Type2Reg, '')
  return source
}