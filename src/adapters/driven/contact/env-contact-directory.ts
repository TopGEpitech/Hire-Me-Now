import type { ContactDirectory } from "@/core/application/ports";

// my phone numbers are NOT in this repo. bots scrape github all day.
// they come from env on the server, + only roles with contact:read ever see them
export class EnvContactDirectory implements ContactDirectory {
  constructor(private readonly env: { phone?: string; whatsapp?: string }) {}

  privateContact() {
    return { phone: this.env.phone || null, whatsapp: this.env.whatsapp || null };
  }
}
