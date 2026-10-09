/*
  REST controller for operator endpoints. All routes require x-api-key.
*/

class AdminController {
  constructor ({ useCases } = {}) {
    if (!useCases) throw new Error('AdminController requires the use-cases')
    this.useCases = useCases

    this.listInvoices = this.listInvoices.bind(this)
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
    res.json({ success: true, invoices })
  }

  /**
   * @api {post} /admin/files/:cid/delete Remove a file from every pinning provider
   */
  async removeFile (req, res) {
    const result = await this.useCases.admin.removeFile({ cid: req.params.cid })
    res.json({ success: true, ...result })
  }

  /**
   * @api {post} /admin/sweeps/retry Sweep paid invoices that have not been swept
   */
  async retrySweeps (req, res) {
    const result = await this.useCases.payments.retrySweeps()
    res.json({ success: true, ...result })
  }

  /**
   * @api {post} /admin/cleanup/run Delete expired unpaid uploads now
   */
  async runCleanup (req, res) {
    const result = await this.useCases.cleanup.deleteUnpaid()
    res.json({ success: true, ...result })
  }
}

export default AdminController
