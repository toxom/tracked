import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import preprocess from 'svelte-preprocess';
import { mdsvex } from 'mdsvex';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Combine all preprocessors
	preprocess: [
		vitePreprocess(),
		preprocess({
			scss: {
				// Option to pass to sass compiler
				prependData: '@import "src/styles/themes.scss";'
			}
		}),
		mdsvex()
	],
	kit: {
		// Set up aliases for cleaner imports
		alias: {
			'types': 'src/lib/types',
			'clients': 'src/lib/clients',
			'stores': 'src/lib/stores',
			'utils': 'src/lib/utils',
			'components': 'src/lib/components'
		},
		// adapter-auto supports various environments
		adapter: adapter()
	},
	// Support both .svelte and .svx file extensions
	extensions: ['.svelte', '.svx']
};

export default config;