/**
 * StorageProvider interface — defines the contract for all storage backends.
 */

export interface PutObjectOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface GetObjectResult {
  body: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
  size: number;
  lastModified?: Date;
}

export interface StorageObject {
  key: string;
  size: number;
  lastModified?: Date;
  metadata?: Record<string, string>;
}

export interface ListObjectsOptions {
  prefix?: string;
  maxKeys?: number;
  delimiter?: string;
}

export interface ListObjectsResult {
  objects: StorageObject[];
  hasMore: boolean;
  nextToken?: string;
}

export interface StorageProvider {
  /**
   * Store a buffer/string under the given key.
   */
  putObject(
    key: string,
    body: Buffer | string,
    options?: PutObjectOptions,
  ): Promise<void>;

  /**
   * Retrieve an object by key.
   * Throws if the object does not exist.
   */
  getObject(key: string): Promise<GetObjectResult>;

  /**
   * Delete an object by key.
   * Does not throw if the object does not exist.
   */
  deleteObject(key: string): Promise<void>;

  /**
   * Check if an object exists.
   */
  objectExists(key: string): Promise<boolean>;

  /**
   * List objects, optionally filtered by prefix.
   */
  listObjects(options?: ListObjectsOptions): Promise<ListObjectsResult>;

  /**
   * Generate a pre-signed URL for direct client access (optional).
   */
  getSignedUrl?(key: string, expiresInSeconds: number): Promise<string>;
}
