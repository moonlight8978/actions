const fs = require('fs')
const { exec, execSync } = require('child_process')
const { promisify } = require('util')

const execAsync = (command, options) => {
  return new Promise((resolve, reject) => {
    process.stdout.write(`Executing ${command}...\n`)
    const execution = exec(command, options, (err, stdout) => {
      if (err) {
        reject(err)
      }

      resolve(stdout)
    })

    execution.stdout.pipe(process.stdout)
  })
}

async function main() {
  const packageJson = JSON.parse(
    fs.readFileSync('package.json', 'utf-8').toString()
  )
  const templatePackageJson = JSON.parse(
    fs.readFileSync('template/package.json', 'utf-8').toString()
  )
  Object.assign(templatePackageJson.dependencies, packageJson.dependencies)
  Object.assign(
    templatePackageJson.devDependencies,
    packageJson.devDependencies
  )
  fs.writeFileSync(
    'template/package.json',
    JSON.stringify(templatePackageJson, null, 2)
  )
  const pnpmInstall = await execAsync('pnpm install', { cwd: 'template' })

  fs.rmSync(`dist`, { recursive: true, force: true })

  const projects = fs.readdirSync('packages')
  for (const project of projects) {
    fs.copyFileSync(`packages/${project}/action.yml`, 'template/action.yml')
    fs.rmSync('template/src', { recursive: true, force: true })

    fs.cpSync(`packages/${project}/src`, 'template/src', { recursive: true })

    await execAsync('pnpm package', { cwd: 'template' })

    fs.mkdirSync(`dist/${project}`, { recursive: true })
    fs.cpSync('template/dist', `dist/${project}/dist`, { recursive: true })
    fs.cpSync('template/action.yml', `dist/${project}/action.yml`)
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
