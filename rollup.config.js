// const path = require('path')
// const json = require('@rollup/plugin-json')
// const nodeResolve = require('@rollup/plugin-node-resolve')
// const ts = require('rollup-plugin-typescript2')

import path from 'path'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'
import ts from 'rollup-plugin-typescript2'

const packagesDir = path.resolve(__dirname, 'packages')

const packageDir = path.resolve(packagesDir, process.env.TARGET)

const resolves = (p) => path.resolve(packageDir, p)

const pkg = require(resolves('package.json'))

const name = path.basename(packageDir)

const outputConfig = {
  'esm-bundler': {
    file: resolves(`dist/${name}.esm-bundler.js`),
    format: 'es'
  },
  'cjs': {
    file: resolves(`dist/${name}.cjs.js`),
    format: 'cjs'
  },
  'global': {
    file: resolves(`dist/${name}.global.js`),
    format: 'iife'
  }
}

const options = pkg.buildOptions

function createConfig(format, output) {
  output.name = options.name
  output.sourcemap = true
  return {
    input: resolves('src/index.ts'),
    output,
    plugins: [
      json(),
      ts({
        tsconfig: path.resolve(__dirname, 'tsconfig.json')
      }),
      nodeResolve()
    ]
  }
}

export default options.formats.map(format => 
  createConfig(format, outputConfig[format])
)



