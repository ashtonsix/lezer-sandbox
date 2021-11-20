import {useState, useEffect} from 'react'

export const PseudoList = <T extends any>(props: {
  values: T[]
  children: (value: T) => any
  maxLengthCollapsed?: number
}) => {
  let {values, children, maxLengthCollapsed = 999} = props
  let [expanded, setExpanded] = useState(false)
  useEffect(() => setExpanded(false), [values])
  if (!values?.length) return null
  let showMoreButton = false
  if (!expanded && values.length > maxLengthCollapsed) {
    values = values.slice(0, maxLengthCollapsed - 1)
    showMoreButton = true
  }

  return (
    <ul
      style={{
        padding: 0,
        margin: '16px -5px',
        listStyle: 'none',
        display: 'flex',
        flexWrap: 'wrap',
      }}
    >
      {values.map((value, i) => (
        <li key={i} style={{display: 'block', padding: '3px 5px'}}>
          {children(value)}
        </li>
      ))}
      {showMoreButton && (
        <li style={{display: 'block', padding: '3px 5px'}}>
          <button onClick={() => setExpanded(true)}>More</button>
        </li>
      )}
    </ul>
  )
}
