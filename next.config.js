const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
})

/** @type {import('next').NextConfig} */
module.exports = withMDX({
  reactStrictMode: true,
  pageExtensions: ['page.tsx', 'page.ts', 'page.jsx', 'page.js', 'page.mdx'],
  webpack: (config, options) => {
    config.module.rules.push({
      test: /(\.toml|\.uq|\.grammar)$/,
      use: 'raw-loader',
    })

    if (!config.module.noParse) config.module.noParse = []
    config.module.noParse.push(require.resolve('typescript/lib/typescript.js'))

    return config
  },
})
