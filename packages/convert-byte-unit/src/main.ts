import * as core from '@actions/core'

export type Unit = 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB' | 'EB' | 'ZB' | 'YB'

const units: Unit[] = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

export function convert({
  unit,
  amount,
  toUnit
}: {
  unit: Unit
  amount: number
  toUnit: Unit
}) {
  const fromUnitExponent = units.findIndex(u => u === unit)
  const toUnitExponent = units.findIndex(u => u === toUnit)
  const exponentDiff = fromUnitExponent - toUnitExponent

  // TODO: Support bit units
  const toAmount = Math.round(Math.pow(1024, exponentDiff) * amount * 100) / 100

  return {
    amount: toAmount,
    unit: toUnit
  }
}

export async function run(): Promise<void> {
  try {
    const amount = Number(core.getInput('amount'))
    const unit = core.getInput('unit') as Unit
    const toUnit = core.getInput('to-unit') as Unit

    const output = convert({ unit, amount, toUnit })
    core.setOutput('amount', output.amount)
    core.setOutput('unit', output.unit)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
