// shape of the "trainer card". the data itself lives in an adapter (adapters/driven/content)
// so tomorrow it can come from a CMS without touching this file

export interface ProfileStat {
  key: string;
  label: string;
  value: number;
  receipt: string;
}

export interface ProfileMove {
  name: string;
  type: string;
  power: number;
  pp: number;
  text: string;
}

export interface TimelineEntry {
  from: string;
  to: string;
  role: string;
  org: string;
  place: string;
  text: string;
  tags?: string[];
}

export interface Matchup {
  problem: string;
  move: string;
  verdict: "super" | "normal";
  text: string;
}

export interface Profile {
  name: string;
  headline: string;
  location: string;
  photo: string;
  email: string;
  links: Array<{ label: string; href: string }>;
  pitch: string[];
  stats: ProfileStat[];
  moves: ProfileMove[];
  timeline: TimelineEntry[];
  skills: string[];
  languages: Array<{ name: string; level: string }>;
  hobbies: string[];
  matchups: Matchup[];
}

// never in the repo. comes from env, only for roles with contact:read
export interface PrivateContact {
  phone: string | null;
  whatsapp: string | null;
}
