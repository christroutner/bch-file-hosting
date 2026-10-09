#!/usr/bin/env node
/*
  Primary entry point for the bch-file-hosting CLI.
  Uses commander.js.
*/

// Global npm libraries
import { Command } from 'commander'

// Local libraries
import FileUpload from './src/commands/file-upload.js'

// Instantiate subcommands
const fileUpload = new FileUpload()

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

program.parseAsync(process.argv)
