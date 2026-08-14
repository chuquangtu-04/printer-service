import { inflateSync } from 'zlib';
import { GS } from './EscposCommands';

interface DecodedPng {
  width: number;
  height: number;
  rgba: Uint8Array;
}

interface PngChunk {
  type: string;
  data: Buffer;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export async function imageUrlToRasterCommand(url: string, targetWidth = 240): Promise<Buffer> {
  const imageBuffer = await downloadImage(url);
  const png = decodePng(imageBuffer);
  const scaled = scaleToWidth(png, targetWidth);
  return rgbaToRasterCommand(scaled);
}

function isPng(buffer: Buffer): boolean {
  return buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Khong tai duoc anh QR: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!contentType.includes('png') && !isPng(buffer)) {
    throw new Error('Anh QR phai la PNG de in truc tiep');
  }

  return buffer;
}

function decodePng(buffer: Buffer): DecodedPng {
  if (!isPng(buffer)) {
    throw new Error('File QR khong phai PNG hop le');
  }

  const chunks = readChunks(buffer);
  const ihdr = chunks.find((chunk) => chunk.type === 'IHDR')?.data;
  if (!ihdr) throw new Error('PNG thieu IHDR');

  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr.readUInt8(8);
  const colorType = ihdr.readUInt8(9);
  const compression = ihdr.readUInt8(10);
  const filter = ihdr.readUInt8(11);
  const interlace = ihdr.readUInt8(12);

  if (bitDepth !== 8 || compression !== 0 || filter !== 0 || interlace !== 0) {
    throw new Error('PNG QR chua duoc ho tro: can PNG 8-bit non-interlaced');
  }

  const palette = Buffer.concat(chunks.filter((chunk) => chunk.type === 'PLTE').map((chunk) => chunk.data));
  const transparency = chunks.find((chunk) => chunk.type === 'tRNS')?.data;
  const idat = Buffer.concat(chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data));
  const raw = inflateSync(idat);
  const bytesPerPixel = getBytesPerPixel(colorType);
  const scanlineLength = width * bytesPerPixel;
  const unfiltered = unfilter(raw, width, height, bytesPerPixel, scanlineLength);
  const rgba = toRgba(unfiltered, width, height, colorType, palette, transparency);

  return { width, height, rgba };
}

function readChunks(buffer: Buffer): PngChunk[] {
  const chunks: PngChunk[] = [];
  let offset = PNG_SIGNATURE.length;

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    chunks.push({ type, data: buffer.subarray(dataStart, dataEnd) });
    offset = dataEnd + 4;
    if (type === 'IEND') break;
  }

  return chunks;
}

function getBytesPerPixel(colorType: number): number {
  switch (colorType) {
    case 0:
      return 1;
    case 2:
      return 3;
    case 3:
      return 1;
    case 4:
      return 2;
    case 6:
      return 4;
    default:
      throw new Error(`PNG color type khong ho tro: ${colorType}`);
  }
}

function unfilter(raw: Buffer, width: number, height: number, bytesPerPixel: number, scanlineLength: number): Uint8Array {
  const result = new Uint8Array(height * scanlineLength);
  let rawOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filterType = raw[rawOffset];
    rawOffset += 1;
    const rowOffset = y * scanlineLength;
    const prevRowOffset = rowOffset - scanlineLength;

    for (let x = 0; x < scanlineLength; x += 1) {
      const left = x >= bytesPerPixel ? result[rowOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? result[prevRowOffset + x] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? result[prevRowOffset + x - bytesPerPixel] : 0;
      const current = raw[rawOffset + x];

      result[rowOffset + x] = (current + filterValue(filterType, left, up, upLeft)) & 0xff;
    }

    rawOffset += scanlineLength;
  }

  return result;
}

function filterValue(filterType: number, left: number, up: number, upLeft: number): number {
  switch (filterType) {
    case 0:
      return 0;
    case 1:
      return left;
    case 2:
      return up;
    case 3:
      return Math.floor((left + up) / 2);
    case 4:
      return paeth(left, up, upLeft);
    default:
      throw new Error(`PNG filter khong ho tro: ${filterType}`);
  }
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  if (upDistance <= upLeftDistance) return up;
  return upLeft;
}

function toRgba(
  data: Uint8Array,
  width: number,
  height: number,
  colorType: number,
  palette: Buffer,
  transparency?: Buffer
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4);
  let source = 0;
  let target = 0;

  for (let i = 0; i < width * height; i += 1) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 255;

    if (colorType === 0) {
      r = g = b = data[source];
      source += 1;
    } else if (colorType === 2) {
      r = data[source];
      g = data[source + 1];
      b = data[source + 2];
      source += 3;
    } else if (colorType === 3) {
      const index = data[source];
      r = palette[index * 3] ?? 255;
      g = palette[index * 3 + 1] ?? 255;
      b = palette[index * 3 + 2] ?? 255;
      a = transparency?.[index] ?? 255;
      source += 1;
    } else if (colorType === 4) {
      r = g = b = data[source];
      a = data[source + 1];
      source += 2;
    } else if (colorType === 6) {
      r = data[source];
      g = data[source + 1];
      b = data[source + 2];
      a = data[source + 3];
      source += 4;
    }

    rgba[target] = r;
    rgba[target + 1] = g;
    rgba[target + 2] = b;
    rgba[target + 3] = a;
    target += 4;
  }

  return rgba;
}

function scaleToWidth(image: DecodedPng, targetWidth: number): DecodedPng {
  const width = Math.min(targetWidth, image.width);
  const height = Math.max(1, Math.round(image.height * (width / image.width)));
  const rgba = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.floor(y * image.height / height));

    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.floor(x * image.width / width));
      const source = (sourceY * image.width + sourceX) * 4;
      const target = (y * width + x) * 4;
      rgba[target] = image.rgba[source];
      rgba[target + 1] = image.rgba[source + 1];
      rgba[target + 2] = image.rgba[source + 2];
      rgba[target + 3] = image.rgba[source + 3];
    }
  }

  return { width, height, rgba };
}

function rgbaToRasterCommand(image: DecodedPng): Buffer {
  const bytesPerRow = Math.ceil(image.width / 8);
  const raster = Buffer.alloc(bytesPerRow * image.height);

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const rgbaOffset = (y * image.width + x) * 4;
      const alpha = image.rgba[rgbaOffset + 3];
      const r = image.rgba[rgbaOffset];
      const g = image.rgba[rgbaOffset + 1];
      const b = image.rgba[rgbaOffset + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      if (alpha > 40 && luminance < 190) {
        raster[y * bytesPerRow + Math.floor(x / 8)] |= 0x80 >> (x % 8);
      }
    }
  }

  return Buffer.concat([
    Buffer.from([GS, 0x76, 0x30, 0x00, bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff, image.height & 0xff, (image.height >> 8) & 0xff]),
    raster,
    Buffer.from('\n', 'ascii'),
  ]);
}
