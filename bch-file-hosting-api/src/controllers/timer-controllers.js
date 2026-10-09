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
      { name: 'retrySweeps', intervalMs: 30 * MINUTE, run: () => this.useCases.payments.retrySweeps() },
      { name: 'retryPins', intervalMs: 60 * MINUTE, run: () => this.useCases.payments.retryPins() }
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:23:03.948Z","module_hash":"5ed65311c2633a679e9244b16c3ee82263e2d4607bfc17b1103ca2ec8a6afd48","functions":[{"id":"func/TimerControllers.constructor","name":"TimerControllers.constructor","line":9,"end_line":24,"hash":"b6a108875c67d6af9e614cc1d76dcd1d85736159494ba4cd6de842334a841aed"},{"id":"func/TimerControllers.startTimers","name":"TimerControllers.startTimers","line":26,"end_line":32,"hash":"fc782ef8289a20487916e95c88911024f32400b0ffbf45805b7e96fbeaf4f63f"},{"id":"func/TimerControllers.runJob","name":"TimerControllers.runJob","line":34,"end_line":47,"hash":"2089e2e582d334583c71aae6e4ca135ce2947ef953a84e4ff6ba0af3955f9edb"},{"id":"func/TimerControllers.stopTimers","name":"TimerControllers.stopTimers","line":49,"end_line":52,"hash":"c6162c40a40b9bc85e3df29d247024ea91552726661f6fb903a3201cdfd5d95e"}]}
// mutate4javascript-manifest-end
