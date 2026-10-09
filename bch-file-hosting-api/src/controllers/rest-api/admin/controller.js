/*
  REST controller for operator endpoints. All routes require x-api-key.
*/

import { sendSuccess } from '../respond.js'

class AdminController {
  constructor ({ useCases } = {}) {
    if (!useCases) throw new Error('AdminController requires the use-cases')
    this.useCases = useCases

    this.listInvoices = this.listInvoices.bind(this)
    this.listFiles = this.listFiles.bind(this)
    this.removeFile = this.removeFile.bind(this)
    this.retrySweeps = this.retrySweeps.bind(this)
    this.runCleanup = this.runCleanup.bind(this)
  }

  /**
   * @api {get} /admin/invoices List invoices
   * @apiQuery {String} [status] awaitingPayment, paid, or deleted
   * @apiQuery {String} [sweepStatus] pending, swept, or empty
   */
  async listInvoices (req, res) {
    const { status, sweepStatus } = req.query
    const invoices = await this.useCases.admin.listInvoices({ status, sweepStatus })
    sendSuccess(res, { invoices })
  }

  /**
   * @api {get} /admin/files List files
   * @apiQuery {String} [status] staged, pinned, pinFailed, or deleted
   */
  async listFiles (req, res) {
    const { status } = req.query
    const files = await this.useCases.admin.listFiles({ status })
    sendSuccess(res, { files })
  }

  /**
   * @api {post} /admin/files/:cid/delete Remove a file from every pinning provider
   */
  async removeFile (req, res) {
    sendSuccess(res, await this.useCases.admin.removeFile({ cid: req.params.cid }))
  }

  /**
   * @api {post} /admin/sweeps/retry Sweep paid invoices that have not been swept
   */
  async retrySweeps (req, res) {
    sendSuccess(res, await this.useCases.payments.retrySweeps())
  }

  /**
   * @api {post} /admin/cleanup/run Delete expired unpaid uploads now
   */
  async runCleanup (req, res) {
    sendSuccess(res, await this.useCases.cleanup.deleteUnpaid())
  }
}

export default AdminController
