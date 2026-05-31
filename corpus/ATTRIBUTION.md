# Corpus attribution

The files in this directory are **third-party source code**, vendored unmodified
(as fetched) from permissively-licensed open-source projects and used here only
as measurement inputs for the token-efficiency experiment. Each remains under
its original license. Provenance is also recorded machine-readably in
`manifest.json`.

| File | Source project | Pinned ref | Copyright | License |
|---|---|---|---|---|
| `util-pmap.js` | [sindresorhus/p-map](https://github.com/sindresorhus/p-map) | v7.0.3 `/index.js` | Sindre Sorhus | MIT |
| `http-ky.ts` | [sindresorhus/ky](https://github.com/sindresorhus/ky) | v1.7.2 `/source/index.ts` | Sindre Sorhus | MIT |
| `util-typefest-paths.ts` | [sindresorhus/type-fest](https://github.com/sindresorhus/type-fest) | v4.26.1 `/source/get.d.ts` | Sindre Sorhus | MIT |
| `util-nanoid.js` | [ai/nanoid](https://github.com/ai/nanoid) | 5.0.7 `/index.browser.js` | Andrey Sitnik | MIT |
| `state-zustand.ts` | [pmndrs/zustand](https://github.com/pmndrs/zustand) | v4.5.5 `/src/vanilla.ts` | Paul Henschel and the Poimandres contributors | MIT |

All five are distributed under the MIT License (text below). The full,
authoritative license and copyright notices live in each source repository.

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The `eval/snippets/` and `eval/why-how/snippets/` fixtures, by contrast, are
**original** bespoke code authored for this experiment and covered by the
repository's own `LICENSE`.
