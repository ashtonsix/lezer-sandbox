declare module '*.uq' {
  const value: string
  export default value
}

declare module '*.grammar' {
  const value: string
  export default value
}

declare module '*.toml' {
  const value: string
  export default value
}

declare module '*.md' {
  let MDXComponent: (props: any) => JSX.Element
  export default MDXComponent
}

declare module '*.mdx' {
  let MDXComponent: (props: any) => JSX.Element
  export default MDXComponent
}
