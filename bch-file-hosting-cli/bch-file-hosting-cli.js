#!/usr/bin/env node
/*
  Primary entry point for the bch-file-hosting CLI.
  Uses commander.js.
*/

// Global npm libraries
import { Command } from 'commander'

// Local libraries
import FileUpload from './src/commands/file-upload.js'
import FileCheck from './src/commands/file-check.js'

// Instantiate subcommands
const fileUpload = new FileUpload()
const fileCheck = new FileCheck()

const program = new Command()

program
  .name('bch-file-hosting-cli')
  .description('Command-line client for the bch-file-hosting REST API.')

program.command('file-upload')
  .description('Upload a file and print its hosting quote (-f <path>, --json)')
  .option('-f, --file <path>', 'path of the file to upload')
  .option('--json', 'print the result as a single JSON object')
  .action(async (flags) => {
    process.exitCode = await fileUpload.run(flags)
  })

program.command('file-check')
  .description('Check a payment address and print its status (-a <address>, --json)')
  .option('-a, --address <address>', 'payment address to check')
  .option('--json', 'print the result as a single JSON object')
  .action(async (flags) => {
    process.exitCode = await fileCheck.run(flags)
  })

program.parseAsync(process.argv)
