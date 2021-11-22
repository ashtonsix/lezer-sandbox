import {
  loadFromGithub,
  setEsbuildLoader,
  setGithubAuth,
} from '@energetics/lr-util'
import {NextApiRequest, NextApiResponse} from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  setEsbuildLoader(() => import('esbuild-wasm'))
  setGithubAuth(process.env.GITHUB_TOKEN)

  let language = await loadFromGithub({
    parser: req.query.parser as string,
    support: req.query.support as string,
    config: req.query.config as string,
  })

  let hour = 60 * 60
  let month = hour * 24 * 28
  res.setHeader(
    'Cache-Control',
    `s-maxage=${hour}, stale-while-revalidate=${month}`
  )
  res.setHeader('Access-Control-Allow-Origin', `*`)
  res.status(200)
  res.json(language)
}
