export const sections = {
  tutoriales: { label: 'Tutoriales', singular: 'Tutorial', description: 'Conceptos prácticos para dominar la lógica y el desarrollo.' },
  guias: { label: 'Guías', singular: 'Guía', description: 'Rutas claras, paso a paso, para construir con confianza.' },
  noticias: { label: 'Noticias', singular: 'Noticia', description: 'Novedades relevantes del mundo del hardware y software.' },
  articulos: { label: 'Artículos', singular: 'Artículo', description: 'Ideas, análisis y recursos para seguir aprendiendo.' },
} as const;

export type SectionSlug = keyof typeof sections;
export const sectionSlugs = Object.keys(sections) as SectionSlug[];
