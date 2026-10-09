/*
  Admin use-cases: inspect invoices and remove a file from every pinning
  provider (for moderation or takedown requests).
*/

import { FILE_STATUS } from '../entities/file-upload.js'
import { INVOICE_STATUS, SWEEP_STATUS } from '../entities/invoice.js'
import UseCase from './use-case.js'
import { NotFoundError, ValidationError } from './errors.js'

// Reject a filter value that is not one of the allowed statuses.
function assertKnownStatus (value, statuses, label) {
  if (value && !Object.values(statuses).includes(value)) {
    throw new ValidationError(`Unknown ${label} '${value}'`)
  }
}

class AdminUseCases extends UseCase {
  constructor ({ adapters } = {}) {
    super({ adapters, name: 'AdminUseCases' })

    this.listInvoices = this.listInvoices.bind(this)
    this.listFiles = this.listFiles.bind(this)
    this.removeFile = this.removeFile.bind(this)
  }

  async listInvoices ({ status, sweepStatus } = {}) {
    assertKnownStatus(status, INVOICE_STATUS, 'invoice status')
    assertKnownStatus(sweepStatus, SWEEP_STATUS, 'sweep status')
    return this.adapters.localdb.invoices.list({ status, sweepStatus })
  }

  async listFiles ({ status } = {}) {
    assertKnownStatus(status, FILE_STATUS, 'file status')
    return this.adapters.localdb.files.list({ status })
  }

  // Unpin from every third-party provider, then unpin and delete the local
  // copy. Provider failures are reported but do not stop the removal.
  async removeFile ({ cid }) {
    const { localdb, pinning, ipfs, logger } = this.adapters

    const file = await localdb.files.get(cid)
    if (!file) throw new NotFoundError(`File not found: ${cid}`)

    const unpinned = []
    const failed = []
    for (const provider of pinning.getProviders()) {
      if (provider.name === 'local-helia') continue
      try {
        await provider.unpin(cid)
        unpinned.push(provider.name)
      } catch (err) {
        logger.error(`Unpinning ${cid} from ${provider.name} failed: ${err.message}`)
        failed.push({ provider: provider.name, error: err.message })
      }
    }

    await ipfs.remove(cid)
    unpinned.push('local-helia')

    await localdb.files.update(cid, {
      status: FILE_STATUS.DELETED,
      removedAt: this.now().toISOString()
    })
    logger.info('File removed by admin', { cid, unpinned, failed: failed.length })

    return { cid, unpinned, failed }
  }
}

export default AdminUseCases

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:20:18.742Z","module_hash":"17317592b8d3a34aa2a6a0470a2ea01a26c314f94b25cb4751bcb995deae4e05","functions":[{"id":"func/AdminUseCases.constructor","name":"AdminUseCases.constructor","line":12,"end_line":17,"hash":"1ee153003e7e41c9e17742c5f9a6941da79704b884ceb585399c09511b733fe9"},{"id":"func/AdminUseCases.listInvoices","name":"AdminUseCases.listInvoices","line":19,"end_line":27,"hash":"72e6da132bbc3ee2fff470a699cd5d9f4fc933c84dfe1f31d45fa63da583418d"},{"id":"func/AdminUseCases.removeFile","name":"AdminUseCases.removeFile","line":31,"end_line":60,"hash":"61a2ee0ef10b3588adb00c0c67de4456129d55f536f445d98c96388dba526b96"}]}
// mutate4javascript-manifest-end
