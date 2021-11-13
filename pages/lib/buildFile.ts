import {Token, tokenizer} from 'acorn'
import {ScriptTarget, transpile as transpileTS} from 'typescript'
import {CacheWithGetter} from './Cache'

export interface QuasiModuleDep {
  path: string
  argument: string
  value: any
}

export interface QuasiModule {
  name: string
  link: (
    resolve: (path: string, quasimodule: QuasiModule) => Promise<any>,
    recursionMaxDepth?: number
  ) => Promise<void>
  run: () => any
  cache: any
  __quasimodule: true
}

const tsCache = new CacheWithGetter(async (src: string) => {
  return transpileTS(src, {target: ScriptTarget.Latest})
})

/**
 * token-level transform that converts ES modules to functions that
 * accept imports as arguments and returns exports
 *
 * WARNING, fails on multiple-declaration exports like:
 *
 * export const a = 5,
 *              b = 3;
 **/
const transpileCache = new CacheWithGetter(async (src: string) => {
  let deps = [] as QuasiModuleDep[]
  let body = 'const __exports = {}\n\n'
  let cursor = 0
  let buffer = [] as Token[]
  let drain = (): string => {
    let result = ''
    let cursor = buffer[0].start
    for (let token of buffer) {
      result += src.slice(cursor, token.start)
      result += src.slice(token.start, token.end)
      cursor = token.end
    }
    buffer = []
    return result
  }
  let peek = (i: number) => {
    let token = tokenizer(src.slice(i), {ecmaVersion: 'latest'}).getToken()
    token.start += i
    token.end += i
    return token
  }
  let nonce = () => '_' + Math.random().toString(36).slice(2, 10)
  for (let token of tokenizer(src, {ecmaVersion: 'latest'})) {
    let bn = token.type?.label
    let bs = {import: 'import', export: 'export'}[bn]
    let b0 = buffer[0]?.type?.label
    let b1 = buffer[1]?.type?.label

    if (!b0) body += src.slice(cursor, token.start)
    cursor = token.end

    if (!bs && !b0) {
      body += src.slice(token.start, token.end)
      continue
    }

    buffer.push(token)

    // `import a, {b as B} from "module"` => `const a = module_jz1cdr; const {b: B} = module_jz1cdr`
    if (b0 === 'import' && bn === 'string') {
      let im = drain()
      let [match, importDefault, importObj, , path] =
        im.match(
          /^import\s*(\w+)?[,\s]*({[\w$\s,]*})?\s*from\s*(['"])(.+?)\3$/
        ) ?? []
      if (!match) {
        body += im
        continue
      }
      let argument = path.replace(/\W+/g, '_') + nonce()
      if (importDefault) {
        body += `const ${importDefault} = ${argument}\n`
      }
      if (importObj) {
        importObj = importObj.replaceAll(/\s+as\s+/g, ':')
        body += `const ${importObj} = ${argument}\n`
      }
      deps.push({path, argument, value: undefined})
      continue
    }

    // `export {a as A}` => `Object.assign(__exports, {A: a})`
    if (b0 === 'export' && b1 === '{' && bn === '}') {
      if (peek(cursor).value === 'from') continue
      let ex = drain()
      ex = ex.replace(/^export\s*/, '')
      ex = ex.replaceAll(/(\w+)\s+as\s+(\w+)/g, '$2: $1')
      body += `Object.assign(__exports, ${ex})\n`
      continue
    }

    // `export {a as A} from 'module'` => `Object.assign(__exports, {A: module_tdi8od.a})`
    if (b0 === 'export' && b1 === '{' && bn === 'string') {
      let ex = drain()
      let [match, exportStr, , path] =
        ex.match(/^export\s*{([\w\s,]*)}\s*from\s*(['"])(.+?)\2$/) ?? []
      let argument = path.replace(/\W+/g, '_') + nonce()

      if (!match) {
        body += ex
        continue
      }
      let exports = exportStr.split(',').map((e) => {
        let [named, renamed] = e.split(/\s+as\s+/)
        if (!renamed) renamed = named
        named = named.trim()
        renamed = renamed.trim()
        return `${renamed}: ${argument}.${named}`
      })
      body += `Object.assign(__exports, {${exports.join(', ')}})`
      deps.push({path, argument, value: undefined})
      continue
    }

    // `export const a = 0` => `const a = __exports.a = 0`
    // `export default a` => `__exports.default = a`
    // `export function a(` => `var a = __exports.a = function a(`
    if (b0 === 'export' && b1 && b1 !== '{') {
      let ex = drain()
      let [, keyword, name] = ex.match(/^export\s*(\w+)\s+(\w*)/) ?? []
      switch (keyword) {
        case 'const':
        case 'let':
          body += `${keyword} ${name} = __exports.${name}`
          break
        case 'default':
          body += `__exports.default = ${name}`
          break
        case 'function':
          body += `var ${name} = __exports.${name} = function ${name}`
          break
        case 'class':
          body += `var ${name} = __exports.${name} = class ${name}`
          break
        default:
          body += ex
      }
      continue
    }
  }
  body += '\n\nreturn __exports\n'
  return {body, deps}
})

const runCache = new CacheWithGetter(
  async (body: string, args: string, ...vals: any[]) => {
    return new Function(...args.split(','), body)(...vals)
  }
)

/**
 * Builds and executes individual files, including TypeScript and ESM transpiling.
 *
 * `resolve` is used to ask buildRepo for help with linking all dependencies.
 **/
export const buildFile = async (src: string, name: string = null) => {
  if (name?.endsWith('.ts')) {
    let ts = await tsCache.get([src])
    if (ts.error) throw ts.error
    src = ts.value
  }

  const tp = await transpileCache.get([src])
  if (tp.error) throw tp.error
  const {body, deps} = tp.value

  const link = async (
    resolve: (path: string, quasimodule) => Promise<any>,
    recursionMaxDepth = 5
  ) => {
    let resolved = deps.map(async (d) => {
      let r = await resolve(d.path, quasimodule)
      if (r?.__quasimodule && recursionMaxDepth >= 1) {
        await r.link(resolve, recursionMaxDepth - 1)
      }
      return r
    })
    let imports = await Promise.all(resolved)
    for (let i in imports) deps[i].value = imports[i]
  }

  const run = async () => {
    for (let {value, path} of deps) {
      if (value !== undefined) continue
      let n = name ? `, in "${name}"` : ''
      let msg = `No resolution found for "${path}"${n}. Have you linked the dependencies?`
      throw new Error(msg)
    }

    let args = deps.map((d) => d.argument).join(',')
    let vals = await Promise.all(
      deps.map((d) => (d.value?.__quasimodule ? d.value.run() : d.value))
    )
    let {value, error} = await runCache.get([body, args, ...vals])
    if (error) throw error
    return value
  }

  const quasimodule = {
    name,
    link,
    run,
    __quasimodule: true,
  } as QuasiModule

  return quasimodule
}

export default buildFile
