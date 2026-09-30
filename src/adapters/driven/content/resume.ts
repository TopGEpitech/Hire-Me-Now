import type { ProfileSource } from "@/core/application/ports";
import type { Profile } from "@/core/domain/profile/profile";

// my CV as data. want it from a CMS 1 day? write another ProfileSource, done
export const resume: Profile = {
  name: "Younes Kad",
  headline: "Lead dev. Full stack, TypeScript + JavaScript.",
  location: "Lyon, France. Looking for full remote.",
  photo: "/younes.png",
  email: "younes.kadi@epitech.eu",
  links: [
    { label: "Website", href: "https://www.youneskad.dev/" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/younes-k-b2927b261/" },
    { label: "GitHub", href: "https://github.com/TopGEpitech" },
  ],

  pitch: [
    "Ok, short version. I lead the dev side of a CRM at Free Energie, used by 1000s of clients + the people who work with them.",
    "I set the architecture, the code standards, the CI, the RBAC and the dashboards that yell at us when something breaks at 3am, and I still ship features myself bcs a lead who stops coding gets rusty fast.",
    "This site was a tiny Pokédex I made for fun. Now it's my pitch.",
    "Why? Bcs you'd rather poke at real code than read 1 more PDF. I would too.",
  ],

  stats: [
    {
      key: "arch",
      label: "Architecture",
      value: 118,
      receipt:
        "I define the architecture of the CRM at work. This repo runs on a hexagonal core too. Go look at /architecture.",
    },
    {
      key: "front",
      label: "Front-end",
      value: 112,
      receipt: "Angular with NgRx + RxJS at work. Next.js + React on the sales app. Tailwind, MUI, shadcn.",
    },
    {
      key: "back",
      label: "Back-end",
      value: 110,
      receipt: "Node with Express or AdonisJS (Lucid ORM). MongoDB, Postgres, Redis. KrakenD in front as the gateway.",
    },
    {
      key: "cloud",
      label: "Cloud / DevOps",
      value: 101,
      receipt:
        "Docker + Terraform. Cloud Run on GCP, some AWS. This repo: a Dockerfile CI builds + smoke tests, feature flags with a % canary, JSON logs with request ids.",
    },
    {
      key: "sec",
      label: "Security",
      value: 104,
      receipt:
        "RBAC, secrets, endpoint hardening, Auth0 + JWT. The API here has RBAC. Try to get my phone number without a code.",
    },
    {
      key: "team",
      label: "Team",
      value: 120,
      receipt:
        "Code reviews, PR templates (there's 1 in this repo), pair programming. I coached WoW players for 2 years before I coached devs. Same skill, trust me.",
    },
  ],

  moves: [
    {
      name: "Hexagon Guard",
      type: "architecture",
      power: 90,
      pp: 20,
      text: "Keeps business rules away from frameworks. Swap the DB or the UI + the core doesn't even notice.",
    },
    {
      name: "Pipeline Rush",
      type: "devops",
      power: 80,
      pp: 15,
      text: "Lint, tests, build, deploy on every push. Canary first. Small releases mean boring Fridays. Boring Fridays are the goal.",
    },
    {
      name: "Role Lock",
      type: "security",
      power: 85,
      pp: 10,
      text: "Every request says who it is. Every endpoint checks. Not on the list? Then no.",
    },
    {
      name: "Pair Up",
      type: "team",
      power: 70,
      pp: 30,
      text: "I sit next to the junior who's stuck + we fix it together. Next week they don't need me for it, which is kind of the whole point.",
    },
  ],

  timeline: [
    {
      from: "Jul 2025",
      to: "now",
      role: "CEO",
      org: "K-DEV Solutions",
      place: "Remote",
      text: "My own company. I build custom sites + apps for businesses that want to modernize how they work.",
    },
    {
      from: "Sep 2022",
      to: "now",
      role: "Lead Developer, TypeScript & JavaScript",
      org: "Free Energie",
      place: "Lyon",
      text: "I lead the architecture + dev of a CRM (Angular / Node) used by 1000s of clients. Built a Sales app with Next.js + AdonisJS too. CI/CD, feature flags, canary releases, alerting, structured logs, RBAC. I set it up, the team runs with it.",
      tags: ["Angular", "RxJS", "NgRx", "Node.js", "AdonisJS", "MongoDB", "Redis", "KrakenD", "GCP", "AWS", "Docker"],
    },
    {
      from: "2022",
      to: "2025",
      role: "Master's, Expert FullStack",
      org: "OpenClassrooms",
      place: "Paris",
      text: "Did it next to the full time job. Great for the brain, bad for the sleep.",
    },
    {
      from: "May 2022",
      to: "Jun 2022",
      role: "FullStack Node.js & React.js Developer",
      org: "mben dev",
      place: "Lyon",
      text: "MERN stack on digitalization projects. React on the front, Node on the back.",
      tags: ["MongoDB", "Express", "React", "Node.js"],
    },
    {
      from: "Nov 2020",
      to: "Nov 2022",
      role: "Esport Coach",
      org: "Blazing Boost Srl",
      place: "Remote",
      text: "I coached World of Warcraft players. Watch the fight, find the mistake, explain it so it sticks. Turns out code review is the same job.",
    },
    {
      from: "2020",
      to: "2022",
      role: "Bac +3, FullStack Web Developer",
      org: "Epitech",
      place: "Lyon",
      text: "Where I learned to code by breaking stuff. A lot of stuff.",
    },
  ],

  skills: [
    "TypeScript",
    "JavaScript",
    "Angular",
    "Next.js",
    "React",
    "Tailwind CSS",
    "shadcn/ui",
    "Node.js",
    "Express",
    "AdonisJS",
    "Lucid ORM",
    "MongoDB",
    "PostgreSQL",
    "Redis",
    "React Query",
    "React Hook Form",
    "Zod",
    "RxJS",
    "NgRx",
    "MUI",
    "KrakenD",
    "Auth0",
    "JWT / OAuth",
    "Google Cloud (Cloud Run)",
    "AWS",
    "Docker",
    "Terraform",
    "MinIO / S3",
    "Turborepo",
    "GitHub Actions",
    "ESLint / Prettier",
    "Jest",
    "React Testing Library",
  ],

  languages: [
    { name: "English", level: "Native" },
    { name: "French", level: "Native" },
    { name: "Arabic", level: "Native" },
    { name: "Russian", level: "Elementary" },
  ],

  hobbies: ["Brazilian Jiu-Jitsu", "Chess", "Learning languages"],

  matchups: [
    {
      problem: "Our codebase is a big ball of mud",
      move: "Hexagon Guard",
      verdict: "super",
      text: "Pull the business rules out first, put ports around them. After that you fix the rest 1 piece at a time. No big scary rewrite.",
    },
    {
      problem: "Anyone can hit any endpoint",
      move: "Role Lock",
      verdict: "super",
      text: "Roles, permissions, 1 policy file, deny by default. Plus an audit log so you know who tried what.",
    },
    {
      problem: "Deploys are scary",
      move: "Pipeline Rush",
      verdict: "super",
      text: "CI on every PR. Feature flags. Canary before everyone. You ship on a Friday + nobody panics.",
    },
    {
      problem: "Our juniors are stuck",
      move: "Pair Up",
      verdict: "super",
      text: "Pair sessions + reviews that explain the why, not just the what. I did this with WoW players for 2 years. Devs are easier, they don't rage quit.",
    },
    {
      problem: "Our team is spread across countries",
      move: "Polyglot",
      verdict: "super",
      text: "English, French + Arabic, all native. I've lived + worked in Morocco, Belgium, the UK and France. Remote across timezones is just normal for me.",
    },
    {
      problem: "We need it for yesterday",
      move: "Quick Attack",
      verdict: "normal",
      text: "I'm fast. Not magic tho. On day 1 I tell you what fits + what doesn't, not the night before the demo.",
    },
  ],
};

export const staticProfile: ProfileSource = { profile: () => resume };
