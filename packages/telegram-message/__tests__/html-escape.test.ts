import { htmlEscape } from '../src/main'

describe('htmlSafe', () => {
  it('escape html inside <html-escape> tag', () => {
    const input = `<a>Link</a> some thing <html-escape>asdsaas Co-author: email@example.com <email@example.com></html-escape>`

    expect(htmlEscape(input)).toEqual(
      `<a>Link</a> some thing asdsaas Co-author: email@example.com &lt;email@example.com&gt;`
    )
  })

  it('escape multi-line string', () => {
    const input = `<html-escape>fix: Fix html entities

1. feat1
2. feat2

Co-author: bichle-mechmaster <bich.le@icetea.io></html-escape>`

    expect(htmlEscape(input)).toEqual(
      `fix: Fix html entities&#10;&#10;1. feat1&#10;2. feat2&#10;&#10;Co-author: bichle-mechmaster &lt;bich.le@icetea.io&gt;`
    )
  })

  it('escape empty string', () => {
    const input = `<html-escape></html-escape>`
    expect(htmlEscape(input)).toEqual('')
  })

  it('remove trailing comma and spaces', () => {
    const input = `<html-escape>
      http://localhost/dashboard/\nhttp://localhost/grafana/dashboards
    </html-escape>`

    expect(htmlEscape(input)).toEqual(
      'http://localhost/dashboard/&#10;http://localhost/grafana/dashboards'
    )
  })

  it('parse the semver correctly', () => {
    const input = `1.0`

    expect(htmlEscape(input)).toEqual('1.0')
  })
})
