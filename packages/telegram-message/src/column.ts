import { trim } from 'lodash'
import { string } from 'yup'

export type Column = {
  title: string
  content: string
  variant: string
}

export function parseColumns(columns: string) {
  const columnContentSchema = string().required()
  const columnVariantSchema = string().required()
  const columnTitleSchema = string().required()

  return columns
    .split('|W|')
    .map((col) => trim(col))
    .slice(1)
    .reduce((acc, column, index) => {
      if (index % 3 === 0) {
        acc.push({
          content: '',
          title: '',
          variant: '',
        })
      }

      const currentColumn = acc[acc.length - 1]

      switch (index % 3) {
        case 0:
          currentColumn.variant = columnVariantSchema.cast(column)
          break

        case 1:
          currentColumn.title = columnTitleSchema.cast(column)
          break

        case 2:
          currentColumn.content = columnContentSchema.cast(column)
          break
      }

      return acc
    }, [] as Column[])
}
