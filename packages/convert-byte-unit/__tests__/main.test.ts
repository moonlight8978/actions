import { Unit, convert } from '../src/main'

describe('convert', () => {
  const dataset = [
    ['B', 1024, 'KB', 1],
    ['B', 1536, 'KB', 1.5],
    ['MB', 1, 'KB', 1024],
    ['B', 5389680, 'MB', 5.14]
  ]

  it.each(dataset)(
    'convert correctly',
    // @ts-ignore
    (unit: Unit, amount: number, toUnit: Unit, toAmount: number) => {
      expect(
        convert({
          unit,
          amount,
          toUnit
        })
      ).toEqual({
        unit: toUnit,
        amount: toAmount
      })
    }
  )
})
