const withPlugins = require('next-compose-plugins')
const withMDX = require('@next/mdx')({extension: /\.mdx?$/})
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
module.exports = withPlugins([[withBundleAnalyzer], withMDX], {
  reactStrictMode: true,
  pageExtensions: [
    'endpoint.ts',
    'page.tsx',
    'page.ts',
    'page.jsx',
    'page.js',
    'page.mdx',
  ],
  webpack: (config, options) => {
    config.module.rules.push({
      test: /\.(toml|uq|grammar)$/,
      use: 'raw-loader',
    })

    if (!config.module.noParse) config.module.noParse = []
    config.module.noParse.push(require.resolve('typescript/lib/typescript.js'))

    return config
  },
})
