/*
  IPFS adapter. Runs a Helia node (created by the project-owned public node
  factory, which extends helia-coord's factory and joins the public IPFS
  network) and optionally joins the PSF network with helia-coord. Use-cases only
  see CID strings and this small API: addFile, cat, stat, pin, unpin, isPinned,
  remove.
*/

import fs from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { randomBytes } from 'crypto'
import PublicHeliaNode from './public-helia-node.js'
import IpfsCoord from 'helia-coord'
import SlpWallet from 'minimal-slp-wallet'
import { CID } from 'multiformats/cid'
import { createUnsafe } from 'multiformats/block'

// Helia's pins.add() and pins.rm() are lazy: the DAG is only walked while the
// returned iterator is consumed. The value produced while draining is unused.
async function drain (iterable) {
  // eslint-disable-next-line no-unused-vars
  for await (const _ of iterable) { /* consume */ }
}

class IpfsAdapter {
  constructor ({ config, logger } = {}) {
    if (!config) throw new Error('IpfsAdapter requires a config object')
    this.config = config
    this.logger = logger

    // Encapsulated for unit tests.
    this.CreateHeliaNode = PublicHeliaNode
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
    const parsed = this.parseCid(cid)
    try {
      await drain(this.helia.pins.add(parsed))
    } catch (err) {
      if (!err.message.includes('Already pinned')) throw err
    }
    await this.provide(cid)
    return true
  }

  // Announce to content routing that this node provides the CID. Public pinning
  // services fetch our content by CID, so a local pin must be published to the
  // DHT for them to discover this node.
  async provide (cid) {
    this.assertReady()
    await this.helia.routing.provide(this.parseCid(cid))
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:26:20.214Z","module_hash":"2f91824ae193d1462d0bc7b2a9ed72bc58986045ddce0bee4cfab8d17350a16e","functions":[{"id":"func/drain","name":"drain","line":18,"end_line":21,"hash":"e99a6d70920fb894014b3b95a0a6bf552577b24669989f834c9df237d3815632"},{"id":"func/IpfsAdapter.constructor","name":"IpfsAdapter.constructor","line":24,"end_line":42,"hash":"09c824178a35dec248c3f249031d52079fe2933af4280759516db4005f3a8d26"},{"id":"func/IpfsAdapter.start","name":"IpfsAdapter.start","line":44,"end_line":60,"hash":"b21864b8a3226bd6c44257662eebac6da6ac911a3a6c6820521346263ff58c56"},{"id":"func/IpfsAdapter.startCoord","name":"IpfsAdapter.startCoord","line":62,"end_line":101,"hash":"2857d276beb1bfd639501a2425bb610e108aeda508f8af423b7f60ff3534f339"},{"id":"func/IpfsAdapter.getDetectedIp4","name":"IpfsAdapter.getDetectedIp4","line":104,"end_line":108,"hash":"93ffe88d03cac7d8420c3151364217b4dd32445ffb672fd9664c3e07562dcd36"},{"id":"func/IpfsAdapter.getSeed","name":"IpfsAdapter.getSeed","line":111,"end_line":120,"hash":"fd68032bbd5972e07f2241a3e5b829aa06eac05f69cc41ddfe479483067ea5c7"},{"id":"func/IpfsAdapter.assertReady","name":"IpfsAdapter.assertReady","line":122,"end_line":124,"hash":"8a4e7a3a2d27e65fc355af98754e34dbf1b50a3fe29ffee31d1dabd6545c2f53"},{"id":"func/IpfsAdapter.parseCid","name":"IpfsAdapter.parseCid","line":126,"end_line":132,"hash":"c492b3fd203210403292c860e93b38e264b3aea6bcd86e921498c4d3e3e1c15d"},{"id":"func/IpfsAdapter.addFile","name":"IpfsAdapter.addFile","line":136,"end_line":154,"hash":"dcadb1f6c932c61721cd9cec87ede6d81da7a70b440d095874d77b79644289ed"},{"id":"func/IpfsAdapter.cat","name":"IpfsAdapter.cat","line":157,"end_line":160,"hash":"98b607436b3a574f5db68de6fc22e14fe952dfde7c9763bcccc6540c326e0ba7"},{"id":"func/IpfsAdapter.stat","name":"IpfsAdapter.stat","line":162,"end_line":165,"hash":"cf46046d3b2665ce9cb78b475088e3b9b356689a51187c3f52df8b5d3ea42cbf"},{"id":"func/IpfsAdapter.pin","name":"IpfsAdapter.pin","line":167,"end_line":175,"hash":"cd90562294f9a2f1a2a492c0ee133432b0d4efc1f1b62076313bab86fe312e75"},{"id":"func/IpfsAdapter.unpin","name":"IpfsAdapter.unpin","line":177,"end_line":185,"hash":"b4932ff615bb2ee629bee1d27fe0b13f6281fbbf1f88ed26346202883881b261"},{"id":"func/IpfsAdapter.isPinned","name":"IpfsAdapter.isPinned","line":187,"end_line":190,"hash":"61b76e1f1e577206c203a91120c2761cf5ad130d49704ea4cecb29181404d356"},{"id":"func/IpfsAdapter.remove","name":"IpfsAdapter.remove","line":194,"end_line":206,"hash":"99065050d09bdaf888995cbedda0164d6ce82fd68bb0d2866daf19bf846fe7ae"},{"id":"func/IpfsAdapter.listLocalBlocks","name":"IpfsAdapter.listLocalBlocks","line":210,"end_line":231,"hash":"90021d388fed47748e524f26fc15d99cb7a8e3cfd4f1e72603e2333bf8f88068"},{"id":"func/IpfsAdapter.getStatus","name":"IpfsAdapter.getStatus","line":233,"end_line":241,"hash":"6301bbb0f5a01cbc1895b5b1d0c06ba8c287f840b21507dd42ab7c7c95204549"},{"id":"func/IpfsAdapter.stop","name":"IpfsAdapter.stop","line":243,"end_line":248,"hash":"4ecdc1adeb89ecb8b53b2a98f2964d8c4cdb7c1b776be8b1107426840e0cb010"}]}
// mutate4javascript-manifest-end
