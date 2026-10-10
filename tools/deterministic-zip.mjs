// SPDX-License-Identifier: MIT
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function zipTimestamp(unixSeconds) {
  const date = new Date(Math.max(unixSeconds, 315532800) * 1000);
  return { time: (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2), day: ((date.getUTCFullYear() - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate() };
}

function u16(value) { const bytes = Buffer.alloc(2); bytes.writeUInt16LE(value); return bytes; }
function u32(value) { const bytes = Buffer.alloc(4); bytes.writeUInt32LE(value >>> 0); return bytes; }
function safeName(name) { return typeof name === 'string' && name && !name.startsWith('/') && !name.includes('\\') && !name.split('/').includes('..'); }
export const memberOrder = (left, right) => left < right ? -1 : left > right ? 1 : 0;

/** Writes regular source members in byte-stable order without platform metadata. */
export async function writeDeterministicZip(members, destination, { epoch = 0 } = {}) {
  if (!Number.isInteger(epoch) || epoch < 0 || epoch > 0x7fffffff) throw new Error('ZIP epoch must be a non-negative Unix timestamp.');
  const entries = members.map(({ name, source }) => {
    if (!safeName(name)) throw new Error(`Unsafe ZIP member path: ${name}`);
    if (!Buffer.isBuffer(source)) throw new Error(`ZIP member ${name} is not bytes.`);
    return { name, source, payload: deflateRawSync(source, { level: 9 }), crc: crc32(source) };
  }).sort((left, right) => memberOrder(left.name, right.name));
  if (entries.some((entry, index) => entry.name === entries[index - 1]?.name)) throw new Error('ZIP member paths must be unique.');
  if (entries.length > 0xffff) throw new Error('ZIP has too many members for the supported archive format.');
  const stamp = zipTimestamp(epoch);
  const chunks = [], central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    if (name.length > 0xffff || entry.source.length > 0xffffffff || entry.payload.length > 0xffffffff || offset > 0xffffffff) throw new Error(`ZIP member exceeds the supported archive limits: ${entry.name}`);
    const header = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), u16(20), u16(0x0800), u16(8), u16(stamp.time), u16(stamp.day), u32(entry.crc), u32(entry.payload.length), u32(entry.source.length), u16(name.length), u16(0), name]);
    chunks.push(header, entry.payload);
    central.push(Buffer.concat([Buffer.from([0x50, 0x4b, 0x01, 0x02]), u16(0x0314), u16(20), u16(0x0800), u16(8), u16(stamp.time), u16(stamp.day), u32(entry.crc), u32(entry.payload.length), u32(entry.source.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
    offset += header.length + entry.payload.length;
  }
  const centralBytes = Buffer.concat(central);
  if (centralBytes.length > 0xffffffff || offset > 0xffffffff) throw new Error('ZIP central directory exceeds the supported archive limits.');
  chunks.push(centralBytes, Buffer.concat([Buffer.from([0x50, 0x4b, 0x05, 0x06]), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(centralBytes.length), u32(offset), u16(0)]));
  await writeFile(destination, Buffer.concat(chunks));
  return entries.map(entry => ({ name: entry.name, source: entry.source, size: entry.source.length, compressedSize: entry.payload.length, crc: entry.crc }));
}

/** Reads exactly the archive format written above and rejects extra or ambiguous bytes. */
export function readDeterministicZip(bytes) {
  const entries = [];
  let offset = 0;
  while (offset + 4 <= bytes.length && bytes.readUInt32LE(offset) === 0x04034b50) {
    if (offset + 30 > bytes.length) throw new Error('Truncated ZIP local header.');
    const version = bytes.readUInt16LE(offset + 4), flags = bytes.readUInt16LE(offset + 6), method = bytes.readUInt16LE(offset + 8), time = bytes.readUInt16LE(offset + 10), day = bytes.readUInt16LE(offset + 12), crc = bytes.readUInt32LE(offset + 14), compressedSize = bytes.readUInt32LE(offset + 18), size = bytes.readUInt32LE(offset + 22), nameLength = bytes.readUInt16LE(offset + 26), extraLength = bytes.readUInt16LE(offset + 28);
    const nameStart = offset + 30, payloadStart = nameStart + nameLength + extraLength, payloadEnd = payloadStart + compressedSize;
    if (version !== 20 || flags !== 0x0800 || method !== 8 || extraLength !== 0 || payloadEnd > bytes.length) throw new Error('ZIP member does not match the deterministic package format.');
    const name = bytes.subarray(nameStart, nameStart + nameLength).toString('utf8');
    if (!safeName(name)) throw new Error(`Unsafe ZIP member path: ${name}`);
    const source = inflateRawSync(bytes.subarray(payloadStart, payloadEnd));
    if (source.length !== size || crc32(source) !== crc) throw new Error(`ZIP member integrity mismatch: ${name}`);
    entries.push({ name, source, size, compressedSize, crc, time, day, offset });
    offset = payloadEnd;
  }
  if (!entries.length || bytes.readUInt32LE(offset) !== 0x02014b50) throw new Error('ZIP has no valid local members followed by a central directory.');
  const centralStart = offset, central = [];
  while (offset + 4 <= bytes.length && bytes.readUInt32LE(offset) === 0x02014b50) {
    if (offset + 46 > bytes.length) throw new Error('Truncated ZIP central-directory member.');
    const nameLength = bytes.readUInt16LE(offset + 28), extraLength = bytes.readUInt16LE(offset + 30), commentLength = bytes.readUInt16LE(offset + 32), end = offset + 46 + nameLength + extraLength + commentLength;
    if (bytes.readUInt16LE(offset + 6) !== 20 || bytes.readUInt16LE(offset + 8) !== 0x0800 || bytes.readUInt16LE(offset + 10) !== 8 || extraLength !== 0 || commentLength !== 0 || end > bytes.length) throw new Error('ZIP central directory does not match the deterministic package format.');
    central.push({ name: bytes.subarray(offset + 46, offset + 46 + nameLength).toString('utf8'), crc: bytes.readUInt32LE(offset + 16), compressedSize: bytes.readUInt32LE(offset + 20), size: bytes.readUInt32LE(offset + 24), time: bytes.readUInt16LE(offset + 12), day: bytes.readUInt16LE(offset + 14), localOffset: bytes.readUInt32LE(offset + 42) });
    offset = end;
  }
  if (offset + 22 !== bytes.length || bytes.readUInt32LE(offset) !== 0x06054b50 || bytes.readUInt16LE(offset + 20) !== 0 || bytes.readUInt16LE(offset + 8) !== entries.length || bytes.readUInt16LE(offset + 10) !== entries.length || bytes.readUInt32LE(offset + 12) !== offset - centralStart || bytes.readUInt32LE(offset + 16) !== centralStart) throw new Error('ZIP end record does not match the deterministic package format.');
  for (const [index, entry] of entries.entries()) {
    const record = central[index];
    if (!record || record.name !== entry.name || record.crc !== entry.crc || record.compressedSize !== entry.compressedSize || record.size !== entry.size || record.time !== entry.time || record.day !== entry.day || record.localOffset !== entry.offset) throw new Error(`ZIP central-directory mismatch: ${entry.name}`);
  }
  return entries;
}
