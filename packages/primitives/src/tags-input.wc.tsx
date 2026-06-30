import {
  computed,
  event,
  formControl,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@naos-ui/core"
import {
  createNaosZagTagsInputService,
  getNaosZagTagsInputApi,
  stopNaosZagTagsInputService,
  tagsInputFormValue,
  tagsInputValueArray,
} from "./internal/zag/tags-input.js"
import type { NaosZagTagsInputService } from "./internal/zag/tags-input.js"
import css from "./tags-input.wc.css?inline"

export type NaosTagsInputProps = {
  allowDuplicates?: boolean
  delimiter?: string
  disabled?: boolean
  label?: string
  max?: number
  name?: string
  placeholder?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosTagsInput({
  allowDuplicates = false,
  delimiter = ",",
  disabled = false,
  label = "Tags",
  max = 10,
  name = "",
  placeholder = "Add tag",
  value = "",
}: NaosTagsInputProps = {}) {
  const current = state(tagsInputValueArray(value, delimiter))
  const input = state("")
  const tagsInputService = state<NaosZagTagsInputService | null>(null)
  const tagsInputApi = computed(() => getNaosZagTagsInputApi(tagsInputService()))
  const changed = event<{ value: string[]; valueAsString: string }>("naos-change")
  const inputChanged = event<{ inputValue: string }>("naos-input")
  const highlightedChanged = event<{ highlightedValue: string | null }>(
    "naos-highlight-change"
  )
  const invalid = event<{ reason: string }>("naos-invalid")
  const form = formControl({
    value: () => tagsInputFormValue(current()),
    reset: () => {
      const resetValue = tagsInputValueArray(value, delimiter)
      current.set(resetValue)
      input.set("")
      tagsInputApi()?.setValue(resetValue)
      tagsInputApi()?.clearInputValue()
    },
    disabled,
  })
  void form
  void name

  onConnected(() => {
    tagsInputService.set(createNaosZagTagsInputService({
      allowDuplicates,
      delimiter,
      disabled,
      host: host().element,
      id: "naos-tags-input",
      max,
      name,
      onHighlightChange(details) {
        highlightedChanged.emit(details)
      },
      onInputValueChange(details) {
        inputChanged.emit(details)
        queueMicrotask(() => {
          input.set(details.inputValue)
        })
      },
      onValueChange(details) {
        const nextValueAsString = tagsInputFormValue(details.value)

        changed.emit({ value: details.value, valueAsString: nextValueAsString })
        queueMicrotask(() => {
          current.set(details.value)
        })
      },
      onValueInvalid(details) {
        invalid.emit(details)
      },
      placeholder,
      root: host().root,
      value: tagsInputValueArray(value, delimiter),
    }))
  })
  onDisconnected(() => {
    stopNaosZagTagsInputService(tagsInputService())
    tagsInputService.set(null)
  })

  return (
    <section
      {...(tagsInputApi()?.getRootProps() ?? {})}
      part="root"
      data-state={current().length === 0 ? "empty" : "filled"}
      data-disabled={disabled || undefined}
      data-value={tagsInputFormValue(current())}
    >
      <label {...(tagsInputApi()?.getLabelProps() ?? {})} part="label">
        {label}
      </label>
      <div {...(tagsInputApi()?.getControlProps() ?? {})} part="control">
        {current().map((tagValue, tagIndex) => (
          <span
            key={`${tagValue}-${tagIndex}`}
            {...(tagsInputApi()?.getItemProps({
              index: tagIndex,
              value: tagValue,
            }) ?? {})}
            part="item"
          >
            <span
              {...(tagsInputApi()?.getItemPreviewProps({
                index: tagIndex,
                value: tagValue,
              }) ?? {})}
              part="item-preview"
            >
              <span
                {...(tagsInputApi()?.getItemTextProps({
                  index: tagIndex,
                  value: tagValue,
                }) ?? {})}
                part="item-text"
              >
                {tagValue}
              </span>
              <button
                {...(tagsInputApi()?.getItemDeleteTriggerProps({
                  index: tagIndex,
                  value: tagValue,
                }) ?? {})}
                part="item-delete"
              >
                x
              </button>
            </span>
            <input
              {...(tagsInputApi()?.getItemInputProps({
                index: tagIndex,
                value: tagValue,
              }) ?? {})}
              part="item-input"
            />
          </span>
        ))}
        <input
          {...(tagsInputApi()?.getInputProps() ?? {})}
          part="input"
          value={input()}
          disabled={disabled}
        />
        <button {...(tagsInputApi()?.getClearTriggerProps() ?? {})} part="clear">
          Clear
        </button>
      </div>
      <input
        {...(tagsInputApi()?.getHiddenInputProps() ?? {})}
        name={undefined}
        value={tagsInputFormValue(current())}
      />
    </section>
  )
}
