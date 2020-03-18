#!/usr/bin/env ts-node

const { SourceMapConsumer } = require('source-map')

function locToString(loc) {
  return loc.toString().padStart(2, '0')
}

function originalLines(map) {
  const sourcesMap = new Map()
  for (let i = 0; i < map.sources.length; i++) {
    const file = map.sources[i]
    const code = map.sourcesContent[i]
    sourcesMap.set(file, code.split('\n'))
  }
  return sourcesMap
}

async function viz(jsonOrMap) {
  const map = typeof jsonOrMap === 'string' ? JSON.parse(jsonOrMap) : jsonOrMap
  const consumer = await new SourceMapConsumer(map)
  const mappings = new Map()
  const lines = originalLines(map)
  consumer.eachMapping(m => {
    if (!mappings.has(m.source)) mappings.set(m.source, [])
    const info = mappings.get(m.source)
    const n = info.name == null ? '' : `name: ${info.name}`
    const ol = m.originalLine - 1
    const oc = m.originalColumn
    const line = lines.get(m.source)[ol]
    const code = `${line.slice(oc, oc + 10)}...`
    info.push(
      `${locToString(m.originalLine)}:${locToString(m.originalColumn)} => ` +
        ` ${locToString(m.generatedLine)}:${locToString(
          m.generatedColumn,
        )} ${code} ${n}`,
    )
  })
  for (const [k, m] of mappings.entries()) {
    const code = lines.has(k) ? lines.get(k).join('\n  ') : ''
    console.log(`${k}:`)
    console.log('  ```' + `\n  ${code}\n` + '  ```\n')
    for (const x of m) {
      console.log(`  ${x}`)
    }
  }
}

module.exports = { viz }

async function consumeStdin() {
  const stdin = process.openStdin()

  let buf = Buffer.from('')
  return new Promise((resolve, reject) => {
    stdin
      .on('data', chunk => (buf = Buffer.concat([buf, chunk])))
      .on('end', () => resolve(JSON.parse(buf.toString('utf8'))))
      .on('error', reject)
  })
}

if (module.parent == null) {
  ;(async () => {
    try {
      const json = await consumeStdin()
      await viz(json)
    } catch (err) {
      console.error(err)
      process.exit(1)
    }
  })()
}
