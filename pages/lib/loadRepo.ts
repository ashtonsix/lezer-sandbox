import {Octokit} from 'octokit'
import {PackageJson} from 'type-fest'
import {CacheWithGetter} from './Cache'

let octokit = new Octokit(
  process.env.NEXT_PUBLIC_GITHUB_TOKEN
    ? {auth: process.env.NEXT_PUBLIC_GITHUB_TOKEN}
    : {}
)

interface OctoFetchRequest {
  owner: string
  repo: string
  tag: string
  path: string
}

interface UnpkgRequest {
  pkg: string
  tag: string
  path: string
}

let fetchText = new CacheWithGetter(async (url: string) => {
  let res = await fetch(url)
  let text = await res.text()
  return {data: text, status: res.status, url}
})

let octofetch = async ({owner, repo, tag, path}: OctoFetchRequest) => {
  let url = `https://raw.githubusercontent.com/${owner}/${repo}/${tag}/${path}`
  return (await fetchText.get([url])).value
}

let unpkg = async ({pkg, tag, path}: UnpkgRequest) => {
  let url = `https://unpkg.com/${pkg}@${tag}/${path}`
  return (await fetchText.get([url])).value
}

let tagsCache = new CacheWithGetter(async (owner: string, repo: string) => {
  let [tags, branches] = await Promise.all([
    octokit.rest.repos.listTags({owner, repo}),
    octokit.rest.repos.listBranches({owner, repo}),
  ])
  return {
    tags: tags.data,
    branches: branches.data,
  }
})

let filelistCache = new CacheWithGetter(
  async (owner: string, repo: string, sha: string) => {
    let params = {owner, repo, recursive: 'true', tree_sha: sha}
    let files = await octokit.rest.git.getTree(params)
    return files.data
  }
)

export interface SrcRepo {
  src: SrcFile[]
  build?: SrcFile
  packageJSON: PackageJson
  tags: string[]
}

export interface SrcFile {
  content: string
  path: string
  url: string
  entry: boolean
}

/**
 * Downloads all a repository's relevant metadata and build/source files from github/unpkg
 */
export const loadRepo = async (
  github: string,
  rewritePath = (path: string) => path
): Promise<SrcRepo> => {
  let [, owner, repo, tag, entry] =
    github.match(/^(.+?)\/(.+?)@([^:]+):?(.+)?$/) ?? []

  let result: SrcRepo = {
    src: [],
    build: null,
    packageJSON: null,
    tags: [],
  }

  let {
    value: {tags, branches},
  } = await tagsCache.get([owner, repo])

  if (tag === 'latest') tag = tags[0].name
  let sha =
    tags.find((t) => t.name === tag)?.commit?.sha ??
    branches.find((t) => t.name === tag)?.commit?.sha
  let {value: files} = await filelistCache.get([owner, repo, sha])
  for (let t of branches) result.tags.push(t.name)
  if (tags.length) result.tags.push('latest')
  for (let t of tags) result.tags.push(t.name)

  let [packageJSON, src]: [any, SrcFile[]] = await Promise.all([
    octofetch({owner, repo, tag, path: 'package.json'}),
    Promise.all(
      files.tree
        .filter((f) => /^src.+(\.js|\.ts|\.grammar)$/.test(f.path))
        .map(async (f) => {
          let d = await octofetch({owner, repo, tag, path: f.path})
          return {
            content: d.data,
            url: d.url,
            path: rewritePath(f.path),
            entry: false,
          }
        })
    ),
  ])
  packageJSON = JSON.parse(packageJSON.data)
  result.packageJSON = packageJSON
  result.src = src

  let build = await unpkg({
    pkg: packageJSON.name,
    tag,
    path: packageJSON.module,
  })
  if (build.status === 200) {
    let {data: content, url} = build
    result.build = {content, url, path: packageJSON.module, entry: true}
  }

  entry: {
    if (result.src.length === 1) {
      result.src[0].entry = true
      break entry
    }
    let lang = result.packageJSON.name.match(/-(\w+)$/)?.[1]
    let check = entry
      ? [entry]
      : ['.grammar', 'index.ts', 'index.js', lang + '.ts', lang + '.js']
    for (let c of check) {
      let entry = result.src.find((f) => f.path.endsWith(c))
      if (entry) {
        entry.entry = true
        break entry
      }
    }
  }

  // entry first, rest alphabetical
  result.src.sort((a, b) => +b.entry - +a.entry || (a.path > b.path ? 1 : -1))

  return result
}

export default loadRepo
