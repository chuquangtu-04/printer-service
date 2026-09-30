import { BaseBuilder } from './BaseBuilder';
import { EscposCommands as C } from './EscposCommands';

export interface TestPrintData {
  title?: string;
  lines?: string[];
}

export class TestBuilder extends BaseBuilder<TestPrintData | undefined> {
  protected validate(_data: TestPrintData | undefined): void {}

  protected renderBody(data: TestPrintData | undefined): Buffer {
    const title = data?.title ?? 'TEST PRINT';
    const lines = data?.lines ?? [];

    return Buffer.concat([
      C.ALIGN_CENTER,
      C.line('*'),
      C.text(`\n${title}\n\n`),
      ...lines.map((line) => C.text(`${line}\n`)),
      lines.length > 0 ? C.FEED(1) : Buffer.alloc(0),
      C.line('*'),
    ]);
  }
}
