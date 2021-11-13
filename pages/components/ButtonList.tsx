interface Button {
  label: string
  value: any
  disabled?: boolean
  key?: string
}

export const ButtonList: React.FC<{
  buttons: Button[]
  onClick: (button: Button['value']) => void
}> = ({buttons, onClick}) => {
  return (
    <div className="buttons">
      <style jsx>{`
        .buttons {
          margin: calc(1em - 3px) -5px;
        }
        button {
          margin: 3px 5px;
        }
      `}</style>
      {buttons.map((b, i) => {
        let {label, value, disabled, key} = b
        return (
          <button
            onClick={() => onClick(value)}
            disabled={!!disabled}
            key={key ?? i}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default ButtonList
