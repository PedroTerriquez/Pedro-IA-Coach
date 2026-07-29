import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const buildTime = new Date().toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		__BUILD_TIME__: JSON.stringify(buildTime)
	}
});
