type Dict = Record<string, any>

type ZagBindableParams<Value> = {
  defaultValue?: Value
  value?: Value
  onChange?: (value: Value, previous: Value | undefined) => void
}

type ZagMachineTransition = {
  actions?: string | string[]
  guard?: string | ((params: Dict) => boolean)
  target?: string
}

type ZagMachine = {
  context?: (params: Dict) => Dict
  entry?: string | string[]
  implementations?: {
    actions?: Record<string, (params: Dict) => void>
    guards?: Record<string, (params: Dict) => boolean>
  }
  initialState: (params: Dict) => string
  on?: Record<string, ZagMachineTransition | ZagMachineTransition[]>
  props?: (params: Dict) => Dict
  refs?: (params: Dict) => Dict
  states: Record<
    string,
    {
      on?: Record<string, ZagMachineTransition | ZagMachineTransition[]>
    }
  >
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

function createBindable<Value>({
  defaultValue,
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
      if (!Object.is(current, previous)) {
        onChange?.(current as Value, previous)
      }
    },
    invoke(next: Value, previous: Value | undefined) {
      onChange?.(next, previous)
    },
    hash(next: Value) {
      return JSON.stringify(next)
    },
  }
}

function matchesState(current: string, value: string) {
  return current === value || current.startsWith(`${value}.`)
}

export function createZagService({
  machine,
  props: inputProps = {},
  scope: inputScope = {},
}: ZagServiceOptions) {
  const props = machine.props?.({ props: inputProps, scope: inputScope }) ?? inputProps
  const prop = (key: string) => props[key]
  const cleanupCallbacks: VoidFunction[] = []
  let currentEvent: ZagEvent = { type: "" }
  let previousEvent: ZagEvent = { type: "" }

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
  const computed = (key: string) => {
    const compute = (machine as Dict).computed?.[key]
    return compute?.(params())
  }
  const refsEntries = machine.refs?.({ context, prop }) ?? {}
  const refs = {
    get: (key: string) => refsEntries[key],
    set: (key: string, next: unknown) => {
      refsEntries[key] = next
    },
  }
  let currentState = machine.initialState({ prop })
  const state = {
    get: () => currentState,
    hasTag: () => false,
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
      track: () => undefined,
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

  function findTransition(eventType: string) {
    const stateTransition = machine.states[currentState]?.on?.[eventType]
    return chooseTransition(stateTransition ?? machine.on?.[eventType])
  }

  function send(event: ZagEvent) {
    previousEvent = currentEvent
    currentEvent = event
    const selectedTransition = findTransition(event.type)
    if (!selectedTransition) return
    if (selectedTransition.target) currentState = selectedTransition.target
    runActions(selectedTransition.actions)
  }

  runActions(machine.entry)
  machine.watch?.(params())

  return {
    computed,
    context,
    event: Object.assign(currentEvent, {
      current: () => currentEvent,
      previous: () => previousEvent,
    }),
    getStatus: () => "Started",
    prop,
    refs,
    scope,
    send,
    state,
    stop: () => {
      runActions((machine as Dict).exit)
      for (const cleanup of cleanupCallbacks) cleanup()
    },
  }
}
