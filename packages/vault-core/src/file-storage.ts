export interface IFileStorage {
  exists(filePath: string): boolean
  read(filePath: string): Buffer
  writeAtomic(filePath: string, data: Buffer): void
  copy(from: string, to: string): void
}
