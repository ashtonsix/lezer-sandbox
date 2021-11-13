import cl from 'classnames'
import {useState} from 'react'

export const CollapseToggle: React.FC<{collapsedByDefault?: boolean}> = ({
  children,
  collapsedByDefault,
}) => {
  const [collapsed, setCollapsed] = useState(collapsedByDefault)
  return (
    <>
      <style jsx>{`
        .collapse-toggle {
          user-select: none;
        }
        .hidden {
          display: none;
        }
      `}</style>
      <p className="collapse-toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? '▸' : '▾'} Expand/Collapse
      </p>
      <div className={cl({hidden: collapsed})}>{children}</div>
    </>
  )
}

export default CollapseToggle
