type Dict = Record<string, any>

type ZagBindableParams<Value> = {
  defaultValue?: Value
  hash?: (value: Value) => string
  isEqual?: (value: Value | undefined, previous: Value | undefined) => boolean
  sync?: boolean
  value?: Value
  onChange?: (value: Value, previous: Value | undefined) => void
}

type ZagActionList = string | string[] | ((params: Dict) => string[] | undefined)
type ZagEffectList = string | string[] | ((params: Dict) => string[] | undefined)

type ZagMachineTransition = {
  actions?: string | string[]
  guard?: string | ((params: Dict) => boolean)
  target?: string
}

type ZagMachineState = {
  entry?: ZagActionList
  exit?: ZagActionList
  effects?: ZagEffectList
  initial?: string
  states?: Record<string, ZagMachineState>
  tags?: string[]
  on?: Record<string, ZagMachineTransition | ZagMachineTransition[]>
}

type ZagMachine = {
  context?: (params: Dict) => Dict
  computed?: Record<string, (params: Dict) => unknown>
  entry?: ZagActionList
  exit?: ZagActionList
  effects?: ZagEffectList
  implementations?: {
    actions?: Record<string, (params: Dict) => void>
    effects?: Record<string, (params: Dict) => void | VoidFunction>
    guards?: Record<string, (params: Dict) => boolean>
  }
  initialState: (params: Dict) => string
  on?: Record<string, ZagMachineTransition | ZagMachineTransition[]>
  props?: (params: Dict) => Dict
  refs?: (params: Dict) => Dict
  states: Record<string, ZagMachineState>
  watch?: (params: Dict) => void
}

type ZagServiceOptions = {
  machine: ZagMachine
  props?: Dict
  scope?: Partial<Dict>
}

type ZagEvent = Dict & {
  type: string
}

const toArray = <Value>(value: Value | Value[] | undefined): Value[] => {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function resolveList(value: ZagActionList | ZagEffectList | undefined, params: () => Dict) {
  if (typeof value === "function") return toArray(value(params()))
  return toArray(value)
}

function createBindable<Value>({
  defaultValue,
  hash,
  isEqual,
  onChange,
  value,
}: ZagBindableParams<Value>) {
  let current = value ?? defaultValue
  return {
    initial: current,
    ref: undefined,
    get: () => current,
    set(next: Value | ((previous: Value | undefined) => Value)) {
      const previous = current
      current = typeof next === "function" ? (next as (previous: Value | undefined) => Value)(current) : next
      const equal = isEqual?.(current, previous) ?? Object.is(current, previous)
      if (!equal) {
        onChange?.(current as Value, previous)
      }
    },
    invoke(next: Value, previous: Value | undefined) {
      onChange?.(next, previous)
    },
    hash(next: Value) {
      return hash?.(next) ?? JSON.stringify(next)
    },
  }
}

function matchesState(current: string, value: string) {
  return current === value || current.startsWith(`${value}.`)
}

function statePathNames(stateName: string) {
  const segments = stateName.split(".")
  return segments.map((_, index) => segments.slice(0, index + 1).join("."))
}

export function createZagService({
  machine,
  props: inputProps = {},
  scope: inputScope = {},
}: ZagServiceOptions) {
  const props = machine.props?.({ props: inputProps, scope: inputScope }) ?? inputProps
  const prop = (key: string) => props[key]
  const cleanupCallbacks: VoidFunction[] = []
  const rootEffectCleanups = new Map<string, VoidFunction>()
  const stateEffectCleanups = new Map<string, VoidFunction>()
  const trackers: {
    callback: VoidFunction
    reads: (() => unknown)[]
    values: unknown[]
  }[] = []
  let currentEvent: ZagEvent = { type: "" }
  let previousEvent: ZagEvent = { type: "" }
  let started = true

  const bindable = Object.assign(
    <Value>(factory: () => ZagBindableParams<Value>) => createBindable(factory()),
    {
      cleanup: (callback: VoidFunction) => {
        cleanupCallbacks.push(callback)
      },
      ref: <Value>(defaultValue: Value) => {
        let current = defaultValue
        return {
          get: () => current,
          set: (next: Value) => {
            current = next
          },
        }
      },
    }
  )

  const contextEntries = machine.context?.({
    bindable,
    flush: (callback: VoidFunction) => callback(),
    getComputed: () => computed,
    getContext: () => context,
    getEvent: () => currentEvent,
    getRefs: () => refs,
    prop,
    scope: inputScope,
  }) ?? {}
  const context = {
    get: (key: string) => contextEntries[key]?.get(),
    hash: (key: string) => contextEntries[key]?.hash(contextEntries[key]?.get()),
    initial: (key: string) => contextEntries[key]?.initial,
    set: (key: string, next: unknown) => {
      contextEntries[key]?.set(next)
    },
  }
  const computed = (key: string) => machine.computed?.[key]?.(params())
  const refsEntries = machine.refs?.({ context, prop }) ?? {}
  const refs = {
    get: (key: string) => refsEntries[key],
    set: (key: string, next: unknown) => {
      refsEntries[key] = next
    },
  }
  function getStateNode(stateName: string): ZagMachineState | undefined {
    const segments = stateName.split(".")
    const rootName = segments[0]
    if (rootName == null) return undefined
    let node = machine.states[rootName]
    for (const segment of segments.slice(1)) {
      node = node?.states?.[segment]
    }
    return node
  }

  function resolveInitialState(stateName: string) {
    let resolved = stateName
    let node = getStateNode(resolved)
    while (node?.initial) {
      resolved = `${resolved}.${node.initial}`
      node = getStateNode(resolved)
    }
    return resolved
  }

  function activeStateNodes(stateName: string) {
    return statePathNames(stateName)
      .map((name) => [name, getStateNode(name)] as const)
      .filter((entry): entry is readonly [string, ZagMachineState] => entry[1] != null)
  }

  function resolveTarget(target: string, sourceState: string) {
    if (target.includes(".")) return resolveInitialState(target)

    const sourceSegments = sourceState.split(".")
    for (let index = sourceSegments.length - 1; index >= 0; index -= 1) {
      const parent = sourceSegments.slice(0, index).join(".")
      const parentNode = parent ? getStateNode(parent) : undefined
      if (parentNode?.states?.[target]) {
        return resolveInitialState(`${parent}.${target}`)
      }
    }

    return resolveInitialState(target)
  }

  let currentState = resolveInitialState(machine.initialState({ prop }))
  const state = {
    get: () => currentState,
    hasTag: (tag: string) =>
      activeStateNodes(currentState).some(([, node]) => node.tags?.includes(tag)),
    hash: () => currentState,
    initial: currentState,
    invoke: () => undefined,
    matches: (...values: string[]) => values.some((value) => matchesState(currentState, value)),
    ref: undefined,
    set: (next: string) => {
      currentState = next
    },
  }
  const scope = {
    getActiveElement: () => null,
    getById: () => null,
    getDoc: () => globalThis.document,
    getRootNode: () => globalThis.document,
    getWin: () => globalThis.window,
    id: props.id,
    isActiveElement: () => false,
    ...inputScope,
  }

  function params(): Dict {
    return {
      action: runActions,
      choose: chooseTransition,
      computed,
      context,
      event: Object.assign({}, currentEvent, {
        current: () => currentEvent,
        previous: () => previousEvent,
      }),
      flush: (callback: VoidFunction) => callback(),
      guard,
      prop,
      refs,
      scope,
      send,
      state,
      track: (reads: (() => unknown)[], callback: VoidFunction) => {
        trackers.push({
          callback,
          reads,
          values: reads.map((read) => read()),
        })
      },
    }
  }

  function guard(guardDefinition: string | ((params: Dict) => boolean)) {
    if (typeof guardDefinition === "function") return guardDefinition(params())
    return machine.implementations?.guards?.[guardDefinition]?.(params()) ?? false
  }

  function chooseTransition(
    transitions: ZagMachineTransition | ZagMachineTransition[] | null | undefined
  ) {
    return toArray(transitions).find((transition) => {
      if (transition == null) return false
      if (!transition.guard) return true
      return guard(transition.guard)
    })
  }

  function runActions(actions: string | string[] | undefined) {
    for (const actionName of toArray(actions)) {
      machine.implementations?.actions?.[actionName]?.(params())
    }
  }

  function runActionList(actions: ZagActionList | undefined) {
    runActions(resolveList(actions, params))
  }

  function startRootEffects() {
    for (const effectName of resolveList(machine.effects, params)) {
      if (rootEffectCleanups.has(effectName)) continue
      const cleanup = machine.implementations?.effects?.[effectName]?.(params())
      if (typeof cleanup === "function") rootEffectCleanups.set(effectName, cleanup)
    }
  }

  function startStateEffects(stateName: string) {
    for (const [activeName, node] of activeStateNodes(stateName)) {
      for (const effectName of resolveList(node.effects, params)) {
        const key = `${activeName}:${effectName}`
        if (stateEffectCleanups.has(key)) continue
        const cleanup = machine.implementations?.effects?.[effectName]?.(params())
        if (typeof cleanup === "function") stateEffectCleanups.set(key, cleanup)
      }
    }
  }

  function stopRootEffects() {
    for (const cleanup of rootEffectCleanups.values()) cleanup()
    rootEffectCleanups.clear()
  }

  function stopStateEffects() {
    for (const cleanup of stateEffectCleanups.values()) cleanup()
    stateEffectCleanups.clear()
  }

  function syncTrackers() {
    for (const tracker of trackers) {
      const nextValues = tracker.reads.map((read) => read())
      const changed = nextValues.some((value, index) => !Object.is(value, tracker.values[index]))
      if (!changed) continue
      tracker.values = nextValues
      tracker.callback()
    }
  }

  function findTransition(eventType: string) {
    for (const [, node] of activeStateNodes(currentState).reverse()) {
      const stateTransition = chooseTransition(node.on?.[eventType])
      if (stateTransition) return stateTransition
    }
    return chooseTransition(machine.on?.[eventType])
  }

  function runStateEntry(stateName: string) {
    for (const [, node] of activeStateNodes(stateName)) runActionList(node.entry)
  }

  function runStateExit(stateName: string) {
    for (const [, node] of activeStateNodes(stateName).reverse()) {
      runActionList(node.exit)
    }
  }

  function send(event: ZagEvent) {
    if (!started) return
    previousEvent = currentEvent
    currentEvent = event
    const selectedTransition = findTransition(event.type)
    if (!selectedTransition) return
    const targetState = selectedTransition.target
      ? resolveTarget(selectedTransition.target, currentState)
      : undefined
    if (targetState && targetState !== currentState) {
      runStateExit(currentState)
      stopStateEffects()
      currentState = targetState
      runStateEntry(currentState)
      startStateEffects(currentState)
    }
    runActions(selectedTransition.actions)
    syncTrackers()
  }

  runActionList(machine.entry)
  runStateEntry(currentState)
  startRootEffects()
  startStateEffects(currentState)
  machine.watch?.(params())

  return {
    computed,
    context,
    event: Object.assign(currentEvent, {
      current: () => currentEvent,
      previous: () => previousEvent,
    }),
    getStatus: () => (started ? "Started" : "Stopped"),
    prop,
    refs,
    scope,
    send,
    state,
    stop: () => {
      if (!started) return
      started = false
      runStateExit(currentState)
      runActionList(machine.exit)
      stopStateEffects()
      stopRootEffects()
      for (const cleanup of cleanupCallbacks) cleanup()
    },
  }
}
