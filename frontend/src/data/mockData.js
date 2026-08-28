// ═══════════════════════════════════════════════════════════
// TECHPULSE — MOCK DATA
// ═══════════════════════════════════════════════════════════

export const techNews = [
  {
    id: 1,
    category: "AI",
    tag: "BREAKING",
    title: "GPT-5 Drops: Reasoning Benchmarks Shattered",
    source: "TechCrunch",
    time: "2h ago",
    description: "OpenAI's latest model demonstrates unprecedented reasoning capabilities, scoring 94.2% on ARC-AGI. The AI community is divided on implications.",
    url: "#"
  },
  {
    id: 2,
    category: "OPEN SOURCE",
    tag: "TRENDING",
    title: "Rust Surpasses C++ in Systems Programming Adoption",
    source: "The Verge",
    time: "5h ago",
    description: "For the first time, Rust has overtaken C++ in new systems-level projects. Memory safety wins the decade-long debate.",
    url: "#"
  },
  {
    id: 3,
    category: "SECURITY",
    tag: "CRITICAL",
    title: "Zero-Day in Linux Kernel Affects 78% of Servers",
    source: "Ars Technica",
    time: "8h ago",
    description: "CVE-2026-1337 allows privilege escalation on unpatched systems. Emergency patches rolling out across major distros.",
    url: "#"
  },
  {
    id: 4,
    category: "WEB",
    tag: "NEW",
    title: "Bun 2.0 Released: 3x Faster Than Node.js",
    source: "Hacker News",
    time: "12h ago",
    description: "Bun's major release brings native TypeScript compilation, built-in test runner, and package manager — all in one binary.",
    url: "#"
  },
  {
    id: 5,
    category: "HARDWARE",
    tag: "LAUNCH",
    title: "NVIDIA Blackwell Ultra GPUs Now Shipping to Labs",
    source: "Wired",
    time: "1d ago",
    description: "The B300 Ultra packs 288GB HBM3e memory. Research labs worldwide are racing to benchmark the new silicon.",
    url: "#"
  },
  {
    id: 6,
    category: "BLOCKCHAIN",
    tag: "UPDATE",
    title: "Ethereum's Pectra Upgrade Goes Live on Mainnet",
    source: "CoinDesk",
    time: "1d ago",
    description: "EIP-7702 introduces account abstraction natively, potentially eliminating the need for seed phrases forever.",
    url: "#"
  }
];

export const campusPulse = [];

export const hackathons = [
  {
    id: 1,
    name: "DEVSTORM 2026",
    status: "LIVE",
    tagline: "48 hours. No rules. Ship or sink.",
    date: "Mar 28-30, 2026",
    prize: "₹5,00,000",
    teamSize: "2-4",
    participants: 342,
    themes: ["AI/ML", "Web3", "DevTools", "Open Innovation"],
    registrationUrl: "#",
    countdown: { days: 0, hours: 14, minutes: 32 }
  },
  {
    id: 2,
    name: "HACKNITR 7.0",
    status: "UPCOMING",
    tagline: "Build. Break. Rebuild. Repeat.",
    date: "Apr 12-14, 2026",
    prize: "₹3,00,000",
    teamSize: "3-5",
    participants: 189,
    themes: ["HealthTech", "EdTech", "Sustainability", "FinTech"],
    registrationUrl: "#",
    countdown: { days: 15, hours: 0, minutes: 0 }
  },
  {
    id: 3,
    name: "CODE.EXE",
    status: "UPCOMING",
    tagline: "Where algorithms meet adrenaline.",
    date: "Apr 25-26, 2026",
    prize: "₹2,00,000",
    teamSize: "1-3",
    participants: 97,
    themes: ["Competitive Programming", "System Design", "CTF"],
    registrationUrl: "#",
    countdown: { days: 28, hours: 0, minutes: 0 }
  },
  {
    id: 4,
    name: "BUILDATHON '25",
    status: "ENDED",
    tagline: "Last year's madness. Legendary builds.",
    date: "Nov 18-20, 2025",
    prize: "₹4,00,000",
    teamSize: "2-4",
    participants: 512,
    themes: ["Open Source", "AI", "IoT", "Cybersecurity"],
    registrationUrl: null,
    winners: [
      { place: "1st", team: "NullPointers", project: "AetherDB — Distributed DB in Rust" },
      { place: "2nd", team: "SegFault", project: "Ghostline — Anonymous Campus Chat" },
      { place: "3rd", team: "sudo rm -rf", project: "EdgeML — On-device ML compiler" }
    ]
  }
];

export const opportunities = [
  {
    id: "JOB_01",
    type: "INTERNSHIP",
    company: "Google",
    role: "SDE Intern — Search Infrastructure",
    location: "Bangalore",
    mode: "ON-SITE",
    stipend: "₹1,20,000/mo",
    deadline: "Apr 5, 2026",
    tags: ["C++", "Distributed Systems", "Go"],
    applyUrl: "#"
  },
  {
    id: "JOB_02",
    type: "INTERNSHIP",
    company: "Stripe",
    role: "Backend Engineering Intern",
    location: "Remote (US)",
    mode: "REMOTE",
    stipend: "$9,500/mo",
    deadline: "Apr 10, 2026",
    tags: ["Ruby", "APIs", "Payments"],
    applyUrl: "#"
  },
  {
    id: "JOB_03",
    type: "FULL-TIME",
    company: "Razorpay",
    role: "Platform Engineer",
    location: "Bangalore",
    mode: "HYBRID",
    stipend: "₹22-28 LPA",
    deadline: "Apr 15, 2026",
    tags: ["Kubernetes", "Go", "AWS"],
    applyUrl: "#"
  },
  {
    id: "JOB_04",
    type: "INTERNSHIP",
    company: "DeepMind",
    role: "Research Intern — Reinforcement Learning",
    location: "London",
    mode: "ON-SITE",
    stipend: "£5,000/mo",
    deadline: "Apr 20, 2026",
    tags: ["Python", "PyTorch", "RL"],
    applyUrl: "#"
  },
  {
    id: "JOB_05",
    type: "FULL-TIME",
    company: "Zerodha",
    role: "Systems Programmer",
    location: "Bangalore",
    mode: "ON-SITE",
    stipend: "₹18-25 LPA",
    deadline: "Apr 8, 2026",
    tags: ["Rust", "Low Latency", "Linux"],
    applyUrl: "#"
  },
  {
    id: "JOB_06",
    type: "FREELANCE",
    company: "Open Source Collective",
    role: "OSS Contributor — Rust Compiler",
    location: "Remote",
    mode: "REMOTE",
    stipend: "$3,000 bounty",
    deadline: "Rolling",
    tags: ["Rust", "Compilers", "LLVM"],
    applyUrl: "#"
  }
];

export const fests = [];

export const clubs = [];

export const socialFeed = [];

export const terminalLines = [
  { prompt: "$ docker ps --format \"table {{.Names}}\\t{{.Status}}\\t{{.Ports}}\"", type: "command" },
  { text: "", type: "blank" },
  { text: "techpulse-api     Up 127 days  :3000", type: "output", color: "green" },
  { text: "news-scraper      Up 127 days  :8080  // never sleeps", type: "output", color: "green" },
  { text: "redis-cache       Up 127 days  :6379", type: "output", color: "green" },
  { text: "postgres-db       Up 400 days  :5432", type: "output", color: "green" },
  { text: "nginx-proxy       Up 400 days  :443", type: "output", color: "green" },
  { text: "", type: "blank" },
  { prompt: "$ df -h", type: "command" },
  { text: "Filesystem  Size  Used  Avail  Use%", type: "output", color: "dim" },
  { text: "/dev/sda1   8.0T  3.1T  4.9T   39%  // yours to fill", type: "output", color: "green" },
  { text: "", type: "blank" },
  { prompt: "$ uptime", type: "command" },
  { text: "17:35:24 up 127 days, load average: 0.42, 0.38, 0.31", type: "output", color: "dim" },
];

export const tickerItems = [
  "DEVSTORM 2026 IS LIVE",
  "GPT-5 JUST DROPPED",
  "HACKNITR REGISTRATIONS OPEN",
  "RUST OVERTAKES C++",
  "NEXUS FEST APR 18-20",
  "MICROSOFT SHORTLIST OUT",
  "ZERO-DAY IN LINUX KERNEL",
  "ICPC REGIONALS CONFIRMED",
  "KAGGLE SILVER MEDAL",
  "BUN 2.0 IS HERE",
  "CAMPUS WIFI UPGRADED TO 500 MBPS",
  "OPEN MIC TONIGHT 7 PM"
];
