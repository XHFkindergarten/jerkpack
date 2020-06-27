import React from 'react'

export default function Switch({ handleToggle }) {
  return (
    <button onClick={handleToggle}>Toggle</button>
  )
}