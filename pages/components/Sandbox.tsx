import React, {useEffect, useRef, useState} from 'react'
import {EditorState, basicSetup} from '@codemirror/basic-setup'
import {EditorView, ViewPlugin} from '@codemirror/view'
import {LanguageSupport} from '@codemirror/language'
import cl from 'classnames'
import {SrcFile, Language, buildLanguage, Cache, CacheWithGetter} from '../lib'
import ButtonList from './ButtonList'
import CollapseToggle from './CollapseToggle'
import languageOptions, {defaultLanguageOption, LanguageOption} from '../config'
import parseAndPrint from './parseAndPrint'

const llo = languageOptions.find((l) => l.label === 'Lezer')
const jlo = languageOptions.find((l) => l.label === 'JavaScript')

const srcCache = new Cache<[string, string], SrcFile[]>()
/**
 * For reinstating a modified source.
 * Not a performance enhancement (`buildLanguage` already has caching for the slow bits).
 **/
const buildLanguageCached = async (
  parserRepoURI: string,
  supportRepoURI: string,
  supportConfig: string,
  onChange?: (trigger: string, language: Language) => void
) => {
  let language = await buildLanguage(
    parserRepoURI,
    supportRepoURI,
    supportConfig,
    onChange
  )
  language.parserSrc.current =
    srcCache.get(['parser', parserRepoURI]) ?? language.parserSrc.current
  language.supportSrc.current =
    srcCache.get(['support', supportRepoURI]) ?? language.supportSrc.current
  srcCache.set(['parser', parserRepoURI], language.parserSrc.current)
  srcCache.set(['support', supportRepoURI], language.supportSrc.current)
  await language.parserSrc.build()
  await language.supportSrc.build()
  return language
}

const sampleCache = new CacheWithGetter(async (url: string) => {
  let res = await fetch(url)
  let content = await res.text()
  let path = 'sample/' + url.split('/').slice(-1)[0]
  if (res.status !== 200) {
    throw new Error(`Could not find "${url}"`)
  }
  const f: SrcFile = {content, path, url, entry: true}
  return f
})

// created to (mostly) opt-out of React's state management
class State {
  languageOption: LanguageOption
  languageEditorView: EditorView
  sampleEditorView: EditorView
  javascript: LanguageSupport
  typescript: LanguageSupport
  lezer: LanguageSupport
  language: Language
  languageEditorOpenFile: SrcFile
  sampleEditorOpenFile: SrcFile
  sampleEditorLoadError: any
  defaultExtensions = [basicSetup]
  dead = false
  onChange: () => void
  constructor({
    languageEditorContainer,
    sampleEditorContainer,
    onChange,
  }: {
    languageEditorContainer: HTMLElement
    sampleEditorContainer: HTMLElement
    onChange: () => void
  }) {
    // create language editor
    this.languageEditorView = new EditorView({
      state: EditorState.create({doc: '', extensions: this.defaultExtensions}),
      parent: languageEditorContainer,
    })

    // create sample
    this.sampleEditorView = new EditorView({
      state: EditorState.create({doc: '', extensions: this.defaultExtensions}),
      parent: sampleEditorContainer,
    })

    this.onChange = () => {
      if (!this.dead) onChange()
    }

    // load support for language editor
    let ejs = 'exports.javascriptLanguage'
    let ets = 'exports.typescriptLanguage'
    Promise.all([
      buildLanguageCached(jlo.parser, jlo.support, ejs),
      buildLanguageCached(jlo.parser, jlo.support, ets),
      buildLanguageCached(llo.parser, llo.support, llo.supportConfig),
    ]).then(([javascriptSrc, typescriptSrc, lezerSrc]) => {
      this.javascript = javascriptSrc.supportSrc.output
      this.typescript = typescriptSrc.supportSrc.output
      this.lezer = lezerSrc.supportSrc.output
      this.refreshLanguageEditor()
    })
  }
  async setLanguageOption(languageOption: LanguageOption) {
    let lo = languageOption
    this.languageOption = lo

    let has =
      srcCache.get(['parser', lo.parser]) &&
      srcCache.get(['support', lo.support])

    this.saveLanguageEditorOpenFile()
    if (!has) {
      // in "if" to avoid unnecessary scroll jump
      this.language = null
      this.languageEditorOpenFile = null
      this.refreshLanguageEditor()
    }

    let language = await buildLanguageCached(
      lo.parser,
      lo.support,
      lo.supportConfig,
      async (trigger) => {
        this.onChange()
        if (trigger === 'build') {
          this.refreshLanguageEditor()
          this.refreshSampleEditor()
        }
      }
    )

    if (this.languageOption !== lo) return

    this.language = language
    this.languageEditorOpenFile =
      []
        .concat(language.parserSrc.current, language.supportSrc.current)
        .find((f) => f.path === this.languageEditorOpenFile?.path) ??
      language.parserSrc.current[0]
    this.refreshLanguageEditor()
    this.refreshSampleEditor()
  }
  setLanguageEditorOpenFile(path: string) {
    this.saveLanguageEditorOpenFile()

    let l = this.language
    let src = path.startsWith('parser') ? l.parserSrc : l.supportSrc
    let file = src.current.find((f) => f.path === path)

    if (!file) return

    this.languageEditorOpenFile = file
    this.refreshLanguageEditor()
  }
  async setSampleEditorOpenFile(url: string) {
    this.sampleEditorOpenFile = null
    this.sampleEditorLoadError = null
    this.refreshSampleEditor()

    const {value, error} = await sampleCache.get([url])
    this.sampleEditorOpenFile = value
    this.sampleEditorLoadError = error
    this.refreshSampleEditor()
  }
  saveLanguageEditorOpenFile() {
    let content = this.languageEditorView.state.doc.sliceString(0)
    let path = this.languageEditorOpenFile?.path
    if (!path) return
    let l = this.language
    let src = path.startsWith('parser') ? l.parserSrc : l.supportSrc
    src.modify(path, content)
  }
  saveSampleEditorOpenFile() {
    let content = this.sampleEditorView.state.doc.sliceString(0)
    if (this.sampleEditorOpenFile) {
      this.sampleEditorOpenFile.content = content
    }
  }
  refreshLanguageEditor() {
    if (this.dead) return

    let view = this.languageEditorView
    let file = this.languageEditorOpenFile
    let doc = file?.content ?? ''

    let extensions = this.defaultExtensions.slice()
    if (file) {
      let {parserSrc, supportSrc} = this.language ?? {}
      let touch = ViewPlugin.fromClass(
        class {
          update() {
            let src = file.path.startsWith('parser') ? parserSrc : supportSrc
            src.touch()
          }
        }
      )
      extensions.push(touch)
      let filetype = file.path.match(/\.(\w+)$/)?.[1]
      let lang = {grammar: this.lezer, js: this.javascript, ts: this.typescript}
      if (lang[filetype]) {
        extensions.push(lang[filetype])
      }
    }

    view.setState(EditorState.create({doc, extensions}))
    this.onChange()
  }
  refreshSampleEditor() {
    if (this.dead) return

    let view = this.sampleEditorView
    let file = this.sampleEditorOpenFile
    let doc = file?.content ?? ''

    let extensions = this.defaultExtensions.slice()
    let support = this.language?.supportSrc?.output
    if (support) extensions.push(support)

    view.setState(EditorState.create({doc, extensions}))
    this.onChange()
  }
  teardown() {
    this.languageEditorView.destroy()
    this.sampleEditorView.destroy()
    this.dead = true
  }
}

const Sandbox: React.FC = () => {
  const [nonce, setNonce] = useState(0)
  const [state, setState] = useState(null as State)

  // dlo does nothing in production. stops React resetting the selected
  // language when you modify the sandbox's source code in development
  const [dlo, setDLO] = useState(defaultLanguageOption)

  const [supportConfig, setSupportConfig] = useState(dlo.supportConfig)
  const [sampleURI, setSampleURI] = useState(dlo.sample)
  const [parsed, setParsed] = useState('')
  const [loading, setLoading] = useState(true)

  const sampleEditorContainer = useRef(null as HTMLDivElement)
  const languageEditorContainer = useRef(null as HTMLDivElement)
  const sampleEditorOpenFile = state?.sampleEditorOpenFile
  const sampleEditorLoadError = state?.sampleEditorLoadError
  const languageEditorOpenFile = state?.languageEditorOpenFile

  const {parserSrc, supportSrc} = state?.language ?? {}
  const parser = parserSrc?.output?.parser
  const support = supportSrc?.output

  useEffect(
    () => {
      let state = new State({
        sampleEditorContainer: sampleEditorContainer.current,
        languageEditorContainer: languageEditorContainer.current,
        onChange: () => {
          setNonce(Math.random())
        },
      })
      state.setSampleEditorOpenFile(dlo.sample)
      state.setLanguageOption(dlo).then(() => setLoading(false))
      setState(state)
      return () => {
        state.teardown()
      }
    },
    // eslint-disable-next-line
    []
  )

  return (
    <div>
      <style jsx>{`
        :global(.cm-editor) {
          border: 1px solid silver;
        }

        form {
          margin: 1em 0;
        }
        form input {
          width: 100%;
          margin-top: 3px;
        }

        .error {
          margin-top: 3px;
          color: red;
        }
      `}</style>
      <h1>Lezer Sandbox</h1>
      <p>Select a language:</p>
      <ButtonList
        onClick={async (lo) => {
          setSampleURI(lo.sample)
          setSupportConfig(lo.supportConfig)
          state.saveSampleEditorOpenFile()
          state.setSampleEditorOpenFile(lo.sample)
          setParsed(null)
          setLoading(true)
          setDLO(lo)
          await state.setLanguageOption(lo)
          setLoading(false)
        }}
        buttons={languageOptions.map((l: LanguageOption) => ({
          label: l.label,
          value: l,
          disabled:
            l.parser === state?.languageOption?.parser &&
            l.support === state?.languageOption?.support,
        }))}
      />
      <div>
        <h2>Language Source:</h2>
        <CollapseToggle>
          <ButtonList
            onClick={(value) => {
              state.setLanguageEditorOpenFile(value)
            }}
            buttons={(() => {
              let b = []
                .concat(parserSrc?.current ?? [], supportSrc?.current ?? [])
                .map((f: SrcFile) => ({
                  label: f.path + (f.entry ? ' (entry)' : ''),
                  value: f.path,
                  disabled: f.path === languageEditorOpenFile.path,
                }))
              if (!b.length) {
                b.push({label: 'Untitled', value: null, disabled: true})
              }
              return b
            })()}
          />
          <div ref={languageEditorContainer} />
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              setLoading(true)
              let lo = {...state.languageOption}
              lo.supportConfig = supportConfig
              state.saveSampleEditorOpenFile()
              setDLO(lo)
              await state.setLanguageOption(lo)
              setLoading(false)
            }}
          >
            <label>
              Configuration:
              <br />
              <input
                value={supportConfig}
                onChange={(e) => setSupportConfig(e.target.value)}
              />
            </label>
            {(() => {
              let pe = state?.language?.parserSrc?.error
              let se = state?.language?.supportSrc?.error
              let e = pe?.message ?? pe ?? se?.message ?? se
              if (!e) return null
              return <div className="error">{e}</div>
            })()}
            <p>
              <button type="submit" disabled={loading}>
                rebuild
              </button>
            </p>
          </form>
        </CollapseToggle>
      </div>
      <div>
        <h2>Sample:</h2>
        <CollapseToggle>
          <ButtonList
            buttons={[
              {
                label: sampleEditorOpenFile?.path ?? 'Untitled',
                value: null,
                disabled: true,
              },
            ]}
            onClick={() => {}}
          />
          <div ref={sampleEditorContainer} />
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await state.setSampleEditorOpenFile(sampleURI)
              setParsed(null)
            }}
          >
            <label>
              URL:
              <br />
              <input
                value={sampleURI}
                onChange={(e) => setSampleURI(e.target.value)}
              />
            </label>
            {!!sampleEditorLoadError && (
              <div className="error">
                {sampleEditorLoadError?.message ?? sampleEditorLoadError}
              </div>
            )}
            <p>
              <button
                type="submit"
                disabled={state?.sampleEditorOpenFile?.url === sampleURI}
              >
                refetch
              </button>
            </p>
          </form>
        </CollapseToggle>
        <p>
          <button
            onClick={() => {
              state.saveSampleEditorOpenFile()
              let parsed = parseAndPrint(
                state.sampleEditorOpenFile.content,
                parser
              )
              setParsed(parsed)
            }}
            disabled={!parser || !support}
          >
            parse
          </button>
        </p>
        {!!parsed && (
          <pre>
            <code>{parsed}</code>
          </pre>
        )}
      </div>
    </div>
  )
}

export default Sandbox
