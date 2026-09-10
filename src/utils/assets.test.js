import { existsSync, openSync, readSync, closeSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import assets from '../content/project-assets.json'

describe('项目图片资源', () => {
  for (const [slug, asset] of Object.entries(assets)) {
    it(`${slug} 的轻量图和原图存在且文件格式正确`, () => {
      for (const image of [asset.cover, ...asset.images]) {
        for (const url of [image.src, image.fullSrc]) {
          const path = resolve('public', url.slice(1))
          expect(existsSync(path), url).toBe(true)
          expect(statSync(path).size, url).toBeGreaterThan(100)
          const bytes = Buffer.alloc(12)
          const file = openSync(path, 'r')
          try {
            readSync(file, bytes, 0, 12, 0)
          } finally {
            closeSync(file)
          }
          if (url.endsWith('.webp')) {
            expect(bytes.toString('ascii', 0, 4), url).toBe('RIFF')
            expect(bytes.toString('ascii', 8, 12), url).toBe('WEBP')
          } else if (url.endsWith('.png')) {
            expect(bytes.subarray(0, 8).toString('hex'), url).toBe('89504e470d0a1a0a')
          } else expect(bytes.subarray(0, 2).toString('hex'), url).toBe('ffd8')
        }
      }
    })
  }
})
