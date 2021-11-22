import React, {useEffect, useRef, useState} from 'react'
import {
  setBuildParserFileAsyncWorkerLoader,
  setGithubRemote,
  languageRegistryDefault,
  LanguageEditor,
  SampleEditor,
  print,
  setEsbuildLoader,
} from '@energetics/lr-util'
import {PseudoList} from './PseudoList'

if (typeof window !== 'undefined') {
  setGithubRemote({
    language: '/api/load-language-from-github',
    tree: '/api/load-tree-from-github',
    esbuild: process.env.NEXT_PUBLIC_VERCEL_ENV
      ? '/api/esbuild-transform'
      : 'http://localhost:3001/api/esbuild-transform',
  })
}
setBuildParserFileAsyncWorkerLoader(async () => {
  if (typeof window === 'undefined') return null
  let {default: worker} = await import(
    '@energetics/lr-util/build/buildParserFileAsyncWorker'
  )
  return worker
})
setEsbuildLoader(async () => {
  if (typeof window === 'undefined') return null
  let esbuild = await import('esbuild-wasm/esm/browser.js')
  let wasmURL = 'https://unpkg.com/esbuild-wasm@0.13.14/esbuild.wasm'
  await esbuild.initialize({wasmURL})
  return esbuild
})

export const Sandbox = () => {
  const languageEditorViewContainer = useRef(null as HTMLDivElement)
  const sampleEditorViewContainer = useRef(null as HTMLDivElement)
  const [nonce, setNonce] = useState(0)
  const [languageEditor] = useState(new LanguageEditor(languageRegistryDefault))
  const [sampleEditor] = useState(new SampleEditor(languageRegistryDefault))

  useEffect(() => {
    languageEditor.mount(languageEditorViewContainer.current)
    languageEditor.addListener('all', () => setNonce(Math.random()))
    languageEditor.openLanguage('json')

    sampleEditor.mount(sampleEditorViewContainer.current)
    sampleEditor.addListener('all', () => setNonce(Math.random()))
    sampleEditor.openSample('json')

    languageEditor.addListener('build', async () => {
      let l = languageEditor.language
      sampleEditor.openSample(l.name)
    })

    return () => {
      languageEditor.destroy()
      sampleEditor.destroy()
    }
  }, [languageEditor, sampleEditor])

  return (
    <div>
      <style jsx>{`
        :global(.cm-editor) {
          border: 1px solid silver;
        }

        :global(.cm-gutter) {
          user-select: none;
        }

        .error {
          color: red;
        }
      `}</style>
      <h1>Lezer Sandbox</h1>
      <PseudoList values={languageRegistryDefault.languageOptions}>
        {(lo: any) => (
          <button
            onClick={async () => {
              languageEditor.openLanguage(lo.module.index)
              sampleEditor.openSample(lo.module.index)
            }}
            onMouseEnter={() => {
              languageRegistryDefault.get(lo.module.index)
            }}
            disabled={
              lo.module.index ===
              (languageEditor.loading.language ?? languageEditor.language?.name)
            }
          >
            {lo.label}
          </button>
        )}
      </PseudoList>
      <hr />
      <PseudoList values={languageEditor.language?.src}>
        {(f: any) => (
          <button
            onClick={() => languageEditor.openFile(f.path)}
            onMouseEnter={() => {
              if (f.load) f.load()
            }}
            disabled={
              f.path ===
              (languageEditor.loading.file?.split?.(':')?.[1] ??
                languageEditor.file.path)
            }
          >
            {(() => {
              return (
                f.path.split('/').slice(-2).join('/').replace(/^\//, '') +
                (f.entry ? ' (entry)' : '')
              )
            })()}
          </button>
        )}
      </PseudoList>
      <div ref={languageEditorViewContainer}></div>
      <p>
        <button
          onClick={() => languageEditor.build()}
          disabled={
            !!(
              languageEditor.loading.language ||
              languageEditor.loading.file ||
              languageEditor.loading.build
            )
          }
        >
          Rebuild
        </button>
      </p>
      {(languageEditor.language?.errors?.parser ||
        languageEditor.language?.errors?.support ||
        languageEditor.language?.errors?.index) && (
        <pre className="error">
          {languageEditor.language.errors.parser?.message ??
            languageEditor.language.errors.parser ??
            languageEditor.language.errors.support?.message ??
            languageEditor.language.errors.support ??
            languageEditor.language.errors.index?.message ??
            languageEditor.language.errors.index}
        </pre>
      )}
      <hr />
      <PseudoList values={sampleEditor.collection?.src} maxLengthCollapsed={10}>
        {(f: any) => (
          <button
            onClick={() => sampleEditor.openFile(f.path)}
            onMouseEnter={() => {
              if (f.load) f.load()
            }}
            disabled={
              f.path ===
              (sampleEditor.loading.file?.split?.(':')?.[1] ??
                sampleEditor.file.path)
            }
          >
            {f.path.split('/').slice(-1)[0]}
          </button>
        )}
      </PseudoList>
      <div ref={sampleEditorViewContainer}></div>
      <p>
        <button onClick={() => setNonce(Math.random())}>Parse</button>
      </p>
      {!!(sampleEditor.editorView && sampleEditor.language?.parser) && (
        <pre>
          <code>
            {print(
              sampleEditor.editorView.state.sliceDoc(0),
              sampleEditor.language.parser
            )}
          </code>
        </pre>
      )}
    </div>
  )
}

export default Sandbox
