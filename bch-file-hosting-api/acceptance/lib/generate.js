/*
  Project-specific acceptance entrypoint generator for bch-file-hosting-api.

  Reads parser JSON IR and writes executable generated test entry points plus
  per-feature metadata. Generated tests delegate all step behavior to the
  acceptance runtime and project step handlers.
*/

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function metadataName (featureName) {
  const slug = featureName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'feature'}.json`
}

function relativeImport (fromDir, targetFile) {
  let rel = path.relative(fromDir, targetFile).replace(/\\/g, '/')
  if (!rel.startsWith('.')) rel = `./${rel}`
  return rel
}

function hashFile (file) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
  } catch (err) {
    return null
  }
}

function main () {
  const irArg = process.argv[2]
  const outArg = process.argv[3]
  const featureArg = process.argv[4]
  const apsCommit = process.argv[5]

  if (!irArg || !outArg) {
    console.error('usage: acceptance-entrypoint-generator <json-ir> <generated-test-output-dir> [feature-file] [aps-commit]')
    process.exit(2)
  }

  let ir
  try {
    ir = JSON.parse(fs.readFileSync(irArg, 'utf8'))
  } catch (err) {
    console.error(`Failed to read JSON IR "${irArg}": ${err.message}`)
    process.exit(1)
  }

  const genDir = outArg
  fs.mkdirSync(genDir, { recursive: true })

  const featureKey = path.basename(irArg).replace(/\.json$/i, '')
  const testFile = path.join(genDir, `${featureKey}.acceptance.test.js`)
  const relRuntime = relativeImport(genDir, path.join(__dirname, 'runtime.js'))

  const body = `import { runFeature } from '${relRuntime}'
const ir = ${JSON.stringify(ir, null, 2)}
async function main () {
  const report = await runFeature(ir)
  for (const r of report.results) {
    console.log((r.status === 'passed' ? 'PASS ' : 'FAIL ') + r.name)
    if (r.detail) console.log('     ' + r.detail)
  }
  if (report.failures > 0) {
    console.error('ACCEPTANCE FAILURES: ' + report.failures + ' of ' + report.total)
    process.exitCode = 1
  }
}
main().catch((err) => { console.error(err); process.exit(1) })
`

  try {
    fs.writeFileSync(testFile, body)
  } catch (err) {
    console.error(`Failed to write generated test "${testFile}": ${err.message}`)
    process.exit(1)
  }

  const metaDir = path.join(genDir, 'metadata')
  fs.mkdirSync(metaDir, { recursive: true })
  const hash = crypto
    .createHash('sha256')
    .update(fs.readFileSync(testFile))
    .digest('hex')

  const metadata = {
    schema_version: 1,
    feature_path: `${featureKey}.feature`,
    ir_path: path.resolve(irArg),
    implementation_hash: `sha256:${hash}`,
    hash_scope: 'generated_files',
    generated_files: [testFile],
    feature_hash: featureArg ? hashFile(featureArg) : null,
    aps_commit: apsCommit || null
  }
  fs.writeFileSync(
    path.join(metaDir, metadataName(featureKey)),
    JSON.stringify(metadata, null, 2)
  )

  process.exit(0)
}

main()
