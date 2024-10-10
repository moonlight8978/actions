import { parseBlocks } from '../src/main'

describe('parseColumns', () => {
  it('parse the input into columns', () => {
    const input = `
    |W| image: |W| passing |W| image-png
    |W| :inline |W| Environment |W| Development
    |W| :inline |W| Version |W| 1.0
    |W| :inline |W| Build |W| build-number
    |W| :inline |W| Author |W| Alice
    |W| :full |W| Changelog |W| some\nchange\nlog
    |W| button-url: |W| Download |W| download-url
`

    expect(parseBlocks(input)).toEqual([
      {
        type: 'image',
        image_url: 'image-png',
        alt_text: 'passing'
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: '*Environment*\nDevelopment'
          },
          {
            type: 'mrkdwn',
            text: '*Version*\n1.0'
          },
          {
            type: 'mrkdwn',
            text: '*Build*\nbuild-number'
          },
          {
            type: 'mrkdwn',
            text: '*Author*\nAlice'
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Changelog*\nsome\nchange\nlog'
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Download',
              emoji: true
            },
            action_id: 'Download',
            url: 'download-url'
          }
        ]
      }
    ])
  })
})
