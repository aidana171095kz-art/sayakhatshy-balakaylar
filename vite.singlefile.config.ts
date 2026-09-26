// Бір HTML файлға жинау: барлық JS, CSS, қаріп және суреттер файлдың ішіне енгізіледі.
// Нәтиже интернетсіз, екі рет басу арқылы (file://) ашылады.
import { defineConfig, mergeConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import base from './vite.config';

export default mergeConfig(
  base,
  defineConfig({
    plugins: [viteSingleFile({ removeViteModuleLoader: true })],
    build: {
      outDir: 'dist-single',
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      cssCodeSplit: false,
    },
  }),
);
