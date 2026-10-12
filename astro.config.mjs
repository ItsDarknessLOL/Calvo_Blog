import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://bycalvo.live',
  trailingSlash: 'always',
  integrations: [react(), tailwind({ applyBaseStyles: false })],
});
