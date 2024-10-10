import * as core from '@actions/core'
import * as google from '@googleapis/drive'
import { number, object, string } from 'yup'
import path from 'path'
import fs from 'fs'
import * as github from '@actions/github'

export async function run(): Promise<void> {
  const schema = object({
    folder: string().required(),
    serviceAccountBase64: string().required(),
    githubToken: string().required(),
    workflowName: string().optional(),
    numFileKeep: number().required()
  })

  const inputs = schema.cast({
    folder: core.getInput('folder'),
    serviceAccountBase64: core.getInput('service-account-base64'),
    githubToken: core.getInput('github-token'),
    workflowName:
      core.getInput('workflow', { required: false }) || github.context.workflow,
    numFileKeep: core.getInput('keep')
  })

  const {
    folder: folderId,
    serviceAccountBase64,
    githubToken,
    workflowName,
    numFileKeep
  } = inputs

  const credentialsFilePath = path.join(
    __dirname,
    `${new Date().getTime()}.service-account.json`
  )

  fs.writeFileSync(
    credentialsFilePath,
    Buffer.from(serviceAccountBase64, 'base64')
  )

  const auth = new google.auth.GoogleAuth({
    keyFilename: credentialsFilePath,
    scopes: ['https://www.googleapis.com/auth/drive']
  })
  const authClient = await auth.getClient()

  const driveClient = google.drive({
    version: 'v3',
    // @ts-expect-error Library error
    auth: authClient
  })

  const octokit = github.getOctokit(githubToken)

  const listFolderResponse = await driveClient.files.list({
    q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
    supportsAllDrives: true,
    includeTeamDriveItems: true,
    maxResults: 1000
  })

  const buildFolderToId = new Map<string, string>(
    (
      (listFolderResponse.data as any).files as google.drive_v3.Schema$File[]
    ).map(file => [file.name!, file.id!])
  )

  const workflows = await octokit.rest.actions.listRepoWorkflows({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo
  })

  const workflow = workflows.data.workflows.find(w => w.name === workflowName)

  if (!workflow) {
    core.setFailed(`Cannot find workflow name with ${workflowName}`)
    return
  }

  const workflowRuns = await octokit.rest.actions.listWorkflowRuns({
    repo: github.context.repo.repo,
    owner: github.context.repo.owner,
    workflow_id: workflow.id,
    per_page: 100,
    exclude_pull_requests: true
  })

  for (const workflowRun of workflowRuns.data.workflow_runs) {
    core.info(
      `Workflow run ID: ${workflowRun.id} - ${workflowRun.status} - ${workflow.updated_at}`
    )
  }

  const workflowBuildFolders = workflowRuns.data.workflow_runs
    .map(workflowRun => ({
      name: workflowRun.id,
      id: buildFolderToId.get(workflowRun.id.toString())
    }))
    .filter(f => f.id)

  const driveClientV2 = google.drive({
    // @ts-expect-error Library error
    version: 'v2',
    // @ts-expect-error Library error
    auth: authClient
  })

  for (const artifact of workflowBuildFolders.slice(numFileKeep)) {
    core.info(`Delete folder: ${artifact.name} ${artifact.id}`)
    await driveClientV2.files.trash({
      supportsAllDrives: true,
      fileId: artifact.id!
    })
  }
}
