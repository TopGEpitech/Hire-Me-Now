import type { AuditEntry, AuditLog } from "@/core/application/ports";

// ring buffer. no IPs, no user agents, just who (role) did what + if it passed.
// in prod at work this goes to structured logs, here memory is enough
export class MemoryAuditLog implements AuditLog {
  private entries: AuditEntry[] = [];

  constructor(private readonly max = 200) {}

  record(entry: AuditEntry) {
    this.entries.push(entry);
    if (this.entries.length > this.max) this.entries = this.entries.slice(-this.max);
  }

  recent(limit: number) {
    return this.entries.slice(-limit).reverse();
  }
}
