import {
  connect,
  machine as fileUploadMachine,
  type Api as ZagFileUploadApi,
  type FileChangeDetails,
  type FileRejectDetails,
} from "@zag-js/file-upload"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagFileUploadService = ReturnType<typeof createZagService>

type NaosZagFileUploadServiceOptions = {
  accept: string
  disabled: boolean
  host: HTMLElement
  id: string
  maxFiles: number
  multiple: boolean
  name: string
  onFileChange(details: FileChangeDetails): void
  onFileReject(details: FileRejectDetails): void
  root: ParentNode
}

export function fileUploadFileNames(files: File[]): string[] {
  return files.map((file) => file.name)
}

export function fileUploadFormValue({
  files,
  multiple,
  name,
}: {
  files: File[]
  multiple: boolean
  name: string
}): FormDataEntryValue | FormData | null {
  if (files.length === 0) return null
  if (!multiple) return files[0] ?? null
  if (!name) return null
  const data = new FormData()
  for (const file of files) data.append(name, file)
  return data
}

export function createNaosZagFileUploadService({
  accept,
  disabled,
  host,
  id,
  maxFiles,
  multiple,
  name,
  onFileChange,
  onFileReject,
  root,
}: NaosZagFileUploadServiceOptions): NaosZagFileUploadService {
  return createZagService({
    machine: fileUploadMachine as never,
    props: {
      accept,
      allowDrop: true,
      disabled,
      id,
      maxFiles: multiple ? maxFiles : 1,
      name,
      onFileChange,
      onFileReject,
      translations: {
        deleteFile(file: File) {
          return `Remove ${file.name}`
        },
        dropzone: "File upload",
      },
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagFileUploadApi(
  service: NaosZagFileUploadService | null
): ZagFileUploadApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagFileUploadService(
  service: NaosZagFileUploadService | null
) {
  service?.stop()
}
