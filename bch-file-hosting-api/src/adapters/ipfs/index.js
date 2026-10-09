/*
  IPFS adapter. Runs a Helia node (created by helia-coord's node factory) and
  optionally joins the PSF network with helia-coord. Use-cases only see CID
  strings and this small API: addFile, cat, stat, pin, unpin, isPinned, remove.
*/

import fs from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { randomBytes } from 'crypto'
import CreateHeliaNode from 'helia-coord/create-helia-node'
import IpfsCoord from 'helia-coord'
import SlpWallet from 'minimal-slp-wallet'
import { CID } from 'multiformats/cid'
import { createUnsafe } from 'multiformats/block'

// Helia's pins.add() and pins.rm() are lazy: the DAG is only walked while the
// returned iterator is consumed.
async function drain (iterable) {
  let count = 0
  for await (const _ of iterable) count++ // eslint-disable-line no-unused-vars
  return count
}

class IpfsAdapter {
  constructor ({ config, logger } = {}) {
    if (!config) throw new Error('IpfsAdapter requires a config object')
    this.config = config
    this.logger = logger

    // Encapsulated for unit tests.
    this.CreateHeliaNode = CreateHeliaNode
    this.IpfsCoord = IpfsCoord
    this.SlpWallet = SlpWallet
    this.fs = fs
    this.fsp = { mkdir, readFile, writeFile }

    this.heliaNode = null
    this.helia = null
    this.ipfsCoord = null
    this.isReady = false

    this.getSeed = this.getSeed.bind(this)
  }

  async start () {
    await this.fsp.mkdir(this.config.ipfsDir, { recursive: true })

    this.heliaNode = new this.CreateHeliaNode({
      ipfsDir: `${this.config.ipfsDir}/ipfs`,
      tcpPort: this.config.ipfsTcpPort,
      wsPort: this.config.ipfsWsPort,
      isCircuitRelay: this.config.enableCircuitRelay,
      getSeed: this.getSeed
    })
    this.helia = await this.heliaNode.start()

    if (this.config.enableIpfsCoord) await this.startCoord()

    this.isReady = true
    return true
  }

  async startCoord () {
    // The coord wallet only provides helia-coord's peer identity and
    // encryption keys. It never holds funds, so it is not the server wallet.
    const wallet = new this.SlpWallet()
    await wallet.walletInfoPromise

    const circuitRelayInfo = {}
    if (this.config.enableCircuitRelay) {
      circuitRelayInfo.ip4 = this.getDetectedIp4()
      circuitRelayInfo.tcpPort = this.config.ipfsTcpPort
    }

    const nullLog = () => {}
    this.ipfsCoord = new this.IpfsCoord({
      ipfs: this.helia,
      type: 'node.js',
      wallet,
      privateLog: nullLog,
      statusLog: (msg) => this.logger?.debug(msg),
      isCircuitRelay: this.config.enableCircuitRelay,
      circuitRelayInfo,
      apiInfo: this.config.publicUrl,
      announceJsonLd: {
        '@context': 'https://schema.org/',
        '@type': 'WebAPI',
        name: this.config.coordName,
        version: this.config.version,
        protocol: 'bch-file-hosting',
        description: 'IPFS file hosting paid for with BCH',
        provider: {
          '@type': 'Organization',
          name: 'Permissionless Software Foundation',
          url: 'https://PSFoundation.cash'
        },
        web2Api: this.config.publicUrl
      },
      tcpPort: this.config.ipfsTcpPort
    })
    await this.ipfsCoord.start()
  }

  // The node factory appends a /ip4/<public ip>/tcp/... address it detected.
  getDetectedIp4 () {
    const addrs = this.heliaNode.multiaddrs || []
    const last = addrs[addrs.length - 1]
    return last ? last.toString().split('/')[2] : undefined
  }

  // Seed for the node's persistent libp2p identity. Created once, then reused.
  async getSeed () {
    const seedFile = `${this.config.ipfsDir}/seed.json`
    try {
      return JSON.parse(await this.fsp.readFile(seedFile, 'utf8'))
    } catch (err) {
      const seed = randomBytes(32).toString('hex')
      await this.fsp.writeFile(seedFile, JSON.stringify(seed))
      return seed
    }
  }

  assertReady () {
    if (!this.helia) throw new Error('IPFS node has not been started')
  }

  parseCid (cid) {
    try {
      return CID.parse(cid)
    } catch (err) {
      throw new Error(`Invalid CID: ${cid}`)
    }
  }

  // Add a file from disk. The file is wrapped in a directory so its name is
  // kept; the returned CID is the directory CID.
  async addFile ({ filePath, filename }) {
    this.assertReady()

    // fs.addFile() ignores wrapWithDirectory, so use addAll(). The wrapping
    // directory is the last entry it yields.
    const content = this.fs.createReadStream(filePath)
    let root = null
    for await (const entry of this.helia.fs.addAll(
      [{ path: filename, content }],
      { cidVersion: 1, wrapWithDirectory: true }
    )) {
      root = entry
    }

    if (!root || root.path !== '') {
      throw new Error('IPFS import did not produce a wrapping directory')
    }
    return root.cid.toString()
  }

  // Stream the bytes of the file stored inside a wrapping directory.
  cat ({ cid, filename }) {
    this.assertReady()
    return this.helia.fs.cat(this.parseCid(cid), { path: filename })
  }

  async stat (cid) {
    this.assertReady()
    return this.helia.fs.stat(this.parseCid(cid))
  }

  async pin (cid) {
    this.assertReady()
    try {
      await drain(this.helia.pins.add(this.parseCid(cid)))
    } catch (err) {
      if (!err.message.includes('Already pinned')) throw err
    }
    return true
  }

  async unpin (cid) {
    this.assertReady()
    try {
      await drain(this.helia.pins.rm(this.parseCid(cid)))
    } catch (err) {
      if (err.name !== 'NotFoundError') throw err
    }
    return true
  }

  async isPinned (cid) {
    this.assertReady()
    return this.helia.pins.isPinned(this.parseCid(cid))
  }

  // Unpin a file and delete its blocks from local storage, except blocks that
  // another pinned file also uses. Returns the number of blocks deleted.
  async remove (cid) {
    this.assertReady()
    await this.unpin(cid)

    const blocks = await this.listLocalBlocks(this.parseCid(cid))
    let deleted = 0
    for (const blockCid of blocks) {
      if (await this.helia.pins.isPinned(blockCid)) continue
      await this.helia.blockstore.delete(blockCid)
      deleted++
    }
    return deleted
  }

  // Walk a DAG using only blocks already stored locally. Missing blocks are
  // skipped, because blockstore.get() would try to fetch them from the network.
  async listLocalBlocks (rootCid) {
    const found = []
    const seen = new Set()
    const stack = [rootCid]

    while (stack.length) {
      const cid = stack.pop()
      const key = cid.toString()
      if (seen.has(key)) continue
      seen.add(key)

      if (!(await this.helia.blockstore.has(cid))) continue
      found.push(cid)

      const bytes = await this.helia.blockstore.get(cid)
      const codec = await this.helia.getCodec(cid.code)
      const block = createUnsafe({ bytes, cid, codec })
      for (const [, link] of block.links()) stack.push(link)
    }

    return found
  }

  getStatus () {
    if (!this.heliaNode || !this.isReady) return { isReady: false }
    return {
      isReady: true,
      ipfsId: this.heliaNode.id,
      multiaddrs: (this.heliaNode.multiaddrs || []).map(x => x.toString()),
      coordEnabled: Boolean(this.ipfsCoord)
    }
  }

  async stop () {
    if (this.ipfsCoord) await this.ipfsCoord.controllers.timer.stopAllTimers()
    if (this.helia) await this.helia.stop()
    this.isReady = false
    return true
  }
}

export default IpfsAdapter
