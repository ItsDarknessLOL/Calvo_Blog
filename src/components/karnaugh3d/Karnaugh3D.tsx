import { Canvas, useThree } from '@react-three/fiber'
import { DragControls, OrbitControls, Text } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Matrix4, MOUSE } from 'three'
import './Karnaugh3D.css'

const variables = ['A', 'B', 'C', 'D', 'E', 'F']
const outputs = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
type CellValue = '0' | '1' | '-'
const gray = (value: number) => value ^ (value >> 1)
const binary = (value: number, width: number) => value.toString(2).padStart(width, '0')
const layoutFor = (count: number) => count === 1 ? { rows: 1, cols: 2, layers: 1 } : count === 2 ? { rows: 2, cols: 2, layers: 1 } : count === 3 ? { rows: 2, cols: 4, layers: 1 } : { rows: 4, cols: 4, layers: 2 ** (count - 4) }

type KarnaughGroup = { mask: number; value: number; minterms: number[] }

const popcount = (value: number) => value.toString(2).split('').filter((bit) => bit === '1').length

function findMinimumGroups(values: CellValue[], count: number): KarnaughGroup[] {
  const total = 2 ** count
  const active = values.slice(0, total).flatMap((value, index) => value === '1' ? [index] : [])
  if (!active.length) return []
  const activeSet = new Set(active)
  const candidates = new Map<string, KarnaughGroup>()
  for (let mask = 0; mask < total; mask += 1) {
    for (let value = 0; value < total; value += 1) {
      const canonicalValue = value & ~mask
      if (value !== canonicalValue) continue
      const minterms = Array.from({ length: total }, (_, index) => index).filter((index) => (index & ~mask) === canonicalValue)
      if (minterms.some((index) => activeSet.has(index)) && minterms.every((index) => values[index] !== '0')) candidates.set(`${mask}:${canonicalValue}`, { mask, value: canonicalValue, minterms })
    }
  }
  const allGroups = [...candidates.values()]
  const primeGroups = allGroups.filter((group) => !allGroups.some((other) => other !== group && group.minterms.every((minterm) => other.minterms.includes(minterm)) && other.minterms.length > group.minterms.length))
  const byMinterm = active.map((minterm) => primeGroups.filter((group) => group.minterms.includes(minterm)))
  let best: KarnaughGroup[] | undefined
  const search = (chosen: KarnaughGroup[], covered: Set<number>) => {
    if (best && chosen.length > best.length) return
    const next = active.find((minterm) => !covered.has(minterm))
    if (next === undefined) {
      const literalCount = chosen.reduce((sum, group) => sum + count - popcount(group.mask), 0)
      const bestLiteralCount = best?.reduce((sum, group) => sum + count - popcount(group.mask), 0) ?? Infinity
      if (!best || chosen.length < best.length || (chosen.length === best.length && literalCount < bestLiteralCount)) best = chosen
      return
    }
    const options = byMinterm[active.indexOf(next)].filter((group) => !chosen.includes(group))
    options.forEach((group) => search([...chosen, group], new Set([...covered, ...group.minterms])))
  }
  search([], new Set())
  return best ?? []
}

function groupTerm(group: KarnaughGroup, count: number) {
  return variables.slice(0, count).flatMap((variable, index) => {
    const bit = 1 << (count - index - 1)
    return group.mask & bit ? [] : [`${variable}${group.value & bit ? '' : '′'}`]
  }).join('·') || '1'
}

function resolveExpression(values: CellValue[], count: number, output: string, groups: KarnaughGroup[]) {
  const total = 2 ** count
  const active = values.slice(0, total).flatMap((value, index) => value === '1' ? [index] : [])
  if (!active.length) return `${output} = 0`
  if (active.length === total) return `${output} = 1`
  return `${output} = ${groups.map((group) => groupTerm(group, count)).join(' + ')}`
}

type BooleanEvaluator = (bits: boolean[]) => boolean
function parseBooleanExpression(source: string): { evaluate?: BooleanEvaluator; error?: string } {
  const tokens = source.toUpperCase().replace(/\s+/g, '').match(/[A-F]|[+·*!~()'′]/g) ?? []
  if (!tokens.length || tokens.join('') !== source.toUpperCase().replace(/\s+/g, '')) return { error: 'Usa variables A–F y los operadores +, ·, ~, *, paréntesis o prima (′).' }
  let cursor = 0
  const startsFactor = () => ['A', 'B', 'C', 'D', 'E', 'F', '~', '!', '('].includes(tokens[cursor] ?? '')
  const expression = (): BooleanEvaluator => {
    let left = product()
    while (tokens[cursor] === '+') { cursor += 1; const right = product(); const previous = left; left = (bits) => previous(bits) || right(bits) }
    return left
  }
  const product = (): BooleanEvaluator => {
    let left = factor()
    while (tokens[cursor] === '·' || tokens[cursor] === '*' || startsFactor()) { if (tokens[cursor] === '·' || tokens[cursor] === '*') cursor += 1; const right = factor(); const previous = left; left = (bits) => previous(bits) && right(bits) }
    return left
  }
  const factor = (): BooleanEvaluator => {
    let inverted = false
    while (tokens[cursor] === '~' || tokens[cursor] === '!') { inverted = !inverted; cursor += 1 }
    let value: BooleanEvaluator
    const token = tokens[cursor]
    if (token === '(') { cursor += 1; value = expression(); if (tokens[cursor] !== ')') throw new Error('Falta un paréntesis de cierre.'); cursor += 1 }
    else if (token && /^[A-F]$/.test(token)) { cursor += 1; const index = variables.indexOf(token); value = (bits) => Boolean(bits[index]) }
    else throw new Error('Se esperaba una variable o paréntesis.')
    while (tokens[cursor] === "'" || tokens[cursor] === '′') { const previous = value; value = (bits) => !previous(bits); cursor += 1 }
    if (inverted) { const previous = value; value = (bits) => !previous(bits) }
    return value
  }
  try { const evaluate = expression(); if (cursor !== tokens.length) return { error: 'La expresión contiene un operador incompleto.' }; return { evaluate } } catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo interpretar la expresión.' } }
}

function cellIndex(row: number, column: number, layer: number, count: number) {
  const { rows, cols } = layoutFor(count)
  const rowBits = Math.log2(rows)
  const columnBits = Math.log2(cols)
  return (gray(layer) << (rowBits + columnBits)) | (gray(row) << columnBits) | gray(column)
}

function CameraMode({ moveLayers }: { moveLayers: boolean }) {
  const { camera, invalidate } = useThree()
  useEffect(() => {
    camera.position.set(moveLayers ? 0 : 7, moveLayers ? 0 : 7, moveLayers ? 14 : 10)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, invalidate, moveLayers])
  return null
}

function MapScene({ count, activeLayer, groupColors, hiddenLayers, layerOffsets, moveLayers, showAllLayers, values, output, onLayer, onLayerMove, onCell }: { count: number; activeLayer: number; groupColors: string[]; hiddenLayers: boolean[]; layerOffsets: [number, number, number][]; moveLayers: boolean; showAllLayers: boolean; values: CellValue[][]; output: number; onLayer: (layer: number) => void; onLayerMove: (layer: number, offset: [number, number, number]) => void; onCell: (index: number) => void }) {
  const { rows, cols, layers } = layoutFor(count)
  const width = cols * 1.05
  const height = rows * 1.05
  const rowBits = Math.log2(rows)
  const columnBits = Math.log2(cols)
  const layerBits = Math.max(0, count - 4)
  const rowVariables = variables.slice(layerBits, layerBits + rowBits).join('') || '—'
  const columnVariables = variables.slice(layerBits + rowBits, layerBits + rowBits + columnBits).join('') || '—'
  return <Canvas camera={{ position: moveLayers ? [0, 0, 14] : [7, 7, 10], fov: 42 }} dpr={[1, 2]}>
    <CameraMode moveLayers={moveLayers} />
    <color attach="background" args={['#0d0e10']} />
    <ambientLight intensity={1.15} />
    <pointLight position={[4, 7, 5]} intensity={65} color="#ffcc00" />
    <pointLight position={[-5, 2, 2]} intensity={28} color="#ffffff" />
    <group rotation={moveLayers ? [0, 0, 0] : [-.38, .15, 0]}>
      {Array.from({ length: layers }, (_, layer) => {
        const z = (layer - (layers - 1) / 2) * 1.05
        const selected = layer === activeLayer
        const hidden = hiddenLayers[layer]
        const opacity = showAllLayers || selected ? 1 : .2
        if (hidden) return null
        const layerContent = <group position={[0, 0, z]} onClick={(event) => { event.stopPropagation(); onLayer(layer) }}>
          <mesh position={[0, 0, -.12]}><boxGeometry args={[width + .55, height + .55, .16]} /><meshStandardMaterial color={selected ? '#29230e' : '#17191d'} transparent opacity={opacity} metalness={.5} roughness={.35} /></mesh>
          {Array.from({ length: cols }, (_, column) => <Text key={`column-${column}`} position={[column * 1.05 - (cols - 1) * .525, height / 2 + .38, .2]} fontSize={.2} fillOpacity={opacity} color="#cbd5e1" anchorX="center" anchorY="middle">{binary(gray(column), columnBits)}</Text>)}
          {Array.from({ length: rows }, (_, row) => <Text key={`row-${row}`} position={[-width / 2 - .38, (rows - 1) * .525 - row * 1.05, .2]} fontSize={.2} fillOpacity={opacity} color="#cbd5e1" anchorX="center" anchorY="middle">{binary(gray(row), rowBits)}</Text>)}
          {Array.from({ length: rows * cols }, (_, cell) => {
            const row = Math.floor(cell / cols)
            const column = cell % cols
            const index = cellIndex(row, column, layer, count)
            const value = values[output][index]
            const enabled = value === '1'
            const dontCare = value === '-'
            return <group key={cell} position={[column * 1.05 - (cols - 1) * .525, (rows - 1) * .525 - row * 1.05, .12]} onClick={(event) => { event.stopPropagation(); onLayer(layer); onCell(index) }}>
              <mesh><boxGeometry args={[.88, .88, enabled || dontCare ? .3 : .16]} /><meshStandardMaterial color={enabled ? groupColors[index] || '#ffcc00' : dontCare ? '#64748b' : '#252a31'} emissive={enabled ? groupColors[index] || '#9a6900' : dontCare ? '#1e3a5f' : '#050505'} emissiveIntensity={enabled ? 1.1 : dontCare ? .7 : .15} transparent opacity={opacity} metalness={.4} roughness={.28} /></mesh>
              <Text position={[0, 0, enabled || dontCare ? .18 : .11]} fontSize={.33} fillOpacity={opacity} color={enabled ? '#131313' : '#e5e7eb'} anchorX="center" anchorY="middle">{value}</Text>
            </group>
          })}
          <Text position={[-width / 2 - .8, height / 2 + .76, .2]} fontSize={.18} fillOpacity={opacity} color={selected ? '#ffcc00' : '#8b95a1'}>{count > 4 ? `CAPA ${binary(gray(layer), layerBits)}` : 'MAPA BASE'}</Text>
          <Text position={[width / 2 + .42, height / 2 + .38, .2]} fontSize={.15} fillOpacity={opacity} color="#8b95a1" anchorX="left" anchorY="middle">{rowVariables}↓ / {columnVariables}→</Text>
        </group>
        const offset = layerOffsets[layer] || [0, 0, 0]
        if (!moveLayers || layer !== activeLayer) return <group key={layer} position={offset}>{layerContent}</group>
        const matrix = new Matrix4().makeTranslation(offset[0], offset[1], offset[2])
        return <DragControls key={layer} autoTransform={false} matrix={matrix} dragLimits={[[-4.8, 4.8], [-3.8, 3.8], [0, 0]]} onDrag={(localMatrix) => onLayerMove(layer, [localMatrix.elements[12], localMatrix.elements[13], 0])}>{layerContent}</DragControls>
      })}
    </group>
    <OrbitControls enableRotate enablePan={false} enableZoom mouseButtons={moveLayers ? { LEFT: null, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE } : { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }} minDistance={7} maxDistance={18} />
  </Canvas>
}

export default function Karnaugh3D() {
  const [outputVariableCounts, setOutputVariableCounts] = useState<number[]>(Array(7).fill(4))
  const [outputCount, setOutputCount] = useState(1)
  const [selectedOutput, setSelectedOutput] = useState(0)
  const [showAllOutputs, setShowAllOutputs] = useState(false)
  const [activeLayer, setActiveLayer] = useState(0)
  const [hiddenLayers, setHiddenLayers] = useState<boolean[]>(Array(4).fill(false))
  const [showAllLayers, setShowAllLayers] = useState(false)
  const [moveLayers, setMoveLayers] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [fullscreenPanel, setFullscreenPanel] = useState(true)
  const [validatorExpressions, setValidatorExpressions] = useState<string[]>(Array(7).fill(''))
  const stageRef = useRef<HTMLDivElement>(null)
  const [layerOffsets, setLayerOffsets] = useState<[number, number, number][]>(Array.from({ length: 4 }, () => [0, 0, 0]))
  const [maps, setMaps] = useState<CellValue[][]>(() => Array.from({ length: 7 }, () => Array<CellValue>(64).fill('0')))
  const [inputs, setInputs] = useState<boolean[]>(Array(6).fill(false))
  const variableCount = outputVariableCounts[selectedOutput]
  const layout = layoutFor(variableCount)
  const minterm = inputs.slice(0, variableCount).reduce((sum, bit, index) => sum | (Number(bit) << (variableCount - index - 1)), 0)
  const selectedMinterms = useMemo(() => maps[selectedOutput].slice(0, 2 ** variableCount).flatMap((value, index) => value === '1' ? [index] : []), [maps, selectedOutput, variableCount])
  const activeSegments = outputs.slice(0, outputCount).filter((_, index) => maps[index][minterm] === '1')
  const groups = useMemo(() => findMinimumGroups(maps[selectedOutput], variableCount), [maps, selectedOutput, variableCount])
  const expression = useMemo(() => resolveExpression(maps[selectedOutput], variableCount, outputs[selectedOutput], groups), [maps, selectedOutput, variableCount, groups])
  const validation = useMemo(() => {
    const parsed = parseBooleanExpression(validatorExpressions[selectedOutput])
    if (!validatorExpressions[selectedOutput].trim() || parsed.error || !parsed.evaluate) return { ...parsed, matches: false, minterms: [] as number[] }
    const minterms = Array.from({ length: 2 ** variableCount }, (_, index) => index).filter((index) => parsed.evaluate!(variables.map((_, bit) => Boolean(index & (1 << (variableCount - bit - 1))))))
    const matches = Array.from({ length: 2 ** variableCount }, (_, index) => index).every((index) => maps[selectedOutput][index] === '-' || parsed.evaluate!(variables.map((_, bit) => Boolean(index & (1 << (variableCount - bit - 1))))) === (maps[selectedOutput][index] === '1'))
    return { matches, minterms }
  }, [maps, selectedOutput, validatorExpressions, variableCount])
  const groupInfo = useMemo(() => {
    const colors = ['#ffcc00', '#60a5fa', '#4ade80', '#f472b6', '#c084fc', '#fb923c']
    const assigned = Array(2 ** variableCount).fill('')
    groups.forEach((group, index) => group.minterms.forEach((minterm) => { if (!assigned[minterm]) assigned[minterm] = colors[index % colors.length] }))
    return { colors: assigned, count: groups.length }
  }, [groups, maps, selectedOutput, variableCount])

  const resetVariables = (count: number) => { setOutputVariableCounts((previous) => previous.map((value, index) => index === selectedOutput ? count : value)); setActiveLayer(0); setHiddenLayers(Array(4).fill(false)); setShowAllLayers(false); setMoveLayers(false); setLayerOffsets(Array.from({ length: 4 }, () => [0, 0, 0])) }
  const selectOutput = (index: number) => { setSelectedOutput(index); setActiveLayer(0); setHiddenLayers(Array(4).fill(false)); setShowAllLayers(false); setMoveLayers(false) }
  const toggleCell = (index: number) => setMaps((previous) => previous.map((map, mapIndex) => mapIndex === selectedOutput ? map.map((value, valueIndex) => valueIndex === index ? value === '0' ? '1' : value === '1' ? '-' : '0' : value) : map))
  const clearMap = () => setMaps((previous) => previous.map((map, mapIndex) => mapIndex === selectedOutput ? map.map((value, index) => index < 2 ** variableCount ? '0' : value) : map))
  const clearAllMaps = () => setMaps((previous) => previous.map((map, mapIndex) => map.map((value, index) => index < 2 ** outputVariableCounts[mapIndex] ? '0' : value)))
  const focusLayer = (layer: number) => { setActiveLayer(layer); setShowAllLayers(false); setHiddenLayers((previous) => previous.map((hidden, index) => index === layer ? false : hidden)) }
  const toggleLayer = (layer: number) => {
    const next = hiddenLayers.map((hidden, index) => index === layer ? !hidden : hidden)
    setHiddenLayers(next)
    if (next[layer] && activeLayer === layer) setActiveLayer(next.findIndex((item) => !item))
    setShowAllLayers(false)
  }
  const restoreAllLayers = () => { setHiddenLayers(Array(4).fill(false)); setShowAllLayers(true) }
  const moveLayer = (layer: number, offset: [number, number, number]) => setLayerOffsets((previous) => previous.map((item, index) => index === layer ? offset : item))
  const resetLayerPositions = () => setLayerOffsets(Array.from({ length: 4 }, () => [0, 0, 0]))
  const toggleOutputCell = (output: number, index: number) => setMaps((previous) => previous.map((map, mapIndex) => mapIndex === output ? map.map((value, valueIndex) => valueIndex === index ? value === '0' ? '1' : value === '1' ? '-' : '0' : value) : map))
  const applyValidatorExpression = () => {
    if (!validation.minterms.length && !validatorExpressions[selectedOutput].trim()) return
    if (validation.error) return
    const active = new Set(validation.minterms)
    setMaps((previous) => previous.map((map, mapIndex) => mapIndex === selectedOutput ? map.map((_, index) => index < 2 ** variableCount ? active.has(index) ? '1' : '0' : map[index]) : map))
  }
  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await stageRef.current?.requestFullscreen()
  }
  useEffect(() => {
    const syncFullscreen = () => setFullscreen(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  return <section className="kmap-lab" aria-labelledby="kmap-lab-title">
    <div className="kmap-lab__intro">
      <div><p className="kmap-kicker">Laboratorio interactivo</p><h1 id="kmap-lab-title">Taller 3D de Karnaugh</h1><p>Construye mapas de una a seis variables, recorre las capas y comprueba el resultado en un circuito virtual.</p></div>
      <div className="kmap-lab__legend"><span><i className="legend-on" /> Minterm activo (1)</span><span><i className="legend-off" /> Minterm inactivo (0)</span><span><i className="legend-dont-care" /> No importa (−)</span><span><i className="legend-groups" /> Colores por grupo</span></div>
    </div>
    <div className="kmap-lab__grid">
      <aside className="kmap-panel" aria-label="Configuración del mapa">
        <div className="kmap-panel__heading"><strong>Configuración</strong><span>Paso 1</span></div>
        <label>Variables <small>Selecciona de A a F.</small></label>
        <div className="kmap-choice-grid">{[1, 2, 3, 4, 5, 6].map((count) => <button key={count} className={variableCount === count ? 'is-selected' : ''} onClick={() => resetVariables(count)}><b>{count}</b><span>{variables.slice(0, count).join(' ')}</span></button>)}</div>
        <label>Salidas <small>Cada salida guarda variables y mapa propios.</small></label>
        <div className="kmap-choice-grid">{[1, 2, 3, 4, 5, 6, 7].map((count) => <button key={count} className={outputCount === count ? 'is-selected' : ''} onClick={() => { setOutputCount(count); setSelectedOutput(Math.min(selectedOutput, count - 1)) }}><b>{count}</b><span>{outputs.slice(0, count).join(' ')}</span></button>)}</div>
        <button className={`kmap-show-all-outputs ${showAllOutputs ? 'is-active' : ''}`} onClick={() => setShowAllOutputs((visible) => !visible)} aria-pressed={showAllOutputs}>
          {showAllOutputs ? 'Ver una salida' : 'Ver todas las salidas'}
        </button>
        <div className="kmap-summary"><span>Salida {outputs[selectedOutput]} · mapa actual</span><strong>{layout.layers} {layout.layers === 1 ? 'tabla' : 'capas'} · {layout.rows} × {layout.cols}</strong><p>{variables.slice(0, variableCount).join(', ')} · configuración independiente</p></div>
        <div className="kmap-clear-actions"><button className="kmap-clear" onClick={clearMap}>Limpiar salida {outputs[selectedOutput]}</button><button className="kmap-clear kmap-clear-all" onClick={clearAllMaps}>Limpiar todas las salidas</button></div>
      </aside>
      <div className="kmap-workspace" ref={stageRef}>
        <div className="kmap-workspace__header"><div><p className="kmap-kicker">Mapa activo</p><h2>{variableCount} variables <span>·</span> {layout.layers} {layout.layers === 1 ? 'capa' : 'capas'}</h2><button className="kmap-fullscreen" onClick={toggleFullscreen}>{fullscreen ? '⤢ Salir de pantalla completa' : '⛶ Pantalla completa'}</button>{fullscreen && <button className="kmap-fullscreen-panel-toggle" onClick={() => setFullscreenPanel((open) => !open)}>{fullscreenPanel ? '× Ocultar panel' : '☰ Panel'}</button>}</div>{variableCount > 4 && <div className="kmap-layer-controls"><button className={`kmap-show-all ${showAllLayers ? 'is-active' : ''}`} onClick={restoreAllLayers}>Ver todas</button><button className={`kmap-move-mode ${moveLayers ? 'is-active' : ''}`} onClick={() => setMoveLayers((enabled) => !enabled)}>{moveLayers ? 'Terminar movimiento' : 'Mover capas'}</button><div className="kmap-layers" aria-label="Controles de capas">{Array.from({ length: layout.layers }, (_, index) => <div key={index} className={index === activeLayer && !showAllLayers ? 'is-active' : ''}><button onClick={() => focusLayer(index)} aria-pressed={index === activeLayer && !showAllLayers}>Capa {index + 1}<small>{binary(gray(index), variableCount - 4)}</small></button><button className="kmap-visibility" onClick={() => toggleLayer(index)} aria-label={`${hiddenLayers[index] ? 'Mostrar' : 'Ocultar'} capa ${index + 1}`} title={hiddenLayers[index] ? 'Mostrar capa' : 'Ocultar capa'}>{hiddenLayers[index] ? 'Mostrar' : 'Ocultar'}</button></div>)}</div></div>}</div>
        <aside className={`kmap-fullscreen-panel ${fullscreenPanel ? 'is-open' : ''}`} aria-label="Panel de controles en pantalla completa">
          <details open><summary>Configuración <span>⌄</span></summary><div className="kmap-fullscreen-section"><label>Variables</label><div className="kmap-choice-grid">{[1, 2, 3, 4, 5, 6].map((count) => <button key={count} className={variableCount === count ? 'is-selected' : ''} onClick={() => resetVariables(count)}><b>{count}</b><span>{variables.slice(0, count).join(' ')}</span></button>)}</div><label>Salidas</label><div className="kmap-choice-grid">{[1, 2, 3, 4, 5, 6, 7].map((count) => <button key={count} className={outputCount === count ? 'is-selected' : ''} onClick={() => { setOutputCount(count); setSelectedOutput(Math.min(selectedOutput, count - 1)) }}><b>{count}</b><span>{outputs.slice(0, count).join(' ')}</span></button>)}</div><button className={`kmap-show-all-outputs ${showAllOutputs ? 'is-active' : ''}`} onClick={() => setShowAllOutputs((visible) => !visible)} aria-pressed={showAllOutputs}>{showAllOutputs ? 'Ver una salida' : 'Ver todas las salidas'}</button><div className="kmap-clear-actions"><button className="kmap-clear" onClick={clearMap}>Limpiar salida {outputs[selectedOutput]}</button><button className="kmap-clear kmap-clear-all" onClick={clearAllMaps}>Limpiar todas las salidas</button></div></div></details>
          <details><summary>Capas y vista <span>⌄</span></summary><div className="kmap-fullscreen-section"><button className={`kmap-show-all ${showAllLayers ? 'is-active' : ''}`} onClick={restoreAllLayers}>Ver todas las capas</button>{variableCount > 4 && <><button className={`kmap-move-mode ${moveLayers ? 'is-active' : ''}`} onClick={() => setMoveLayers((enabled) => !enabled)}>{moveLayers ? 'Terminar movimiento' : 'Mover capas'}</button><div className="kmap-fullscreen-layers">{Array.from({ length: layout.layers }, (_, index) => <div key={index}><button className={index === activeLayer && !showAllLayers ? 'is-active' : ''} onClick={() => focusLayer(index)}>Capa {index + 1} · {binary(gray(index), variableCount - 4)}</button><button onClick={() => toggleLayer(index)}>{hiddenLayers[index] ? 'Mostrar' : 'Ocultar'}</button></div>)}</div></>}</div></details>
          <details><summary>Comprobador de circuito <span>⌄</span></summary><div className="kmap-fullscreen-section"><p className="kmap-fs-expression">{expression}</p><div className="kmap-inputs">{variables.slice(0, variableCount).map((variable, index) => <button key={variable} className={inputs[index] ? 'is-on' : ''} onClick={() => setInputs((previous) => previous.map((value, inputIndex) => inputIndex === index ? !value : value))}><small>{variable}</small><b>{inputs[index] ? '1' : '0'}</b></button>)}</div><p className="kmap-minterm">m{minterm} · {binary(minterm, variableCount)}</p><div className="kmap-fs-devices"><div className={`kmap-led ${maps[selectedOutput][minterm] === '1' ? 'is-on' : ''}`}><i /><span>LED {outputs[selectedOutput]}</span></div><div className="kmap-display"><div>{['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((segment) => <i key={segment} className={`${segment} ${activeSegments.includes(segment) ? 'is-on' : ''}`} />)}</div><p>{activeSegments.length ? activeSegments.join(', ') : '—'}</p></div></div></div></details>
        </aside>
        {variableCount > 4 && <p className="kmap-layer-status" aria-live="polite">{moveLayers ? <>Vista XY: arrastra libremente solo la capa seleccionada (<strong>capa {activeLayer + 1}</strong>). La rueda ajusta el zoom. <button onClick={resetLayerPositions}>Restablecer posiciones</button></> : showAllLayers ? <>Vista completa: <strong>todas las capas visibles y sin transparencia.</strong></> : <>Capa enfocada: <strong>{activeLayer + 1}</strong>. Las demás capas permanecen visibles con transparencia; usa “Ocultar” para quitarlas completamente.</>}</p>}
        {showAllOutputs ? <div className="kmap-output-maps" aria-label="Mapas de todas las salidas">{outputs.slice(0, outputCount).map((output, index) => { const outputLayout = layoutFor(outputVariableCounts[index]); return <article className="kmap-output-map" key={output}><header><strong>Salida {output}</strong><span>{outputVariableCounts[index]} variables · {outputLayout.layers} {outputLayout.layers === 1 ? 'capa' : 'capas'}</span></header><div className="kmap-scene" onContextMenu={(event) => event.preventDefault()}><MapScene count={outputVariableCounts[index]} activeLayer={activeLayer} groupColors={index === selectedOutput ? groupInfo.colors : []} hiddenLayers={hiddenLayers} layerOffsets={layerOffsets} moveLayers={false} showAllLayers={showAllLayers} values={maps} output={index} onLayer={showAllLayers ? () => undefined : (layer) => { selectOutput(index); focusLayer(layer) }} onLayerMove={moveLayer} onCell={moveLayers ? () => undefined : (cell) => toggleOutputCell(index, cell)} /><span className="kmap-desktop-help">Clic en una celda para alternar 0 → 1 → −</span></div><button className="kmap-output-select" onClick={() => { selectOutput(index); setShowAllOutputs(false) }}>{index === selectedOutput ? 'Salida activa' : `Editar salida ${output}`}</button></article> })}</div> : <div className={`kmap-scene ${moveLayers ? 'is-organizing' : ''}`} onContextMenu={(event) => event.preventDefault()}><MapScene count={variableCount} activeLayer={activeLayer} groupColors={groupInfo.colors} hiddenLayers={hiddenLayers} layerOffsets={layerOffsets} moveLayers={moveLayers} showAllLayers={showAllLayers} values={maps} output={selectedOutput} onLayer={showAllLayers ? () => undefined : focusLayer} onLayerMove={moveLayer} onCell={moveLayers ? () => undefined : toggleCell} /><span className="kmap-desktop-help">{moveLayers ? `Clic en otra capa para seleccionarla · arrastra la capa ${activeLayer + 1} en XY · rueda para zoom · botón derecho para rotar` : showAllLayers ? 'Vista completa bloqueada: usa los controles de capas para enfocar una tabla' : 'Explorar: clic breve para alternar 0 → 1 → − · arrastra para rotar · rueda para zoom'}</span><span className="kmap-mobile-help">{moveLayers ? `Toca otra capa para seleccionarla · desliza libremente la capa ${activeLayer + 1}` : 'Teléfono: toca una celda para alternar 0 → 1 → −'}</span></div>}
        <div className="kmap-adjacency"><strong>Adyacencia en Gray.</strong> Las filas y columnas se leen en orden <code>00 → 01 → 11 → 10</code>, por eso dos celdas vecinas cambian solo un bit. El primer y último borde también son vecinos; en 5–6 variables, la misma posición de capas Gray vecinas también es adyacente. El contador muestra los implicantes de una cobertura mínima; no confunde una cadena de celdas conectadas con un único grupo.</div>
        <div className="kmap-workspace__footer"><span>Salida que editas</span><div>{outputs.slice(0, outputCount).map((output, index) => <button key={output} className={index === selectedOutput ? 'is-active' : ''} onClick={() => selectOutput(index)}>{output}</button>)}</div><span className="kmap-group-count">{groupInfo.count} {groupInfo.count === 1 ? 'implicante mínimo' : 'implicantes mínimos'}</span><code>{expression}</code></div>
      </div>
    </div>
    <section className="kmap-tester" aria-labelledby="circuit-title"><div><p className="kmap-kicker">Comprobador de circuito</p><h2 id="circuit-title">Prueba una combinación</h2><p>Activa las entradas. El LED y el display consultan el minterm actual en las salidas que definiste.</p><div className="kmap-inputs">{variables.slice(0, variableCount).map((variable, index) => <button key={variable} className={inputs[index] ? 'is-on' : ''} onClick={() => setInputs((previous) => previous.map((value, inputIndex) => inputIndex === index ? !value : value))}><small>{variable}</small><b>{inputs[index] ? '1' : '0'}</b></button>)}</div><p className="kmap-minterm">Minterm actual: <strong>m{minterm}</strong> · {binary(minterm, variableCount)}</p><div className="kmap-validator"><label htmlFor="boolean-validator">Validador de expresión para salida {outputs[selectedOutput]}</label><div><input id="boolean-validator" value={validatorExpressions[selectedOutput]} onChange={(event) => setValidatorExpressions((previous) => previous.map((value, index) => index === selectedOutput ? event.target.value : value))} placeholder="Ej. A·~B + C′·D" /><button onClick={applyValidatorExpression} disabled={Boolean(validation.error) || !validatorExpressions[selectedOutput].trim()}>Cargar al mapa</button></div><p className={validation.error ? 'is-error' : validation.matches ? 'is-valid' : ''}>{validation.error ? validation.error : validatorExpressions[selectedOutput].trim() ? validation.matches ? '✓ La expresión coincide con el mapa actual.' : `Minterms: ${validation.minterms.join(', ') || 'ninguno'} · no coincide aún con el mapa.` : 'Admite ~ o ′ para negar, · o * para AND, + para OR y paréntesis. Los valores − no se validan.'}</p></div></div><div className="kmap-devices"><div className={`kmap-led ${maps[selectedOutput][minterm] === '1' ? 'is-on' : ''}`}><i /><span>LED · salida {outputs[selectedOutput]}</span><b>{maps[selectedOutput][minterm] === '1' ? 'Encendido' : 'Apagado'}</b></div><div className="kmap-display"><div>{['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((segment) => <i key={segment} className={`${segment} ${activeSegments.includes(segment) ? 'is-on' : ''}`} />)}</div><p>{activeSegments.length ? `Segmentos activos: ${activeSegments.join(', ')}` : 'Sin segmentos activos'}</p></div></div></section>
  </section>
}
