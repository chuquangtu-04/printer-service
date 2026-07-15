import { BaseBuilder } from './BaseBuilder';
import { EscposCommands as C } from './EscposCommands';

export class TestBuilder extends BaseBuilder<undefined> {
  protected validate(_data: undefined): void {
    // Test print không cần dữ liệu đầu vào
  }

  protected renderBody(_data: undefined): Buffer {
    return Buffer.concat([
      C.ALIGN_CENTER,
      C.line('*'),
      C.text('\nTEST PRINT\n\n'),
      C.line('*'),
    ]);
  }
}
