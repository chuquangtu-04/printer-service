import net from 'net';

export class NetworkPrinterDriver {
  constructor(
    private readonly host: string,
    private readonly port = 9100,
    private readonly timeoutMs = 5000
  ) {}

  async write(data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let settled = false;

      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        socket.destroy();

        if (error) {
          reject(error);
          return;
        }

        resolve();
      };

      socket.setTimeout(this.timeoutMs);

      socket.connect(this.port, this.host, () => {
        socket.write(data, (error) => {
          if (error) {
            finish(error);
            return;
          }

          socket.end();
        });
      });

      socket.on('close', (hadError) => {
        if (!hadError) finish();
      });

      socket.on('timeout', () => {
        finish(new Error(`Network printer timeout: ${this.host}:${this.port}`));
      });

      socket.on('error', (error) => {
        finish(error);
      });
    });
  }

  async testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let settled = false;

      const finish = (connected: boolean) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(connected);
      };

      socket.setTimeout(this.timeoutMs);
      socket.connect(this.port, this.host, () => finish(true));
      socket.on('timeout', () => finish(false));
      socket.on('error', () => finish(false));
    });
  }
}
