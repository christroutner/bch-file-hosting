/*
  Periodic jobs: delete expired unpaid uploads and retry failed sweeps. A job
  is skipped if its previous run is still in progress.
*/

const MINUTE = 60 * 1000

class TimerControllers {
  constructor ({ useCases, logger } = {}) {
    if (!useCases) throw new Error('TimerControllers requires the use-cases')
    this.useCases = useCases
    this.logger = logger

    // Encapsulated for unit tests.
    this.setInterval = setInterval
    this.clearInterval = clearInterval

    this.jobs = [
      { name: 'deleteUnpaid', intervalMs: 60 * MINUTE, run: () => this.useCases.cleanup.deleteUnpaid() },
      { name: 'retrySweeps', intervalMs: 30 * MINUTE, run: () => this.useCases.payments.retrySweeps() }
    ]
    this.handles = []
    this.running = new Set()
  }

  startTimers () {
    this.stopTimers()
    for (const job of this.jobs) {
      this.handles.push(this.setInterval(() => this.runJob(job), job.intervalMs))
    }
    return this.handles.length
  }

  async runJob (job) {
    if (this.running.has(job.name)) return false

    this.running.add(job.name)
    let succeeded = true
    try {
      await job.run()
    } catch (err) {
      this.logger.error(`Timer job ${job.name} failed: ${err.message}`)
      succeeded = false
    }
    this.running.delete(job.name)
    return succeeded
  }

  stopTimers () {
    for (const handle of this.handles) this.clearInterval(handle)
    this.handles = []
  }
}

export default TimerControllers
