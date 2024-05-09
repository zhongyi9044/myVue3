const fs=require("fs")
const execa=require("execa")

// import fs from "fs"
// import { execaNode } from "execa"

const targets = fs.readdirSync('packages').filter(item => {
  if (!fs.statSync(`packages/${item}`).isDirectory()) {
    return false
  }
  return true
})

async function build(tarB) {
  await execa('rollup', ['-c', '--environment', `TARGET:${tarB}`], { stdio: 'inherit' })
}

function runParallel(targets, buildFn) {
  const res = []
  for (const item of targets) {
    const tarB = buildFn(item)
    res.push(tarB)
  }
  return Promise.all(res)
}

runParallel(targets, build)