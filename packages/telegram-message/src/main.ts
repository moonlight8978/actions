import * as core from '@actions/core'
import { string, object } from 'yup'
import { escape, trim } from 'lodash'
import axios from 'axios'
import { Column, parseColumns } from './column'

const lineBreak = `&#10;`

export function htmlEscape(str: string) {
  const escaped = str.replace(
    /<html-escape>((.|\n|\r\n)*?)<\/html-escape>/,
    (_, p1) => {
      return escape(p1).replaceAll(lineBreak, '\n')
    }
  )

  // how
  return trim(escaped).replaceAll(/[\r\n]/gm, lineBreak)
}

export function columnsToMessage(columns: Column[]) {
  return columns
    .map(column => {
      const content = htmlEscape(column.content)

      return column.variant === 'full'
        ? `▪️ <b>${column.title}</b>${lineBreak}${content}`
        : `▪️ <b>${column.title}</b>: ${content}`
    })
    .join(lineBreak)
}

export async function run(): Promise<void> {
  const schema = object({
    message: string().required().trim(),
    columns: string().required().trim(),
    groupId: string().required().trim(),
    token: string().required().trim(),
    topic: string().optional()
  })

  const inputs = schema.cast({
    message: core.getInput('message', { required: true }),
    columns: core.getInput('columns', { required: true }),
    groupId: core.getInput('group', { required: true }),
    token: core.getInput('token', { required: true }),
    topic: core.getInput('topic')
  })

  const message = [
    inputs.message,
    lineBreak,
    lineBreak,
    columnsToMessage(parseColumns(inputs.columns))
  ].join('')

  console.log(message)

  try {
    await axios.post(
      `https://api.telegram.org/bot${inputs.token}/sendMessage`,
      {
        chat_id: inputs.groupId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_to_message_id: inputs.topic || undefined
      }
    )
  } catch (err: any) {
    console.error(err.message, err.stack)
    core.error(err.message)
    if (err.response) {
      core.error(JSON.stringify(err.response.data))
    }
    core.setFailed(err.message)
  }
}
