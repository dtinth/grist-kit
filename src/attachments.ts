import type { GristRequester } from "./request.ts";

export type AttachmentInput =
  | File
  | Blob
  | {
      filename: string;
      data: Blob | Uint8Array | ArrayBuffer | ReadableStream<Uint8Array>;
      type?: string;
    };

export interface AttachmentMetadata {
  id: number;
  fileName: string;
  fileSize: number;
  timeUploaded: string;
  [key: string]: unknown;
}

export interface GristAttachments {
  upload(files: AttachmentInput[]): Promise<number[]>;
  get(id: number): Promise<AttachmentMetadata>;
  download(id: number): Promise<Blob>;
  downloadStream(id: number): Promise<ReadableStream<Uint8Array>>;
}

export function createAttachments(requester: GristRequester): GristAttachments {
  return {
    async upload(files) {
      const form = new FormData();
      for (const input of files) form.append("upload", toBlob(input));
      return requester.request<number[]>("/attachments", {
        method: "POST",
        body: form,
      });
    },

    async get(id) {
      return requester.request<AttachmentMetadata>(
        `/attachments/${encodeURIComponent(String(id))}`,
      );
    },

    async download(id) {
      return requester.request<Blob>(`/attachments/${encodeURIComponent(String(id))}/download`, {
        responseType: "blob",
      });
    },

    async downloadStream(id) {
      const response = await requester.fetch.raw(
        `${requester.baseDocUrl}/attachments/${encodeURIComponent(String(id))}/download`,
        { responseType: "stream" },
      );
      if (!response._data) {
        throw new Error("Missing response stream for attachment download");
      }
      return response._data as ReadableStream<Uint8Array>;
    },
  };
}

function toBlob(input: AttachmentInput): Blob | File {
  if (input instanceof Blob) return input;
  const { filename, data, type } = input;
  if (data instanceof ReadableStream) {
    throw new Error("Streaming upload is not supported yet; pass a Blob or Uint8Array.");
  }
  // DOM and Node Blob/File part types overlap imperfectly; narrow interop shape.
  type BlobLikePart = Blob | ArrayBuffer | Uint8Array | string;
  const BlobCtor = Blob as unknown as new (
    parts: BlobLikePart[],
    options?: { type?: string },
  ) => Blob;
  const FileCtor = File as unknown as new (
    parts: BlobLikePart[],
    name: string,
    options?: { type?: string },
  ) => File;
  const blob = data instanceof Blob ? data : new BlobCtor([data], type ? { type } : {});
  return new FileCtor([blob], filename, type ? { type } : {});
}
