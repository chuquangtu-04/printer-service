import dns from 'dns/promises';
import net from 'net';
import os from 'os';
import { ValidationError } from '../../common/errors';

const DEFAULT_PRINTER_PORTS = [9100] as const;
const DEFAULT_SCAN_CONCURRENCY = 40;
const DEFAULT_PORT_TIMEOUT_MS = 300;
const MAX_HOSTS_PER_SCAN = 4096;

export type LanPrinterConfidence = 'high' | 'maybe';

export interface LocalIPv4Interface {
  name: string;
  address: string;
  netmask: string;
}

export interface LanPrinterDiscoveryOptions {
  subnetIp?: string;
  netmask?: string;
  concurrency?: number;
  timeoutMs?: number;
  ports?: number[];
}

export interface LanPrinterCandidate {
  ip: string;
  port: number;
  printPorts: number[];
  openPorts: number[];
  confidence: LanPrinterConfidence;
  name: string;
  hostname?: string;
}

export interface LanPrinterDiscoveryResult {
  success: true;
  subnetIp: string;
  netmask: string;
  ports: number[];
  scannedHosts: number;
  total: number;
  printers: LanPrinterCandidate[];
}

interface HostCheckResult {
  ip: string;
  openPorts: number[];
  confidence: LanPrinterConfidence;
}

export class LanPrinterDiscovery {
  getLocalIPv4Interfaces(): LocalIPv4Interface[] {
    const interfaces = os.networkInterfaces();
    const result: LocalIPv4Interface[] = [];

    for (const [name, entries] of Object.entries(interfaces)) {
      for (const entry of entries ?? []) {
        if (entry.family === 'IPv4' && !entry.internal) {
          result.push({ name, address: entry.address, netmask: entry.netmask });
        }
      }
    }

    return result;
  }

  async discover(options: LanPrinterDiscoveryOptions = {}): Promise<LanPrinterDiscoveryResult> {
    const target = this.resolveTargetNetwork(options);
    const hosts = this.getHostsInSubnet(target.subnetIp, target.netmask);
    const concurrency = this.positiveInteger(options.concurrency, DEFAULT_SCAN_CONCURRENCY);
    const ports = this.normalizePorts(options.ports);

    const candidates = await this.runWithConcurrency(
      hosts,
      (ip) => this.checkHost(ip, ports, options.timeoutMs),
      concurrency
    );

    const printers = await Promise.all(
      candidates.map((candidate) => this.toCandidate(candidate))
    );

    printers.sort((a, b) => this.ipToLong(a.ip) - this.ipToLong(b.ip));

    return {
      success: true,
      subnetIp: target.subnetIp,
      netmask: target.netmask,
      ports,
      scannedHosts: hosts.length,
      total: printers.length,
      printers,
    };
  }

  private resolveTargetNetwork(options: LanPrinterDiscoveryOptions): { subnetIp: string; netmask: string } {
    if (options.subnetIp && options.netmask) {
      this.assertIPv4(options.subnetIp, 'subnetIp');
      this.assertIPv4(options.netmask, 'netmask');
      return { subnetIp: options.subnetIp, netmask: options.netmask };
    }

    const [firstInterface] = this.getLocalIPv4Interfaces();
    if (!firstInterface) {
      throw new ValidationError('Khong tim thay interface IPv4 LAN de quet may in');
    }

    return { subnetIp: firstInterface.address, netmask: firstInterface.netmask };
  }

  private async checkHost(ip: string, ports: number[], timeoutMs?: number): Promise<HostCheckResult | null> {
    const openPorts: number[] = [];

    await Promise.all(
      ports.map(async (port) => {
        if (await this.isPortOpen(ip, port, timeoutMs)) {
          openPorts.push(port);
        }
      })
    );

    if (openPorts.length === 0) return null;

    openPorts.sort((a, b) => a - b);
    return {
      ip,
      openPorts,
      confidence: 'high',
    };
  }

  private async toCandidate(candidate: HostCheckResult): Promise<LanPrinterCandidate> {
    const hostname = await this.getHostname(candidate.ip);
    const printPorts = candidate.openPorts;

    return {
      ip: candidate.ip,
      port: printPorts[0] ?? candidate.openPorts[0],
      printPorts,
      openPorts: candidate.openPorts,
      confidence: candidate.confidence,
      name: hostname ?? `Thiet bi tai ${candidate.ip}`,
      hostname: hostname ?? undefined,
    };
  }

  private isPortOpen(ip: string, port: number, timeoutMs?: number): Promise<boolean> {
    const timeout = this.positiveInteger(timeoutMs, DEFAULT_PORT_TIMEOUT_MS);

    return new Promise((resolve) => {
      const socket = new net.Socket();
      let settled = false;

      const finish = (isOpen: boolean) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(isOpen);
      };

      socket.setTimeout(timeout);
      socket.once('connect', () => finish(true));
      socket.once('timeout', () => finish(false));
      socket.once('error', () => finish(false));
      socket.connect(port, ip);
    });
  }

  private async getHostname(ip: string): Promise<string | null> {
    try {
      const names = await dns.reverse(ip);
      return names[0] ?? null;
    } catch {
      return null;
    }
  }

  private getHostsInSubnet(ip: string, netmask: string): string[] {
    const ipLong = this.ipToLong(ip);
    const maskLong = this.ipToLong(netmask);
    const networkLong = ipLong & maskLong;
    const broadcastLong = networkLong | (~maskLong >>> 0);
    const hostCount = broadcastLong - networkLong - 1;

    if (hostCount <= 0) return [];
    if (hostCount > MAX_HOSTS_PER_SCAN) {
      throw new ValidationError(`Dai mang qua lon de quet (${hostCount} hosts). Hay truyen subnetIp/netmask nho hon.`);
    }

    const hosts: string[] = [];
    for (let current = networkLong + 1; current < broadcastLong; current += 1) {
      hosts.push(this.longToIp(current));
    }

    return hosts;
  }

  private async runWithConcurrency<T, TResult>(
    items: T[],
    worker: (item: T) => Promise<TResult | null>,
    concurrency: number
  ): Promise<TResult[]> {
    const results: TResult[] = [];
    let index = 0;

    async function next() {
      while (index < items.length) {
        const current = items[index];
        index += 1;

        const result = await worker(current);
        if (result) results.push(result);
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(concurrency, items.length) }, () => next())
    );

    return results;
  }

  private ipToLong(ip: string): number {
    return ip
      .split('.')
      .reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
  }

  private longToIp(value: number): string {
    return [
      (value >>> 24) & 255,
      (value >>> 16) & 255,
      (value >>> 8) & 255,
      value & 255,
    ].join('.');
  }

  private assertIPv4(value: string, field: string): void {
    const parts = value.split('.');
    const valid = parts.length === 4 && parts.every((part) => {
      if (!/^\d{1,3}$/.test(part)) return false;
      const octet = Number(part);
      return octet >= 0 && octet <= 255;
    });

    if (!valid) {
      throw new ValidationError(`Field "${field}" phai la IPv4 hop le`);
    }
  }

  private positiveInteger(value: number | undefined, fallback: number): number {
    return value !== undefined && Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private normalizePorts(ports: number[] | undefined): number[] {
    const source = ports && ports.length > 0 ? ports : [...DEFAULT_PRINTER_PORTS];
    const unique = new Set<number>();

    for (const port of source) {
      if (Number.isInteger(port) && port > 0 && port <= 65535) {
        unique.add(port);
      }
    }

    if (unique.size === 0) {
      throw new ValidationError('Chua cau hinh port may in LAN hop le de quet');
    }

    return [...unique].sort((a, b) => a - b);
  }
}
