import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { applyFileText } from './src/lib/admin/media-file';

const buildTime = ''

const DICTIONARY_FILE = 'src/lib/data/exercise-dictionary.ts'
const WARMUP_FILE = 'src/lib/data/exercise-warmup.ts'

const SAVE_ROUTES: Record<string, { path: string; arrayName: string }> = {
  '/__admin/dictionary-save': { path: DICTIONARY_FILE, arrayName: 'EXERCISE_DICTIONARY' },
  '/__admin/warmup-save': { path: WARMUP_FILE, arrayName: 'EXERCISE_WARMUP' }
}

function mediaEditorPlugin(): Plugin {
  return {
    name: 'media-editor-plugin',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0]
        const route = SAVE_ROUTES[url]
        if (!route) return next()
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
            const file = path.resolve(process.cwd(), route.path)
            const src = await fs.promises.readFile(file, 'utf8')
            const result = applyFileText(src, payload.changes, route.arrayName)
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
    },
    handleHotUpdate(ctx) {
      const target = Object.values(SAVE_ROUTES).find((f) => path.resolve(process.cwd(), f.path) === ctx.file)
      if (target) {
        // The admin page re-imports the data after saving — suppress the full reload.
        return []
      }
    }
  }
}

export default defineConfig({
	plugins: [mediaEditorPlugin(), sveltekit()],
});
