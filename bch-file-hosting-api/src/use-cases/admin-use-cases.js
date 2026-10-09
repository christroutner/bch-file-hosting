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
// {"version":1,"tested_at":"2026-10-09T03:18:27.065Z","module_hash":"f8ba8f35edc25c78088590b6e276d6100b8fc91913bedea53bdce64e215d1196","functions":[{"id":"func/assertKnownStatus","name":"assertKnownStatus","line":12,"end_line":16,"hash":"2617a8a336c19ef3865d5ab3ea8a00e826d07e785665371a549e03240be1b7b0"},{"id":"func/AdminUseCases.constructor","name":"AdminUseCases.constructor","line":19,"end_line":25,"hash":"45e105231945e123bbefe10528dd554e56eec6a2a3b727c6f5d9e3761baace66"},{"id":"func/AdminUseCases.listInvoices","name":"AdminUseCases.listInvoices","line":27,"end_line":31,"hash":"4ee71f585f174bb4ac763acb20b8bd64f930353c8d65009f25e66544b0b881b2"},{"id":"func/AdminUseCases.listFiles","name":"AdminUseCases.listFiles","line":33,"end_line":36,"hash":"fef9b929f612fb57faf409954df1f7d161681ea8609ac1c18949b6f81071b721"},{"id":"func/AdminUseCases.removeFile","name":"AdminUseCases.removeFile","line":40,"end_line":69,"hash":"61a2ee0ef10b3588adb00c0c67de4456129d55f536f445d98c96388dba526b96"}]}
// mutate4javascript-manifest-end
