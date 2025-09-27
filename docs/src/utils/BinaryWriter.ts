export class BinaryWriter {
  private view: DataView;
  private buf: ArrayBuffer;
  private u8: Uint8Array;
  private offset = 0;
  private encoder = new TextEncoder();

  constructor(initialCapacity = 1024) {
    this.buf = new ArrayBuffer(initialCapacity);
    this.view = new DataView(this.buf);
    this.u8 = new Uint8Array(this.buf);
  }

  private ensure(extra: number) {
    const need = this.offset + extra;
    if (need <= this.view.byteLength) return;

    let cap = this.view.byteLength || 1;
    while (cap < need) cap *= 2;

    const next = new ArrayBuffer(cap);
    new Uint8Array(next).set(this.u8.subarray(0, this.offset));
    this.buf = next;
    this.view = new DataView(this.buf);
    this.u8 = new Uint8Array(this.buf);
  }

  int32(value: number): void {
    this.ensure(4);
    this.view.setInt32(this.offset, value, true);
    this.offset += 4;
  }

  uint32(value: number): void {
    this.ensure(4);
    this.view.setUint32(this.offset, value, true);
    this.offset += 4;
  }

  int64(value: bigint): void {
    this.ensure(8);
    this.view.setBigInt64(this.offset, value, true);
    this.offset += 8;
  }

  uint64(value: bigint): void {
    this.ensure(8);
    this.view.setBigUint64(this.offset, value, true);
    this.offset += 8;
  }

  float(value: number): void {
    this.ensure(4);
    this.view.setFloat32(this.offset, value, true);
    this.offset += 4;
  }

  byte(value: number): void {
    this.ensure(1);
    this.view.setUint8(this.offset, value & 0xff);
    this.offset += 1;
  }

  bytes(data: Uint8Array | ArrayBuffer): void {
    const src = data instanceof Uint8Array ? data : new Uint8Array(data);
    this.ensure(src.length);
    this.u8.set(src, this.offset);
    this.offset += src.length;
  }

  string(value: string, length?: number): void {
    const bytes = this.encoder.encode(value);

    if (length === undefined) {
      this.uint32(bytes.length);
      this.ensure(bytes.length);
      this.u8.set(bytes, this.offset);
      this.offset += bytes.length;
      return;
    }

    this.ensure(length);
    const n = Math.min(bytes.length, length);
    this.u8.set(bytes.subarray(0, n), this.offset);
    if (n < length) this.u8.fill(0, this.offset + n, this.offset + length);
    this.offset += length;
  }

  skip(bytes: number): void {
    this.ensure(bytes);
    this.u8.fill(0, this.offset, this.offset + bytes);
    this.offset += bytes;
  }

  get length(): number {
    return this.offset;
  }

  get position(): number {
    return this.offset;
  }

  get capacity(): number {
    return this.view.byteLength;
  }

  toArrayBuffer(): ArrayBuffer {
    return this.buf.slice(0, this.offset);
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.buf, 0, this.offset);
  }
}