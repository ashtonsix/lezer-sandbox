import {loadTreeFromGithub, setGithubAuth} from '@energetics/lr-util'

setGithubAuth(process.env.GITHUB_TOKEN)

export default async function handler(req, res) {
  let tree = await loadTreeFromGithub(req.query.tree, req.query.extension)
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
  res.status(200)
  res.json(tree)
}
