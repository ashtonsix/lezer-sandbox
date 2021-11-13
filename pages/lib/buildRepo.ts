import buildFile from './buildFile'
import {SrcFile} from './loadRepo'
import {CacheWithGetter} from './Cache'

const dependencyLoaders = {
  '@lezer/lr': () => import('@lezer/lr'),
  '@lezer/common': () => import('@lezer/common'),
  '@lezer/generator': () => import('@lezer/generator'),
  '@codemirror/autocomplete': () => import('@codemirror/autocomplete'),
  '@codemirror/highlight': () => import('@codemirror/highlight'),
  '@codemirror/language': () => import('@codemirror/language'),
  '@codemirror/lint': () => import('@codemirror/lint'),
  '@codemirror/state': () => import('@codemirror/state'),
  '@codemirror/view': () => import('@codemirror/view'),
}

const grammarCache = new CacheWithGetter(
  async (grammar: string) => {
    return new Promise<{parser: string; terms: string}>((resolve, reject) => {
      let worker = new Worker(new URL('./buildGrammar.ts', import.meta.url))
      worker.postMessage(grammar)
      worker.onmessage = (e) => {
        let {parser, terms, error} = JSON.parse(e.data)
        worker.terminate()
        if (error) {
          reject(error)
          return
        }
        resolve({parser, terms})
      }
    })
  },
  {parser: null, terms: null}
)

const buildGrammar = async (grammar: SrcFile) => {
  let {
    value: {parser, terms},
    error,
  } = await grammarCache.get([grammar.content])
  if (error) throw error
  terms = terms.replaceAll(/,\s+/g, '\nexport const ')
  let path = grammar.path.replace(/(\.ts|\.js)$/, '')
  let result: {parser: SrcFile; terms: SrcFile} = {
    parser: {
      path,
      content: parser,
      url: grammar.url,
      entry: true,
    },
    terms: {
      path: path + '.terms',
      content: terms,
      url: grammar.url,
      entry: false,
    },
  }
  return result
}

const resolvePath = (base: string, path: string): string => {
  let n = base.split('/').slice(0, -1)
  for (let p of path.split('/')) {
    if (p === '..') n.pop()
    if (p === '...') n.pop(), n.pop()
    if (/^\.{1,3}$/.test(p)) continue
    n.push(p)
  }
  return n.join('/')
}

/**
 * Links and executes files within a single repository, uses buildFile to build them.
 * `resolve` is used to ask buildLanguage for help with linking across repositories.
 */
export const buildRepo = async (
  src: SrcFile[],
  resolve = (path: string) => Promise.resolve(null)
) => {
  let entry = src.find((f) => f.entry)
  let grammar = src.find((f) => f.path.endsWith('.grammar'))
  if (grammar) {
    let {parser, terms} = await buildGrammar(grammar)
    let i = src.findIndex((f) => f.path.endsWith('.grammar'))
    src = src.slice()
    src.splice(i, 1, parser, terms)
    if (entry === grammar) entry = parser
  }

  let localDependencies = {}
  for (let s of src) {
    let p = s.path.replace(/(\.ts|\.js)$/, '')
    localDependencies[p] = s
  }

  let module = await buildFile(entry.content, entry.path)

  await module.link(async (path, quasimodule) => {
    if (path.startsWith('.')) {
      path = resolvePath(quasimodule.name, path)
      path = path.replace(/(\.ts|\.js)$/, '')
    }

    let linked =
      (await resolve(path)) ??
      (await dependencyLoaders[path]?.()) ??
      localDependencies[path]

    if (!linked && path.endsWith('.terms')) {
      linked = src.find((f) => f.path.endsWith('.terms'))
    }

    if (!linked) {
      console.error(`Could not find:`, src)
      throw new Error(`Could not find "${path}"`)
    }

    if (linked.content && linked.path) {
      linked = await buildFile(linked.content, linked.path)
    }

    return linked
  })

  return module.run()
}

export default buildRepo
