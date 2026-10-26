import fs from 'fs'
import { IFileStorage } from '@keyvault/core'

export class NodeFileStorage implements IFileStorage {
  public exists(filePath: string): boolean {
    return fs.existsSync(filePath)
  }

  public read(filePath: string): Buffer {
    return fs.readFileSync(filePath)
  }

  public writeAtomic(filePath: string, data: Buffer): void {
    const tmpFile = `${filePath}.tmp`
    fs.writeFileSync(tmpFile, data)
    fs.renameSync(tmpFile, filePath)
  }

  public copy(from: string, to: string): void {
    fs.copyFileSync(from, to)
  }
}
