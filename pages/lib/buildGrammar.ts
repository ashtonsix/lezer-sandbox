import {NodeProp} from '@lezer/common'
import {ExternalTokenizer} from '@lezer/lr'
import {buildParserFile} from '@lezer/generator'

/**
 * run this as a web worker
 **/
onmessage = (e) => {
  let grammar = e.data
  try {
    // use dummy externals here, and real externals later
    let {parser, terms} = buildParserFile(grammar, {
      externalTokenizer: () => new ExternalTokenizer(() => {}),
      externalSpecializer: () => (value, stack) => 0,
      externalProp: () => new NodeProp({deserialize: (x) => x}),
    })
    let result = JSON.stringify({parser, terms})
    postMessage(result, undefined as any)
  } catch (e) {
    console.error(e)
    let result = JSON.stringify({error: e.message})
    postMessage(result, undefined as any)
  }
}
