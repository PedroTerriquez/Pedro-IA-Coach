import adapter from '@sveltejs/adapter-static';

// Two homes from one code (spec 2026-10-14, Fase B): without env vars this is
// the GitHub Pages build (/Pedro-IA-Coach → build/). `npm run build:cf` sets
// BASE_PATH='' and BUILD_DIR=build-cf for Cloudflare, at the root. `??`, not
// `||`: an empty BASE_PATH must stay empty.
const BASE_PATH = process.env.BASE_PATH ?? '/Pedro-IA-Coach';
const BUILD_DIR = process.env.BUILD_DIR ?? 'build';
// Each build keeps its own SvelteKit work dir: `vite preview` serves from
// .svelte-kit/output, so a Cloudflare build (e.g. inside the test run) must
// never overwrite it under the running preview.
const OUT_DIR = BUILD_DIR === 'build' ? '.svelte-kit' : `.svelte-kit-${BUILD_DIR}`;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) =>
			filename.split(/[/\\]/).includes('node_modules') ? undefined : true
	},
	kit: {
		adapter: adapter({
			pages: BUILD_DIR,
			assets: BUILD_DIR,
			fallback: 'index.html',
			precompress: false,
			strict: true
		}),
		outDir: OUT_DIR,
		paths: {
			base: BASE_PATH
		}
	}
};

export default config;
