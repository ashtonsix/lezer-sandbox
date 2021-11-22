import {loadTreeFromGithub, setGithubAuth} from '@energetics/lr-util'
import {NextApiRequest, NextApiResponse} from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  setGithubAuth(process.env.GITHUB_TOKEN)

  let tree = await loadTreeFromGithub(
    req.query.tree as string,
    req.query.extension as string
  )
  tree = tree.map((t) => t?.toPlainObject?.() ?? t)
  let first = await fetch(tree[0].url)
  tree[0].content = await first.text()
  delete tree[0].url

  let hour = 60 * 60
  let month = hour * 24 * 28
  res.setHeader(
    'Cache-Control',
    `s-maxage=${hour}, stale-while-revalidate=${month}`
  )
  res.setHeader('Access-Control-Allow-Origin', `*`)
  res.status(200)
  res.json(tree)
}
