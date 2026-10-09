/*
  Settings for the TEST environment. Keeps test data away from development data.
*/

export default {
  env: 'test',
  logLevel: 'error',
  levelDbPath: './tmp/test/.leveldb',
  uploadTmpDir: './tmp/test/uploads',
  ipfsDir: './tmp/test/.ipfsdata'
}
