---
title: "Mapas de Karnaugh: guía completa para simplificar circuitos"
description: "Aprende qué son los mapas de Karnaugh, cómo agrupar minterms y cómo comprobar tus resultados en un taller 3D."
pubDate: 2026-10-04
category: "Tutorial"
tags: ["Lógica digital", "Karnaugh", "Práctica"]
heroImage: "/images/posts/boolean.svg"
heroImageAlt: "Mapa y compuertas lógicas abstractas"
interactive:
  type: "simulator"
  label: "Abrir el taller 3D de Karnaugh"
  href: "/laboratorio/karnaugh"
---

# ¿Qué es un mapa de Karnaugh?

Un mapa de Karnaugh (o **K-map**) es una representación ordenada de una tabla de verdad. Cada celda representa un **minterm**, es decir, una combinación única de entradas. Al colocar los `1` de una función en el mapa podemos detectar grupos de celdas adyacentes y convertirlos en una expresión booleana más corta.

La ventaja principal es práctica: menos términos normalmente significa menos compuertas, menos conexiones y un circuito más fácil de mantener.

> **Espacio para imagen:** diagrama que relacione una tabla de verdad con su mapa de Karnaugh.

## Conceptos esenciales

- **Variable:** entrada booleana que solo puede valer `0` o `1`, como `A`, `B` o `C`.
- **Minterm:** fila de la tabla de verdad expresada como un producto de variables. Por ejemplo, `A · ¬B · C`.
- **Maxterm:** forma dual basada en sumas; se usa cuando resulta más cómodo agrupar ceros.
- **Suma de productos (SOP):** expresión formada por términos AND unidos con OR. Se obtiene agrupando `1`.
- **Producto de sumas (POS):** expresión formada por términos OR unidos con AND. Se obtiene agrupando `0`.
- **Don't care (`X`):** combinación cuyo resultado no importa. Puede usarse como `1` si ayuda a formar un grupo mayor.
- **Adyacencia:** dos celdas son adyacentes si solo cambia una variable. El orden de filas y columnas es Gray, no binario normal.

## ¿Cuántas celdas tiene?

Con `n` variables hay `2ⁿ` combinaciones. La distribución estándar mantiene el mapa legible:

| Variables | Celdas | Organización recomendada |
| --- | ---: | --- |
| 1 | 2 | Una fila de 2 |
| 2 | 4 | Cuadrícula 2 × 2 |
| 3 | 8 | Cuadrícula 2 × 4 |
| 4 | 16 | Cuadrícula 4 × 4 |
| 5 | 32 | 2 capas de 4 × 4 |
| 6 | 64 | 4 capas de 4 × 4 |

En el taller las capas se separan en el espacio para hacer visible que sus bordes también pueden ser adyacentes. Por ejemplo, en un mapa de cinco variables, una capa puede corresponder a `E=0` y la otra a `E=1`.

> **Espacio para imagen:** mapa de cuatro variables con etiquetas en código Gray `00, 01, 11, 10`.

## Método paso a paso

1. **Define las entradas y la salida.** Escribe la función, la tabla de verdad o la lista de minterms.
2. **Elige SOP o POS.** Agrupa `1` para obtener suma de productos o `0` para producto de sumas.
3. **Traslada los valores al mapa.** Usa el orden Gray en ambos ejes.
4. **Forma grupos rectangulares.** El tamaño debe ser una potencia de dos: `1, 2, 4, 8...`.
5. **Haz los grupos tan grandes como sea posible.** Se permite envolver los bordes y reutilizar una celda en más de un grupo si eso elimina variables.
6. **Escribe el término de cada grupo.** Conserva únicamente las variables que no cambian dentro del grupo.
7. **Une los términos y verifica.** Comprueba la expresión simplificada contra la tabla de verdad original.

### Reglas que suelen causar errores

- Las esquinas pueden ser adyacentes entre sí: el mapa se comporta como un cilindro o un toroide.
- Un grupo no puede ser diagonal ni tener forma de `L`.
- No es obligatorio agrupar todos los `1` en un único grupo.
- Un grupo de ocho elimina más variables que uno de cuatro; busca siempre la cobertura mínima.
- Para seis variables, dos celdas en la misma posición de capas vecinas también pueden ser adyacentes.

> **Espacio para imagen:** ejemplo anotado con un grupo que envuelve las cuatro esquinas.

## Ejemplo rápido

Considera `F(A,B,C) = Σm(1, 3, 5, 7)`. Los cuatro minterms tienen `C=1` y cubren todas las combinaciones de `A` y `B`. Por tanto, el grupo de cuatro elimina `A` y `B`, y queda:

```text
F = C
```

La comprobación es directa: cada vez que `C=1`, la salida vale `1`, sin importar las otras entradas.

## Del mapa al circuito

Una expresión SOP se implementa con compuertas NOT para las variables negadas, AND para cada término y una OR final. En un circuito real conviene comparar:

1. cantidad de compuertas;
2. número de entradas de cada compuerta;
3. niveles de propagación;
4. comportamiento para combinaciones no utilizadas.

El resultado también puede alimentar un LED (salida binaria) o un display de siete segmentos (varias salidas coordinadas). Usa el taller para cambiar celdas, observar cada capa y probar una visualización.

## Taller interactivo

Abre el [taller 3D de mapas de Karnaugh](/laboratorio/karnaugh) para elegir de una a seis variables, configurar de una a seis salidas y activar celdas por capa. El LED muestra la salida seleccionada y el display de siete segmentos representa las seis salidas como segmentos `a`–`f`.
