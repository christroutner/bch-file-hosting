/*
  Admin use-cases: inspect invoices and remove a file from every pinning
  provider (for moderation or takedown requests).
*/

import { FILE_STATUS } from '../entities/file-upload.js'
import { INVOICE_STATUS, SWEEP_STATUS } from '../entities/invoice.js'
import { NotFoundError, ValidationError } from './errors.js'

class AdminUseCases {
  constructor ({ adapters } = {}) {
    if (!adapters) throw new Error('AdminUseCases requires the adapters')
    this.adapters = adapters

    // Encapsulated for unit tests.
    this.now = () => new Date()

    this.listInvoices = this.listInvoices.bind(this)
    this.removeFile = this.removeFile.bind(this)
  }

  async listInvoices ({ status, sweepStatus } = {}) {
    if (status && !Object.values(INVOICE_STATUS).includes(status)) {
      throw new ValidationError(`Unknown invoice status '${status}'`)
    }
    if (sweepStatus && !Object.values(SWEEP_STATUS).includes(sweepStatus)) {
      throw new ValidationError(`Unknown sweep status '${sweepStatus}'`)
    }
    return this.adapters.localdb.invoices.list({ status, sweepStatus })
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
