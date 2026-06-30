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
  createNaosZagFileUploadService,
  fileUploadFileNames,
  fileUploadFormValue,
  getNaosZagFileUploadApi,
  stopNaosZagFileUploadService,
} from "./internal/zag/file-upload.js"
import type { NaosZagFileUploadService } from "./internal/zag/file-upload.js"
import css from "./file-upload.wc.css?inline"

export type NaosFileUploadProps = {
  accept?: string
  disabled?: boolean
  label?: string
  maxFiles?: number
  multiple?: boolean
  name?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosFileUpload({
  accept = "",
  disabled = false,
  label = "Upload files",
  maxFiles = 3,
  multiple = false,
  name = "",
}: NaosFileUploadProps = {}) {
  const files = state<File[]>([])
  const rejected = state<string[]>([])
  const fileUploadService = state<NaosZagFileUploadService | null>(null)
  const fileUploadApi = computed(() => getNaosZagFileUploadApi(fileUploadService()))
  const changed = event<{ files: string[]; rejectedFiles: string[] }>("naos-change")
  const rejectedEvent = event<{ files: string[] }>("naos-invalid")
  const form = formControl({
    value: () => fileUploadFormValue({ files: files(), multiple, name }),
    reset: () => {
      files.set([])
      rejected.set([])
      fileUploadApi()?.clearFiles()
      fileUploadApi()?.clearRejectedFiles()
    },
    disabled,
  })
  void form
  void name

  onConnected(() => {
    fileUploadService.set(createNaosZagFileUploadService({
      accept,
      disabled,
      host: host().element,
      id: "naos-file-upload",
      maxFiles,
      multiple,
      name,
      onFileChange(details) {
        const rejectedNames = details.rejectedFiles.map((item) => item.file.name)

        changed.emit({
          files: fileUploadFileNames(details.acceptedFiles),
          rejectedFiles: rejectedNames,
        })
        queueMicrotask(() => {
          files.set(details.acceptedFiles)
          rejected.set(rejectedNames)
        })
      },
      onFileReject(details) {
        const rejectedNames = details.files.map((item) => item.file.name)

        rejectedEvent.emit({ files: rejectedNames })
        queueMicrotask(() => {
          rejected.set(rejectedNames)
        })
      },
      root: host().root,
    }))
  })
  onDisconnected(() => {
    stopNaosZagFileUploadService(fileUploadService())
    fileUploadService.set(null)
  })

  return (
    <section
      {...(fileUploadApi()?.getRootProps() ?? {})}
      part="root"
      data-state={files().length === 0 ? "empty" : "filled"}
      data-disabled={disabled || undefined}
      data-value={fileUploadFileNames(files()).join(",")}
    >
      <label {...(fileUploadApi()?.getLabelProps() ?? {})} part="label">
        {label}
      </label>
      <div {...(fileUploadApi()?.getDropzoneProps() ?? {})} part="dropzone">
        <input
          {...(fileUploadApi()?.getHiddenInputProps() ?? {})}
          part="input"
          name={undefined}
          disabled={disabled}
        />
        <span part="message">
          {multiple ? "Choose files or drop them here" : "Choose a file or drop it here"}
        </span>
        <button {...(fileUploadApi()?.getTriggerProps() ?? {})} part="trigger">
          Browse
        </button>
      </div>
      <div {...(fileUploadApi()?.getItemGroupProps() ?? {})} part="items">
        {files().map((file, fileIndex) => (
          <div
            key={`${file.name}-${file.size}-${fileIndex}`}
            {...(fileUploadApi()?.getItemProps({ file }) ?? {})}
            part="item"
          >
            <span {...(fileUploadApi()?.getItemNameProps({ file }) ?? {})} part="item-name">
              {file.name}
            </span>
            <span
              {...(fileUploadApi()?.getItemSizeTextProps({ file }) ?? {})}
              part="item-size"
            >
              {fileUploadApi()?.getFileSize(file) ?? `${file.size} B`}
            </span>
            <button
              {...(fileUploadApi()?.getItemDeleteTriggerProps({ file }) ?? {})}
              part="item-delete"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div part="rejected" data-state={rejected().length === 0 ? "empty" : "filled"}>
        {rejected().join(",")}
      </div>
      <button {...(fileUploadApi()?.getClearTriggerProps() ?? {})} part="clear">
        Clear
      </button>
    </section>
  )
}
