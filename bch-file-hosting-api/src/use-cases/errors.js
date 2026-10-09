/*
  Errors raised by use-cases. The status property is the HTTP status the REST
  controllers return for each kind of error.
*/

export class ValidationError extends Error {
  constructor (message) {
    super(message)
    this.name = 'ValidationError'
    this.status = 422
  }
}

export class NotFoundError extends Error {
  constructor (message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
  }
}
