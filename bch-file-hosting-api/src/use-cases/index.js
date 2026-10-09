/*
  Top-level use-cases library. Expects adapters that have already been started.
*/

import FileUseCases from './file-use-cases.js'
import PaymentUseCases from './payment-use-cases.js'
import CleanupUseCases from './cleanup-use-cases.js'
import AdminUseCases from './admin-use-cases.js'

class UseCases {
  constructor ({ adapters } = {}) {
    if (!adapters) {
      throw new Error('Instance of adapters must be passed in when instantiating Use Cases library.')
    }
    this.adapters = adapters

    this.files = new FileUseCases({ adapters })
    this.payments = new PaymentUseCases({ adapters })
    this.cleanup = new CleanupUseCases({ adapters, payments: this.payments })
    this.admin = new AdminUseCases({ adapters })
  }
}

export default UseCases
