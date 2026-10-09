/*
  Project-specific acceptance entrypoint generator for bch-file-hosting-web.

  Reads parser JSON IR and writes executable generated test entry points plus
  per-feature metadata. Generated tests delegate all step behavior to the
  acceptance runtime and project step handlers.

  Usage:
    node acceptance/lib/generate.js <json-ir> <generated-test-output-dir>

  Exit codes:
    0  generation succeeded
    1  generation error
    2  wrong command usage
*/

'use strict'

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

// Convert a feature path to a strict lowercase-and-hyphen metadata filename.
function metadataName (featureName) {
  const slug = featureName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'feature'}.json`
}

// Compute a stable relative require path from a generated file's directory to
// a target module, with a './' or '../' prefix for require().
function relativeRequire (fromDir, targetFile) {
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
  const relRuntime = relativeRequire(genDir, path.join(__dirname, 'runtime.js'))

  const body = `'use strict'
const { runFeature } = require('${relRuntime}')
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

  // Per-feature metadata with an implementation hash over generated files only.
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
