/*
  Top-level controllers library: the REST API (inputs from users) and the
  timers (inputs from the clock).
*/

import RestApi from './rest-api/index.js'
import TimerControllers from './timer-controllers.js'

class Controllers {
  constructor ({ useCases, adapters, config } = {}) {
    if (!useCases) throw new Error('Controllers requires the use-cases')
    if (!adapters) throw new Error('Controllers requires the adapters')
    if (!config) throw new Error('Controllers requires a config object')

    this.restApi = new RestApi({ useCases, adapters, config })
    this.timers = new TimerControllers({ useCases, logger: adapters.logger })
  }

  buildApp () {
    return this.restApi.buildApp()
  }

  startTimers () {
    return this.timers.startTimers()
  }

  stopTimers () {
    this.timers.stopTimers()
  }
}

export default Controllers
