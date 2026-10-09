/*
  Winston logger with daily log rotation. Secret-looking fields are redacted
  before anything is written.
*/

import winston from 'winston'
import 'winston-daily-rotate-file'

const SECRET_KEY_REGEX = /wif|mnemonic|privatekey|apikey|password|secret/i

export const redactSecrets = winston.format((info) => {
  for (const key of Object.keys(info)) {
    if (SECRET_KEY_REGEX.test(key)) info[key] = '[redacted]'
  }
  return info
})

export function createLogger ({ config }) {
  const isTest = config.env === 'test'

  const transports = [
    new winston.transports.Console({
      silent: isTest,
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]

  if (!isTest) {
    transports.push(new winston.transports.DailyRotateFile({
      dirname: config.logDir,
      filename: 'bch-file-hosting-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    }))
  }

  return winston.createLogger({
    level: config.logLevel,
    format: winston.format.combine(
      redactSecrets(),
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports
  })
}

export default createLogger
