import { For, Index, on, state } from "@naos-ui/core"

type Row = {
  id: string
  label: string
}

export function ListReconcilerProbe() {
  const rows = state<Row[]>([
    { id: "a", label: "Alpha" },
    { id: "b", label: "Beta" },
  ])
  const names = state(["Alpha", "Beta"])
  const selected = state("a")
  const isSelected = (id: string) => selected() === id

  return (
    <section part="root">
      <div data-probe-for-list>
        <For each={rows()} motion="flip">
          {(row, index) => (
            <button
              key={row.id}
              data-probe-for-row
              data-id={row.id}
              data-index={index}
              data-selected={isSelected(row.id) ? "yes" : "no"}
              aria-selected={isSelected(row.id)}
              onClick={() => {
                selected.set(row.id)
                document.body.dataset.probeForClicked = row.id
              }}
            >
              {row.label}
            </button>
          )}
        </For>
      </div>
      <button
        data-probe-for-reorder
        onClick={() => {
          const [first, second] = rows()
          if (!first || !second) return
          rows.set([second, first, { id: "c", label: "Gamma" }])
        }}
      >
        Reorder keyed rows
      </button>

      <div data-probe-index-list>
        <Index each={names()}>
          {(name, index) => (
            <input
              data-probe-index-row
              data-index={index}
              value={name()}
              onInput={on("input", (event) => {
                const input = event.currentTarget
                if (!(input instanceof HTMLInputElement)) return
                const next = [...names()]
                next[index] = input.value
                names.set(next)
              })}
            />
          )}
        </Index>
      </div>
      <button
        data-probe-index-replace
        onClick={() => {
          names.set(["Gamma", names()[1] ?? ""])
        }}
      >
        Replace first indexed value
      </button>
    </section>
  )
}
