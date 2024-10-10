import * as core from '@actions/core'
import axios from 'axios'
import { number, string, object } from 'yup'
import { parseColumns } from './column'

export function parseBlocks(text: string) {
  const atomics = parseColumns(text).map(column => {
    let type = 'mrkdwn'
    let width = 'full'

    if (column.variant.includes(':')) {
      const variants = column.variant.split(':')
      type = variants[0] || type
      width = variants[1] || width
    } else {
      width = column.variant
    }

    switch (type) {
      case 'image':
        return {
          width,
          type: 'image',
          image_url: column.content,
          alt_text: column.title
        }

      case 'mrkdwn':
        return {
          width,
          type: 'mrkdwn',
          text: `*${column.title}*\n${column.content}`
        }

      case 'button-url':
        return {
          width,
          type: 'button',
          text: {
            type: 'plain_text',
            text: column.title,
            emoji: true
          },
          action_id: column.title,
          url: column.content
        }

      default:
        throw `Unknown block type ${type}`
    }
  })

  const blocks: Array<{ type: string } & { [key: string]: any }> = []

  atomics.forEach((current, index) => {
    const prev = atomics[index - 1]
    const { width, ...block } = current

    if (block.type === 'image') {
      blocks.push(block)
    }

    if (block.type === 'mrkdwn') {
      if (
        block.type !== prev?.type ||
        width === 'full' ||
        prev?.width === 'full'
      ) {
        blocks.push({
          type: 'section',
          fields: [block]
        })
      } else {
        blocks[blocks.length - 1].fields.push(block)
      }
    }

    if (block.type.startsWith('button')) {
      if (block.type !== prev?.type) {
        blocks.push({
          type: 'actions',
          elements: [block]
        })
      } else {
        blocks[blocks.length - 1].elements.push(block)
      }
    }
  })

  return blocks.map(block => {
    if (block.type === 'section') {
      if (block.fields.length === 1) {
        return {
          type: 'section',
          text: block.fields[0]
        }
      }
    }

    return block
  })
}

export async function run(): Promise<void> {
  const schema = object({
    message: string().required().trim(),
    columns: string().required().trim(),
    webhookUrl: string().required().trim()
  })

  const inputs = schema.cast({
    message: core.getInput('message'),
    columns: core.getInput('columns'),
    webhookUrl: core.getInput('webhook-url')
  })

  const blocks = parseBlocks(inputs.columns)

  await axios
    .post(
      inputs.webhookUrl,
      {
        text: inputs.message,
        blocks: blocks.length > 0 ? blocks : undefined
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
    .then(() => {
      core.info('Message sent')
      core.debug(JSON.stringify(blocks))
    })
    .catch(err => {
      core.error(err.message)
      if (err.response) {
        core.error(err.response.data)
      }
      core.setFailed(err.message)
    })
}
