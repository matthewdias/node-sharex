#! /usr/bin/env node

const fs = require('fs')
const os = require('os')
const stripBom = require('strip-bom')
const spawn = require('child_process').spawn
const clipboard = require('clipboardy')
const cli = require('commander')
const ora = require('ora')
const request = require('request')

const configPath = os.homedir() + '/.config/sharex'
const optionsPath = configPath + '/options.json'
const uploadersPath = configPath + '/uploaders'

let options = {}
if (!fs.existsSync(configPath)) {
  fs.linkSync('./config', configPath)
}
if (fs.existsSync(optionsPath)) {
  options = JSON.parse(fs.readFileSync(optionsPath, 'utf8'))
}

cli
  .usage('[options] <file(s) ...>')
  .option('-u, --uploader <sxcu>', 'Name of custom uploader from config folder')
  .option('-c, --copy', 'Copy link to clipboard (first file only)')
  .option('-d, --del', 'Delete file(s) after uploading')
  .parse(process.argv)

Object.assign(options, cli)
let { uploader, copy, del } = options
const files = options.args

if (!uploader) {
  console.log('No uploader specified.')
  cli.help()
}
if (files.length < 1) {
  console.log('No files specified.')
  cli.help()
}

if (!uploader.endsWith('.sxcu'))
  uploader += '.sxcu'
uploader = JSON.parse(stripBom(fs.readFileSync(uploadersPath + '/' + uploader, 'utf8')))

const req = {
  url: uploader.RequestURL,
  method: uploader.RequestType,
  formData: { [uploader.FileFormName]: files.map(file => fs.createReadStream(file)) }
}

const spinner = ora('Uploading...').start()

request.post(req, (err, res, body) => {
  if (err)
    return spinner.fail(err)
  // console.log(res)
  const data = JSON.parse(body)
  if (res.statusCode != '200')
    return spinner.fail(data.description)

  if (copy)
    clipboard.writeSync(data.files[0].url)
  if (del)
    files.map(file => fs.unlinkSync(file))

  let output = `Success!${copy ? ' Copied.': ''}${del ? ' Deleted.' : ''}\n`
  output += data.files.map(file => `${file.name}: ${file.url}`).join(',\n')
  spinner.succeed(output)
})
