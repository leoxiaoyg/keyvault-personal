import { IFileStorage } from '../src/file-storage'

export class MemoryFileStorage implements IFileStorage {
  private readonly files = new Map<string, Buffer>()

  public exists(filePath: string): boolean {
    return this.files.has(filePath)
  }

  public read(filePath: string): Buffer {
    const data = this.files.get(filePath)
    if (!data) {
      throw new Error(`Missing file: ${filePath}`)
    }
    return Buffer.from(data)
  }

  public writeAtomic(filePath: string, data: Buffer): void {
    this.files.set(filePath, Buffer.from(data))
  }

  public copy(from: string, to: string): void {
    this.writeAtomic(to, this.read(from))
  }
}
