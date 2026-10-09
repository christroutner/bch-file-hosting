/*
  Routes for operator endpoints, protected by the admin API key.
*/

import AdminController from './controller.js'
import { createAdminAuth } from '../middleware/admin-auth.js'

class AdminRouter {
  constructor ({ useCases, config } = {}) {
    if (!useCases) throw new Error('AdminRouter requires the use-cases')
    if (!config) throw new Error('AdminRouter requires a config object')

    this.controller = new AdminController({ useCases })
    this.auth = createAdminAuth({ config })
  }

  attach (app) {
    app.get('/admin/invoices', this.auth, this.controller.listInvoices)
    app.get('/admin/files', this.auth, this.controller.listFiles)
    app.post('/admin/files/:cid/delete', this.auth, this.controller.removeFile)
    app.post('/admin/sweeps/retry', this.auth, this.controller.retrySweeps)
    app.post('/admin/cleanup/run', this.auth, this.controller.runCleanup)
  }
}

export default AdminRouter
