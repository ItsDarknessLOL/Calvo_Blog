import { defineCollection, z } from 'astro:content';

const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.date(),
  category: z.enum(['Tutorial', 'Guía', 'Noticia', 'Artículo']),
  tags: z.array(z.string()).default([]),
  heroImage: z.string().optional(),
  heroImageAlt: z.string().optional(),
  featured: z.boolean().default(false),
  sourceUrl: z.string().url().optional(),
  sourceLabel: z.string().default('Ver fuente'),
  navbarAction: z.object({
    label: z.string(),
    href: z.string().url(),
  }).optional(),
  interactive: z.object({
    type: z.enum(['game', 'simulator', 'challenge', 'worksheet']),
    label: z.string(),
    href: z.string(),
  }).optional(),
});

export const collections = {
  tutoriales: defineCollection({ type: 'content', schema: blogSchema }),
  guias: defineCollection({ type: 'content', schema: blogSchema }),
  noticias: defineCollection({ type: 'content', schema: blogSchema }),
  articulos: defineCollection({ type: 'content', schema: blogSchema }),
};
