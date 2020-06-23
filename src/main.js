import React from 'react'
import { render } from 'react-dom'
import MyName from './myName'
function Compo () {
  const name = 'XHFkindergarten'
  return (
    <div>
      <MyName />
      <h>
        <span>Hello, React</span>
      </h>
    </div>
  )
}

render(<Compo />, document.getElementById('container'))

