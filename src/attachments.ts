import type { GristRequester } from "./request.ts";

/** Accepted input values for uploading attachments to a Grist document. */
export type AttachmentInput =
  | File
  | Blob
  | {
      /** File name to store in Grist. */
      filename: string;
      /** Binary data to upload. */
      data: Blob | Uint8Array | ArrayBuffer | ReadableStream<Uint8Array>;
      /** MIME type to associate with the uploaded file. */
      type?: string;
    };

/** Attachment metadata returned by the Grist API. */
export interface AttachmentMetadata {
  /** Attachment record ID. */
  id: number;
  /** Original file name stored in Grist. */
  fileName: string;
  /** File size in bytes. */
  fileSize: number;
  /** Upload timestamp in ISO 8601 format. */
  timeUploaded: string;
  /** Additional metadata fields returned by Grist. */
  [key: string]: unknown;
}

/** Attachment operations for a Grist document. */
export interface GristAttachments {
  /** Uploads files and returns the created attachment IDs. */
  upload(files: AttachmentInput[]): Promise<number[]>;
  /** Retrieves metadata for an attachment by ID. */
  get(id: number): Promise<AttachmentMetadata>;
  /** Downloads an attachment as a `Blob`. */
  download(id: number): Promise<Blob>;
  /** Downloads an attachment as a readable byte stream. */
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
