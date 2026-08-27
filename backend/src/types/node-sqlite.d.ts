// Minimal ambient typings for Node's built-in `node:sqlite` module, covering only
// the surface this project uses. Declared locally rather than depending on a
// specific @types/node version shipping these (support varies by version).
declare module 'node:sqlite' {
  export interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }

  export class StatementSync {
    run(...params: unknown[]): StatementResultingChanges;
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
  }

  export interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
  }

  export class DatabaseSync {
    constructor(location: string, options?: DatabaseSyncOptions);
    open(): void;
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
}
