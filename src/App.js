import React from 'react'
import Switch from './Switch.js'
export default class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      toggle: false
    }
  }
  handleToggle() {
    this.setState(prev => ({
      toggle: !prev.toggle
    }))
  }
  render() {
    const { toggle } = this.state
    return (
      <div>
        <h1>Hello, { toggle ? 'NervJS' : 'O2 Team'}</h1>
        <Switch handleToggle={this.handleToggle.bind(this)} />
      </div>
    )
  }
}