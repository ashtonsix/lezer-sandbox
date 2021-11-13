export interface LanguageOption {
  label: string
  parser: string
  support: string
  supportConfig: string
  sample: string
}

let gh = 'https://raw.githubusercontent.com/'
let sp = gh + 'TheRenegadeCoder/sample-programs/main/archive/'

export const languageOptions: LanguageOption[] = [
  {
    label: 'Basic Example',
    parser: 'codemirror/lang-example@main',
    support: 'codemirror/lang-example@main:index.ts',
    supportConfig: 'exports.EXAMPLELanguage',
    sample: '/examples/example.basic-example',
  },
  {
    label: 'CSS',
    parser: 'lezer-parser/css@latest',
    support: 'codemirror/lang-css@latest',
    supportConfig: 'exports.cssLanguage',
    sample: '/examples/example.css',
  },
  {
    label: 'C++',
    parser: 'lezer-parser/cpp@latest',
    support: 'codemirror/lang-cpp@latest',
    supportConfig: 'exports.cppLanguage',
    sample: sp + 'c/c-plus-plus/prime-number.cpp',
  },
  {
    label: 'HTML',
    parser: 'lezer-parser/html@latest',
    support: 'codemirror/lang-html@latest',
    supportConfig:
      'exports.html({matchClosingTags: false, autoCloseTags: true})',
    sample: '/examples/example.html',
  },
  {
    label: 'Java',
    parser: 'lezer-parser/java@latest',
    support: 'codemirror/lang-java@latest',
    supportConfig: 'exports.javaLanguage',
    sample: sp + 'j/java/LinearSearch.java',
  },
  {
    label: 'JavaScript',
    parser: 'lezer-parser/javascript@latest',
    support: 'codemirror/lang-javascript@latest',
    supportConfig: 'exports.javascript({jsx: true, typescript: true})',
    sample: sp + 'j/javascript/duplicate-char-counter.js',
  },
  {
    label: 'JSON',
    parser: 'lezer-parser/json@latest',
    support: 'codemirror/lang-json@latest',
    supportConfig: 'exports.jsonLanguage',
    sample: '/examples/example.json',
  },
  {
    label: 'Lezer',
    parser: 'lezer-parser/lezer-grammar@latest',
    support: 'codemirror/lang-lezer@latest',
    supportConfig: 'exports.lezerLanguage',
    sample: gh + 'codemirror/lang-example/main/src/syntax.grammar',
  },
  {
    label: 'Markdown',
    parser: 'lezer-parser/markdown@latest',
    support: 'codemirror/lang-markdown@latest',
    supportConfig: 'exports.markdownLanguage',
    sample: '/examples/example.md',
  },
  {
    label: 'PHP',
    parser: 'lezer-parser/php@latest',
    support: 'codemirror/lang-php@latest',
    supportConfig: 'exports.php({basesupport: null, plain: false})',
    sample: sp + 'p/php/merge-sort.php',
  },
  {
    label: 'Python',
    parser: 'lezer-parser/python@latest',
    support: 'codemirror/lang-python@latest',
    supportConfig: 'exports.pythonLanguage',
    sample: sp + 'p/python/binary_search.py',
  },
  {
    label: 'Rust',
    parser: 'lezer-parser/rust@latest',
    support: 'codemirror/lang-rust@latest',
    supportConfig: 'exports.rustLanguage',
    sample: sp + 'r/rust/even-odd.rs',
  },
  {
    label: 'SQL',
    parser: 'codemirror/lang-sql@latest',
    support: 'codemirror/lang-sql@latest:sql.ts',
    supportConfig: 'exports.PostgreSQL',
    sample: '/examples/example.sql',
  },
  {
    label: 'WebAssembly',
    parser: 'codemirror/lang-wast@latest',
    support: 'codemirror/lang-wast@latest:wast.ts',
    supportConfig: 'exports.wastLanguage',
    sample: gh + 'WAVM/WAVM/master/Examples/tee.wast',
  },
  {
    label: 'XML',
    parser: 'lezer-parser/xml@latest',
    support: 'codemirror/lang-xml@latest',
    supportConfig: 'exports.xmlLanguage',
    sample: '/examples/example.xml',
  },
]

const dlo = languageOptions.find((l) => l.label === 'JSON')
export const defaultLanguageOption = dlo

export default languageOptions
