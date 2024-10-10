import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'
import type { PushEvent } from '@octokit/webhooks-types'

async function capture(
  command: string,
  args: string[],
  fallback: () => string = () => ''
): Promise<string> {
  try {
    const { exitCode, stdout } = await exec.getExecOutput(command, args)

    if (exitCode === 0) {
      return stdout.trim()
    }

    return (fallback() || '').trim()
  } catch (err) {
    return (fallback() || '').trim()
  }
}

export async function run(): Promise<void> {
  const payload = github.context.payload

  const strategy = core.getInput('strategy', { required: true }) as
    | 'head'
    | 'smart'
  const headFormat = core.getInput('head-format', { required: true })
  const mergeFormat = core.getInput('merge-format', { required: true })
  const limit = Number(core.getInput('limit', { required: true }))

  const sha = await capture(
    'git',
    ['rev-parse', 'HEAD'],
    () => github.context.sha
  )

  const shaShort = await capture('git', ['rev-parse', '--short', 'HEAD'], () =>
    sha.slice(0, 7)
  )

  const branch = await capture(
    'git',
    ['rev-parse', '--abbrev-ref', 'HEAD'],
    () => github.context.ref.replace(/^refs\/heads\//, '')
  )

  const author = await capture(
    'git',
    ['log', '-1', '--pretty=format:%an'],
    () => {
      const event = payload as PushEvent
      return (
        event.head_commit?.author.username ??
        event.head_commit?.author.name ??
        event.pusher?.name ??
        event.pusher?.username ??
        event.sender.name ??
        event.sender.login
      )
    }
  )

  const getLatestCommitMessage = async () => {
    return await capture(
      'git',
      ['log', '-1', `--pretty=format:${headFormat}`],
      () => {
        const event = payload as PushEvent
        return event.head_commit?.message ?? github.context.workflow
      }
    )
  }

  const getMessage = async () => {
    if (strategy === 'head') {
      return await getLatestCommitMessage()
    }

    const parentCommits = await capture('git', [
      'show',
      '--pretty=%ph',
      '--quiet',
      'HEAD'
    ]).then(output => output.split(' '))

    const isMergeCommit = parentCommits.length > 1

    if (!isMergeCommit) {
      return await getLatestCommitMessage()
    }

    const previousMergeCommit = parentCommits[0]
    const commits = await capture('git', [
      'log',
      '--oneline',
      '--no-merges',
      `--pretty=format:${mergeFormat}`,
      `${previousMergeCommit}..HEAD`
    ]).then(stdout => stdout.split('\n').filter(Boolean))

    const changelog = commits.slice(0, limit).join('\n')

    return changelog
  }

  const message = await getMessage()

  core.setOutput('sha-short', shaShort)
  core.setOutput('sha', sha)
  core.setOutput('branch', branch)
  core.setOutput('author', author)
  core.setOutput('message', message)
}
