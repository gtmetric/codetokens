import { transformSync } from '@babel/core'
import type { Transform } from '../transform.type.ts'

export const stripTypes: Transform = {
  name: 'strip-types',
  description: 'Erase all TS type annotations via @babel/preset-typescript (runtime-equivalent JS). Measures the "type tax".',
  equivalence: 'canonical',
  apply(code, lang) {
    const isTSX = lang === 'tsx' || lang === 'jsx'
    const result = transformSync(code, {
      filename: `file.${lang}`,
      babelrc: false,
      configFile: false,
      comments: true,
      retainLines: true,
      presets: [['@babel/preset-typescript', { allExtensions: true, isTSX, allowDeclareFields: true, onlyRemoveTypeImports: false }]],
    })
    if (result?.code == null) throw new Error('strip-types produced no output')
    return result.code
  },
}
