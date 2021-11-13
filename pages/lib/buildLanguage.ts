import {Parser} from '@lezer/common'
import {LanguageSupport} from '@codemirror/language'
import loadRepo, {SrcFile, SrcRepo} from './loadRepo'
import buildRepo from './buildRepo'
import languageOptions from '../config'

interface SrcLanguageParams<O = any> {
  repo: SrcRepo
  build: (src: SrcFile[]) => Promise<O>
  onChange: (trigger: string, src: SrcLanguage<O>) => void
}

const cloneSrc = (src: SrcFile[]) => src.slice().map((f) => ({...f}))

export class SrcLanguage<O = any> {
  repo: SrcLanguageParams<O>['repo']
  current: SrcFile[]
  atLastBuild: SrcFile[]
  output: O
  error: any
  stale: boolean
  pristine: boolean
  _build: SrcLanguageParams<O>['build']
  _onChange: SrcLanguageParams<O>['onChange']
  constructor({repo, build, onChange}: SrcLanguageParams<O>) {
    this.repo = repo
    this.current = cloneSrc(repo.src)
    this.atLastBuild = null
    this.output = null
    this.error = null
    this.stale = true
    this._build = build
    this._onChange = onChange
  }
  touch() {
    let prev = this.stale
    let next = true
    this.stale = next
    if (prev !== next) this._onChange('touch', this)
    return this
  }
  modify(path: string, content: string) {
    this.touch()
    let file = this.current.find((f) => f.path === path)
    file.content = content
    this._onChange('modify', this)
    return this
  }
  async build() {
    this.atLastBuild = cloneSrc(this.current)

    let pristine = this.atLastBuild.length === this.repo.src.length
    for (let i in this.atLastBuild) {
      if (!pristine) break
      let lb = this.atLastBuild[i]
      let rs = this.repo.src[i]
      if (lb.path !== rs.path) pristine = false
      if (lb.content !== rs.content) pristine = false
      if (lb.entry !== rs.entry) pristine = false
    }
    this.pristine = pristine

    try {
      if (pristine && this.repo.build) {
        this.output = await this._build([this.repo.build])
      } else {
        this.output = await this._build(this.atLastBuild)
      }
      this.stale = false
    } catch (error) {
      console.error(error)
      this.error = error
    }

    this._onChange('build', this)
    return this
  }
  async reset() {
    this.touch()
    this.current = cloneSrc(this.repo.src)
    await this.build()
    this._onChange('reset', this)
    return this
  }
}

export interface Language {
  parserSrc: SrcLanguage<{parser: Parser}>
  supportSrc: SrcLanguage<LanguageSupport>
}

/**
 * Links parser and support repositories together —
 * including for cross-dependencies, like for JavaScript snippets in HTML.
 * Also includes conveniences for modifying the source code and rebuilding.
 **/
export const buildLanguage = async (
  parserRepoURI: string,
  supportRepoURI: string,
  supportConfig: string,
  onChange = (trigger: string, language: Language) => {}
): Promise<Language> => {
  let [parserRepo, supportRepo] = await Promise.all([
    loadRepo(parserRepoURI, (path) => path.replace('src', 'parser')),
    loadRepo(supportRepoURI, (path) => path.replace('src', 'support')),
  ])

  // WARNING, fragile. SQL & WebAssembly use the same repository for the parser and support
  let supportEntryPath = supportRepo.src.find((f) => f.entry)?.path
  let same = parserRepo.packageJSON.name === supportRepo.packageJSON.name
  if (same) supportRepo.src = []

  let parserSrc = new SrcLanguage<{parser: Parser}>({
    repo: parserRepo,
    build: async (src) => {
      let built = await buildRepo(src)

      // SQL & WebAssembly don't export their parsers in the build
      if (!built.parser && parserSrc.pristine && parserSrc.repo.build) {
        // WARNING, fragile. lang-sql uses `let parser` but never reassigns the variable
        parserSrc.repo.build.content = parserSrc.repo.build.content.replace(
          /(const|let)\s+parser\s+/,
          'export const parser '
        )
        built = await buildRepo(src)
      }

      if (!built.parser) {
        throw new Error('parser == null')
      }
      return built
    },
    onChange: (trigger) => {
      if (parserSrc.stale && supportSrc) supportSrc.stale = true
      onChange(trigger, {parserSrc, supportSrc})
    },
  })
  await parserSrc.build()

  let supportSrc = new SrcLanguage<LanguageSupport>({
    repo: supportRepo,
    build: async (src) => {
      if (same) {
        let truncate = (s: string) => s.replace(/^(support|parser)\//, '')
        src = parserSrc.atLastBuild.slice().map((f) => ({
          ...f,
          entry: truncate(f.path) === truncate(supportEntryPath),
        }))
      }
      const parserPathMaybes = [
        parserSrc.repo.packageJSON.name,
        ...parserSrc.atLastBuild.filter((f) => f.path.endsWith('.grammar')),
      ]

      const supportNoConfig = await buildRepo(src, async (path) => {
        if (parserPathMaybes.includes(path)) return parserSrc.output
        if (path.startsWith('@codemirror/lang-')) {
          path = path.replace(/^@/, '')
          let lo = languageOptions.find((o) => o.support.startsWith(path))
          let l = await buildLanguage(lo.parser, lo.support, 'exports')
          return l.supportSrc.output
        }
      })

      let f = new Function('exports', 'return ' + supportConfig)
      let support = f(supportNoConfig) as LanguageSupport
      if (!support) {
        throw new Error('support == null')
      }

      return support
    },
    onChange: (trigger) => {
      onChange(trigger, {parserSrc, supportSrc})
    },
  })
  await supportSrc.build()

  return {parserSrc, supportSrc}
}

export default buildLanguage
