/*
  Unit tests for the IPFS adapter. Helia, helia-coord, and the wallet are all
  replaced with fakes; no node is started.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import IpfsAdapter from '../../../../src/adapters/ipfs/index.js'
import { makeFakeHelia, makeCid, DAG_PB_CODE } from '../../mocks/fake-helia.js'

describe('#ipfs/index.js', () => {
  let sandbox
  let uut
  let config
  let helia
  let coordInstances

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    coordInstances = []
    helia = makeFakeHelia(sandbox)

    config = {
      ipfsDir: './tmp/test/.ipfsdata',
      ipfsTcpPort: 4001,
      ipfsWsPort: 4003,
      enableCircuitRelay: false,
      enableIpfsCoord: false,
      publicUrl: 'http://localhost:5050',
      coordName: 'bch-file-hosting',
      version: '0.1.0'
    }

    uut = new IpfsAdapter({ config, logger: { debug: sandbox.stub() } })

    uut.fsp = {
      mkdir: sandbox.stub().resolves(),
      readFile: sandbox.stub().rejects(new Error('ENOENT')),
      writeFile: sandbox.stub().resolves()
    }
    uut.fs = { createReadStream: sandbox.stub().returns('fake-stream') }

    uut.CreateHeliaNode = class FakeCreateHeliaNode {
      constructor (opts) {
        this.opts = opts
        this.id = 'peer-id'
        this.multiaddrs = ['/ip4/127.0.0.1/tcp/4001', '/ip4/1.2.3.4/tcp/4001/p2p/peer-id']
      }

      async start () { return helia }
    }

    uut.SlpWallet = class FakeWallet {
      constructor () { this.walletInfoPromise = Promise.resolve(true) }
    }

    uut.IpfsCoord = class FakeCoord {
      constructor (opts) {
        this.opts = opts
        this.controllers = { timer: { stopAllTimers: sandbox.stub().resolves() } }
        coordInstances.push(this)
      }

      async start () { return true }
    }
  })

  afterEach(() => sandbox.restore())

  describe('#constructor', () => {
    it('should throw if no config is passed in', () => {
      assert.throws(() => new IpfsAdapter(), /requires a config object/)
    })

    it('should report not ready before start', () => {
      assert.isFalse(uut.isReady)
    })
  })

  describe('#start', () => {
    it('should start the Helia node without coord when disabled', async () => {
      await uut.start()

      assert.isTrue(uut.isReady)
      assert.equal(uut.helia, helia)
      assert.equal(uut.heliaNode.opts.ipfsDir, './tmp/test/.ipfsdata/ipfs')
      assert.equal(uut.heliaNode.opts.tcpPort, 4001)
      assert.isNull(uut.ipfsCoord)
    })

    it('should start helia-coord when enabled', async () => {
      config.enableIpfsCoord = true

      await uut.start()

      assert.lengthOf(coordInstances, 1)
      const opts = coordInstances[0].opts
      assert.equal(opts.ipfs, helia)
      assert.equal(opts.type, 'node.js')
      assert.equal(opts.announceJsonLd.name, 'bch-file-hosting')
      assert.deepEqual(opts.circuitRelayInfo, {})
    })

    it('should pass the detected public IP when acting as a circuit relay', async () => {
      config.enableIpfsCoord = true
      config.enableCircuitRelay = true

      await uut.start()

      const opts = coordInstances[0].opts
      assert.isTrue(opts.isCircuitRelay)
      assert.deepEqual(opts.circuitRelayInfo, { ip4: '1.2.3.4', tcpPort: 4001 })
    })

    it('should create the IPFS directory recursively and report success', async () => {
      const result = await uut.start()

      assert.isTrue(result)
      assert.isTrue(uut.fsp.mkdir.calledWith('./tmp/test/.ipfsdata', { recursive: true }))
    })

    it('should route coord status messages to the debug logger', async () => {
      config.enableIpfsCoord = true
      await uut.start()

      coordInstances[0].opts.statusLog('hello')
      coordInstances[0].opts.privateLog('ignored')

      assert.isTrue(uut.logger.debug.calledWith('hello'))
    })

    it('should tolerate a missing logger for coord status messages', async () => {
      config.enableIpfsCoord = true
      uut.logger = undefined
      await uut.start()

      assert.doesNotThrow(() => coordInstances[0].opts.statusLog('hello'))
    })
  })

  describe('#getDetectedIp4', () => {
    it('should return undefined when no addresses were detected', () => {
      uut.heliaNode = { multiaddrs: [] }
      assert.isUndefined(uut.getDetectedIp4())
    })

    it('should return undefined when multiaddrs is missing', () => {
      uut.heliaNode = {}
      assert.isUndefined(uut.getDetectedIp4())
    })
  })

  describe('#getSeed', () => {
    it('should create and save a new random seed when none exists', async () => {
      const seed = await uut.getSeed()

      assert.match(seed, /^[0-9a-f]{64}$/)
      assert.isTrue(uut.fsp.writeFile.calledWith('./tmp/test/.ipfsdata/seed.json', JSON.stringify(seed)))
    })

    it('should reuse an existing seed', async () => {
      uut.fsp.readFile.resolves(JSON.stringify('existing-seed'))

      assert.equal(await uut.getSeed(), 'existing-seed')
      assert.isTrue(uut.fsp.writeFile.notCalled)
    })
  })

  describe('before start', () => {
    it('should throw from addFile if the node is not started', async () => {
      try {
        await uut.addFile({ filePath: 'x', filename: 'x' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'has not been started')
      }
    })

    it('should report not ready', () => {
      assert.deepEqual(uut.getStatus(), { isReady: false })
    })
  })

  describe('after start', () => {
    beforeEach(async () => {
      await uut.start()
    })

    describe('#parseCid', () => {
      it('should throw a clear error for an invalid CID', () => {
        assert.throws(() => uut.parseCid('not-a-cid'), /Invalid CID: not-a-cid/)
      })
    })

    describe('#addFile', () => {
      it('should import the file wrapped in a directory and return the directory CID', async () => {
        const fileCid = await makeCid('file')
        const dirCid = await makeCid('dir', DAG_PB_CODE)
        helia.fs.addAll.returns((async function * () {
          yield { path: 'photo.jpg', cid: fileCid }
          yield { path: '', cid: dirCid }
        })())

        const result = await uut.addFile({ filePath: '/tmp/upload-1', filename: 'photo.jpg' })

        assert.equal(result, dirCid.toString())
        assert.isTrue(uut.fs.createReadStream.calledWith('/tmp/upload-1'))
        const [candidates, options] = helia.fs.addAll.firstCall.args
        assert.deepEqual(candidates, [{ path: 'photo.jpg', content: 'fake-stream' }])
        assert.deepEqual(options, { cidVersion: 1, wrapWithDirectory: true })
      })

      it('should throw if no wrapping directory was produced', async () => {
        const fileCid = await makeCid('file')
        helia.fs.addAll.returns((async function * () {
          yield { path: 'photo.jpg', cid: fileCid }
        })())

        try {
          await uut.addFile({ filePath: '/tmp/upload-1', filename: 'photo.jpg' })
          assert.fail('Unexpected result')
        } catch (err) {
          assert.include(err.message, 'did not produce a wrapping directory')
        }
      })

      it('should throw if the import yields nothing', async () => {
        helia.fs.addAll.returns((async function * () {})())

        try {
          await uut.addFile({ filePath: '/tmp/upload-1', filename: 'photo.jpg' })
          assert.fail('Unexpected result')
        } catch (err) {
          assert.include(err.message, 'did not produce a wrapping directory')
        }
      })
    })

    describe('#cat', () => {
      it('should read the named file inside the directory', async () => {
        const dirCid = await makeCid('dir', DAG_PB_CODE)

        uut.cat({ cid: dirCid.toString(), filename: 'photo.jpg' })

        const [cidArg, opts] = helia.fs.cat.firstCall.args
        assert.equal(cidArg.toString(), dirCid.toString())
        assert.deepEqual(opts, { path: 'photo.jpg' })
      })
    })

    describe('#stat', () => {
      it('should return the UnixFS stats', async () => {
        const dirCid = await makeCid('dir', DAG_PB_CODE)

        const result = await uut.stat(dirCid.toString())

        assert.equal(result.type, 'directory')
      })
    })

    describe('#pin, #isPinned, #unpin', () => {
      it('should pin, report, and unpin a CID', async () => {
        const cid = (await makeCid('a')).toString()

        assert.isTrue(await uut.pin(cid))
        assert.isTrue(await uut.isPinned(cid))
        assert.isTrue(await uut.unpin(cid))
        assert.isFalse(await uut.isPinned(cid))
      })

      it('should treat pinning an already pinned CID as success', async () => {
        helia.pins.add.callsFake(async function * () { throw new Error('Already pinned') })
        const cid = (await makeCid('a')).toString()

        assert.isTrue(await uut.pin(cid))
      })

      it('should pass other pin errors through', async () => {
        helia.pins.add.callsFake(async function * () { throw new Error('block not found') })
        const cid = (await makeCid('a')).toString()

        try {
          await uut.pin(cid)
          assert.fail('Unexpected result')
        } catch (err) {
          assert.include(err.message, 'block not found')
        }
      })

      it('should treat unpinning a CID that is not pinned as success', async () => {
        helia.pins.rm.callsFake(async function * () {
          const err = new Error('Not Found')
          err.name = 'NotFoundError'
          throw err
        })
        const cid = (await makeCid('a')).toString()

        assert.isTrue(await uut.unpin(cid))
      })

      it('should pass other unpin errors through', async () => {
        helia.pins.rm.callsFake(async function * () { throw new Error('datastore closed') })
        const cid = (await makeCid('a')).toString()

        try {
          await uut.unpin(cid)
          assert.fail('Unexpected result')
        } catch (err) {
          assert.include(err.message, 'datastore closed')
        }
      })
    })

    describe('#listLocalBlocks', () => {
      it('should walk every locally stored block in the DAG once', async () => {
        const leafA = await makeCid('a')
        const leafB = await makeCid('b')
        const file = await makeCid('file', DAG_PB_CODE)
        const dir = await makeCid('dir', DAG_PB_CODE)
        helia.addBlock(leafA)
        helia.addBlock(leafB)
        helia.addBlock(file, [leafA, leafB, leafA])
        helia.addBlock(dir, [file])

        const result = await uut.listLocalBlocks(dir)

        assert.sameMembers(result.map(String), [dir, file, leafA, leafB].map(String))
      })

      it('should skip blocks that are not stored locally', async () => {
        const missing = await makeCid('missing')
        const dir = await makeCid('dir', DAG_PB_CODE)
        helia.addBlock(dir, [missing])

        const result = await uut.listLocalBlocks(dir)

        assert.deepEqual(result.map(String), [dir.toString()])
        assert.isFalse(helia.blockstore.get.calledWith(missing))
      })
    })

    describe('#remove', () => {
      it('should unpin the CID and delete its blocks', async () => {
        const leaf = await makeCid('a')
        const dir = await makeCid('dir', DAG_PB_CODE)
        helia.addBlock(leaf)
        helia.addBlock(dir, [leaf])

        const deleted = await uut.remove(dir.toString())

        assert.equal(deleted, 2)
        assert.equal(helia.blocks.size, 0)
        assert.isTrue(helia.pins.rm.calledOnce)
      })

      it('should keep blocks that another pinned file uses', async () => {
        const sharedLeaf = await makeCid('shared')
        const unpaidDir = await makeCid('unpaid-dir', DAG_PB_CODE)
        helia.addBlock(sharedLeaf)
        helia.addBlock(unpaidDir, [sharedLeaf])
        helia.pinnedBlocks.add(sharedLeaf.toString())

        const deleted = await uut.remove(unpaidDir.toString())

        assert.equal(deleted, 1)
        assert.isTrue(helia.blocks.has(sharedLeaf.toString()))
        assert.isFalse(helia.blocks.has(unpaidDir.toString()))
      })
    })

    describe('#getStatus', () => {
      it('should report the node identity and addresses', () => {
        const status = uut.getStatus()

        assert.isTrue(status.isReady)
        assert.equal(status.ipfsId, 'peer-id')
        assert.lengthOf(status.multiaddrs, 2)
        assert.isFalse(status.coordEnabled)
      })

      it('should report no addresses if none are known', () => {
        uut.heliaNode.multiaddrs = undefined

        assert.deepEqual(uut.getStatus().multiaddrs, [])
      })

      it('should report not ready when the node exists but is not ready', () => {
        uut.heliaNode = { id: 'peer-id', multiaddrs: [] }
        uut.isReady = false

        assert.deepEqual(uut.getStatus(), { isReady: false })
      })
    })
  })

  describe('#stop', () => {
    it('should stop coord timers and the Helia node', async () => {
      config.enableIpfsCoord = true
      await uut.start()

      await uut.stop()

      assert.isTrue(coordInstances[0].controllers.timer.stopAllTimers.calledOnce)
      assert.isTrue(helia.stop.calledOnce)
      assert.isFalse(uut.isReady)
    })

    it('should do nothing if the node was never started', async () => {
      assert.isTrue(await uut.stop())
    })
  })
})
