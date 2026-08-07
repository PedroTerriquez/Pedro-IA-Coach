import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { applyFileText } from './src/lib/admin/media-file';

const buildTime = new Date().toISOString().slice(0, 16).replace('T', ' ')

const DICTIONARY_FILE = 'src/lib/data/exercise-dictionary.ts'

function mediaEditorPlugin(): Plugin {
  return {
    name: 'media-editor-plugin',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0]
        if (url !== '/__admin/dictionary-save') return next()
        if (req.method === 'GET') {
          res.statusCode = 404
          res.end('only POST')
          return
        }
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Allow', 'POST')
          res.end('method not allowed')
          return
        }
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body || '{}')
            if (!Array.isArray(payload.changes)) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'changes must be an array' }))
              return
            }
            const file = path.resolve(process.cwd(), DICTIONARY_FILE)
            const src = await fs.promises.readFile(file, 'utf8')
            const result = applyFileText(src, payload.changes)
            if (result.notFound.length) {
              res.statusCode = 422
              res.end(JSON.stringify({ error: 'entradas no encontradas', notFound: result.notFound }))
              return
            }
            if (result.applied > 0) {
              await fs.promises.writeFile(file, result.text, 'utf8')
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ applied: result.applied }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: String((err as Error)?.message || err) }))
          }
        })
      })
    }
  }
}

export default defineConfig({
	plugins: [mediaEditorPlugin(), sveltekit()],
	define: {
		__BUILD_TIME__: JSON.stringify(buildTime)
	}
});
