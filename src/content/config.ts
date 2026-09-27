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
  interactive: z.object({
    type: z.enum(['3d', 'game']),
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
