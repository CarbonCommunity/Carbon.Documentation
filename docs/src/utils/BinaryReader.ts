export class BinaryReader {
  private view: DataView;
  private u8: Uint8Array;
  private offset = 0;
  private decoder = new TextDecoder("utf-8", { fatal: false });

  constructor(private buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
    this.u8 = new Uint8Array(buffer);
  }

  int32(): number {
    const v = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return v;
  }

  uint32(): number {
    const v = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return v;
  }

  float(): number {
    const v = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return v;
  }

  int64(): bigint {
    const v = this.view.getBigInt64(this.offset, true);
    this.offset += 8;
    return v;
  }

  double(): number {
    const v = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return v;
  }

  uint64(): bigint {
    const v = this.view.getBigUint64(this.offset, true);
    this.offset += 8;
    return v;
  }

  byte(): number {
    return this.view.getUint8(this.offset++);
  }

  bytes(length: number): Uint8Array {
    const end = this.offset + length;
    const slice = this.u8.subarray(this.offset, end);
    this.offset = end;
    return slice;
  }

  bool(): boolean {
    return this.byte() == 1
  }

  string(): string {
    const len = this.uint32();
    if (len === 0) return "";
    const bytes = this.bytes(len);
    return this.decoder.decode(bytes);
  }

  fixedString(length: number, trimNulls = true): string {
    const bytes = this.bytes(length);
    let end = bytes.length;

    if (trimNulls) {
      for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] === 0) { end = i; break; }
      }
    }
    return end > 0 ? this.decoder.decode(bytes.subarray(0, end)) : "";
  }

  cstring(): string {
    const start = this.offset;
    const n = this.view.byteLength;

    while (this.offset < n && this.view.getUint8(this.offset) !== 0) {
      this.offset++;
    }

    const hasTerminator = this.offset < n && this.view.getUint8(this.offset) === 0;
    const bytes = this.u8.subarray(start, this.offset);

    if (hasTerminator) this.offset++;

    return this.decoder.decode(bytes);
  }

  skip(bytes: number) { this.offset += bytes; }
  get position() { return this.offset; }
  set position(p: number) { this.offset = p; }
  get length() { return this.view.byteLength; }
}