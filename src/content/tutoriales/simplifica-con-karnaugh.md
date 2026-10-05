---
title: "Simplifica circuitos con mapas de Karnaugh"
description: "Una práctica guiada para reducir expresiones booleanas y ahorrar compuertas."
pubDate: 2026-10-04
category: "Tutorial"
tags: ["Lógica digital", "Karnaugh", "Práctica"]
heroImage: "/images/posts/boolean.svg"
heroImageAlt: "Mapa y compuertas lógicas abstractas"
interactive:
  type: "worksheet"
  label: "Completar una tabla de agrupaciones"
  href: "/laboratorio/tabla-verdad"
---

Los mapas de Karnaugh permiten ver agrupaciones de unos que luego se convierten en una expresión más corta. Empieza con dos variables: cada celda representa una fila de la tabla de verdad.

## Método rápido

1. Escribe un `1` donde la salida deba activarse.
2. Agrupa unos contiguos en bloques de 1, 2 o 4.
3. Conserva solo las variables que no cambian dentro de cada grupo.

## Práctica

Construye primero la expresión completa y simplifícala después. En Logisim, compara cuántas compuertas necesita cada versión. Así la simplificación deja de ser una regla abstracta y se vuelve una mejora visible.
