import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://calvo-blog.com',
  integrations: [tailwind({ applyBaseStyles: false })],
});
