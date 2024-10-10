import * as core from '@actions/core'
import { string, object, number } from 'yup'
import { Column, parseColumns } from './column'
import {
  WebhookClient,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  GatewayIntentBits,
  Events,
  TextChannel,
  ThreadChannel
} from 'discord.js'

class DiscordBotClient {
  #token: string
  #channelId: string
  #client!: Client

  constructor(inputs: any) {
    const { token, channel } = object({
      token: string().required().trim(),
      channel: string().required().trim()
    }).cast(inputs)

    this.#token = token
    this.#channelId = channel
  }

  async bootstrap() {
    core.info('Bootstrapping bot client')
    this.#client = await new Promise((resolve, reject) => {
      const client = new Client({ intents: [GatewayIntentBits.Guilds] })

      client.once(Events.ClientReady, async readyClient => {
        core.info(`Bot is ready. ${readyClient.user.tag}`)
        resolve(readyClient)
      })

      client.once(Events.Error, async error => {
        core.error(error.message)
        core.setFailed(error.message)

        await client.destroy()

        reject(error)
      })

      client.login(this.#token)
    })
  }

  async terminate() {
    await this.#client?.destroy().catch(() => {})
  }

  async sendMessage(color: number, message: string, columns: Column[]) {
    const channel = (await this.#client.channels.fetch(this.#channelId)) as
      | TextChannel
      | ThreadChannel
      | null

    if (!channel) {
      throw new Error(`Channel not found: ${this.#channelId}`)
    }

    const embedColumns = columns.filter(column =>
      ['inline', 'full'].includes(column.variant)
    )

    const embed = new EmbedBuilder().setColor(color).addFields(
      embedColumns.map(column => ({
        name: column.title,
        value: column.content,
        inline: column.variant === 'inline'
      }))
    )

    const components = columns
      .filter(column =>
        ['button'].some(variant => column.variant.includes(variant))
      )
      .map(column => {
        if (column.variant.includes('button')) {
          const style = ((column.variant.split(':')[1] as any) ??
            ButtonStyle.Primary) as ButtonStyle
          return new ButtonBuilder()
            .setStyle(style)
            .setLabel(column.title)
            .setURL(column.content)
        }

        throw new Error('Invalid column variant')
      })

    core.info(`embeds: ${embedColumns.length}`)
    core.info(`components: ${components.length}`)

    await channel.send({
      embeds: embedColumns.length ? [embed] : undefined,
      content: message || undefined,
      components: components.length
        ? [new ActionRowBuilder<ButtonBuilder>().addComponents(components)]
        : undefined
    })
  }
}

class DiscordWebhookClient {
  #url: string
  #threadId?: string
  #client!: WebhookClient

  constructor(inputs: any) {
    const { webhookUrl, threadId } = object({
      webhookUrl: string().required().trim(),
      threadId: string().optional().nullable()
    }).cast(inputs)

    this.#url = webhookUrl
    this.#threadId = threadId || undefined
  }

  async bootstrap() {
    core.info('Bootstrapping webhook client')
    this.#client = new WebhookClient({ url: this.#url })
  }

  async terminate() {}

  async sendMessage(color: number, message: string, columns: Column[]) {
    const embedColumns = columns.filter(column =>
      ['inline', 'full'].includes(column.variant)
    )

    const embed = new EmbedBuilder().setColor(color).addFields(
      embedColumns.map(column => ({
        name: column.title,
        value: column.content,
        inline: column.variant === 'inline'
      }))
    )

    await this.#client.send({
      embeds: embedColumns.length ? [embed] : undefined,
      content: message || undefined,
      threadId: this.#threadId
    })
  }
}

export async function run(): Promise<void> {
  const isBotClient = !!core.getInput('token')

  const client = isBotClient
    ? new DiscordBotClient({
        token: core.getInput('token'),
        channel: core.getInput('channel')
      })
    : new DiscordWebhookClient({
        webhookUrl: core.getInput('webhook-url'),
        threadId: core.getInput('thread-id')
      })

  const messageInputs = object({
    message: string().trim(),
    columns: string().required().trim(),
    color: number().integer().required()
  }).cast({
    message: core.getInput('message'),
    columns: core.getInput('columns'),
    color: core.getInput('color')
  })

  const columns = parseColumns(messageInputs.columns)

  try {
    await client.bootstrap()
    await client.sendMessage(
      messageInputs.color,
      messageInputs.message || '',
      columns
    )
    core.info('Message sent')
  } catch (err: any) {
    core.error(err.message)
    core.setFailed(err.message)
  } finally {
    await client.terminate()
  }
}
