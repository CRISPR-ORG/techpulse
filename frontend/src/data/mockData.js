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

export const campusPulse = [
  {
    id: 1,
    type: "ANNOUNCEMENT",
    title: "Mid-semester exams postponed by one week",
    detail: "Academic office confirms new schedule. Check portal for updated timetable.",
    time: "30m ago",
    priority: "high"
  },
  {
    id: 2,
    type: "EVENT",
    title: "Guest lecture by ex-Google SDE on System Design",
    detail: "Auditorium B, 4:00 PM today. Open to all branches. Limited seats.",
    time: "1h ago",
    priority: "medium"
  },
  {
    id: 3,
    type: "NOTICE",
    title: "Hostel WiFi upgrade — 500 Mbps symmetric starting April",
    detail: "IT department completing fiber rollout. Expect brief outages tonight.",
    time: "3h ago",
    priority: "low"
  },
  {
    id: 4,
    type: "PLACEMENT",
    title: "Microsoft IDC shortlist released for SDE internship",
    detail: "42 students shortlisted. Pre-placement talk tomorrow at 2 PM.",
    time: "4h ago",
    priority: "high"
  },
  {
    id: 5,
    type: "SPORTS",
    title: "Inter-college cricket tournament — Semi-finals this weekend",
    detail: "Our team crushed NIT Warangal by 87 runs. Semifinals vs IIIT Hyderabad.",
    time: "6h ago",
    priority: "medium"
  },
  {
    id: 6,
    type: "RESEARCH",
    title: "Prof. Sharma's paper accepted at NeurIPS 2026",
    detail: "\"Sparse Attention Mechanisms for Edge Devices\" — makes us the only Indian college with 3 NeurIPS papers this year.",
    time: "8h ago",
    priority: "medium"
  },
  {
    id: 7,
    type: "CULTURAL",
    title: "Open mic night registrations closing in 2 hours",
    detail: "Poetry, standup, music — anything goes. Amphitheatre, 7 PM tonight.",
    time: "10h ago",
    priority: "low"
  }
];

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

export const fests = [
  {
    id: 1,
    name: "TECHNOVATE",
    tagline: "Where innovation meets insanity",
    date: "Feb 14-16, 2026",
    status: "COMPLETED",
    type: "TECH FEST",
    description: "The flagship technical festival. 72 hours of coding, robotics, CTFs, and pure chaos. 3000+ participants from 85 colleges.",
    events: [
      { name: "Code Wars", winner: "Team ByteForce", college: "IIIT-H", prize: "₹50,000" },
      { name: "Robo Sumo", winner: "Iron Pulse", college: "NIT-T", prize: "₹40,000" },
      { name: "CTF Championship", winner: "0xDEADBEEF", college: "BITS Pilani", prize: "₹35,000" },
      { name: "AI Art Gallery", winner: "Neural Canvas", college: "IIT-B", prize: "₹25,000" }
    ],
    highlight: "Record 3,247 participants. Keynote by Prateek Joshi (ex-NVIDIA)."
  },
  {
    id: 2,
    name: "AURORA",
    tagline: "Light up the campus",
    date: "Jan 24-26, 2026",
    status: "COMPLETED",
    type: "CULTURAL FEST",
    description: "Three nights of music, dance, drama, and art. Headlined by The Local Train. Footfall crossed 5000.",
    events: [
      { name: "Battle of Bands", winner: "Acoustic Paradox", college: "Our College", prize: "₹30,000" },
      { name: "Solo Dance", winner: "Priya Mehta", college: "NIT-W", prize: "₹15,000" },
      { name: "Stand-up Slam", winner: "Arjun Rao", college: "Our College", prize: "₹10,000" },
      { name: "Short Film Fest", winner: "Reel Rebels", college: "IIIT-D", prize: "₹20,000" }
    ],
    highlight: "The Local Train performed to 4,000+ crowd. Our band won Battle of Bands!"
  },
  {
    id: 3,
    name: "CONQUEST",
    tagline: "Dominate. Strategize. Conquer.",
    date: "Mar 7-9, 2026",
    status: "COMPLETED",
    type: "SPORTS FEST",
    description: "Inter-college sports championship across 12 disciplines. 40 colleges, 800+ athletes competing for glory.",
    events: [
      { name: "Cricket", winner: "Our College XI", college: "Our College", prize: "₹40,000" },
      { name: "Basketball", winner: "Slam Squad", college: "VIT", prize: "₹25,000" },
      { name: "Chess", winner: "Vikram Singh", college: "IIT-M", prize: "₹15,000" },
      { name: "E-Sports (Valorant)", winner: "NoScope", college: "Our College", prize: "₹30,000" }
    ],
    highlight: "We won the overall championship trophy for the 3rd consecutive year!"
  },
  {
    id: 4,
    name: "NEXUS",
    tagline: "Connect. Create. Disrupt.",
    date: "Apr 18-20, 2026",
    status: "UPCOMING",
    type: "TECH + CULTURAL",
    description: "The grand convergence — tech meets culture. Workshops by industry leaders, hackathon, concerts, and a startup expo.",
    events: [
      { name: "Startup Pitch", winner: "TBD", college: "—", prize: "₹1,00,000" },
      { name: "Design Sprint", winner: "TBD", college: "—", prize: "₹30,000" },
      { name: "Open Mic Night", winner: "TBD", college: "—", prize: "₹10,000" },
      { name: "Capture The Flag", winner: "TBD", college: "—", prize: "₹50,000" }
    ],
    highlight: "Early-bird registration open. Expected 5000+ footfall."
  }
];

export const clubs = [
  {
    id: 1,
    name: "ByteClub",
    type: "CODING",
    tagline: "Code. Compete. Conquer.",
    members: 187,
    description: "The competitive programming and development club. Weekly contests, mock interviews, and project sprints.",
    recentActivity: [
      "Hosted campus-wide DSA bootcamp — 200+ attended",
      "3 members selected for ICPC Asia Regionals",
      "Launched open-source contribution program"
    ],
    socials: { github: "#", twitter: "#", discord: "#" }
  },
  {
    id: 2,
    name: "CyberCell",
    type: "SECURITY",
    tagline: "Break things. Responsibly.",
    members: 94,
    description: "Cybersecurity and ethical hacking club. CTF competitions, vulnerability research, and security workshops.",
    recentActivity: [
      "Ranked #12 in PicoCTF 2026 — best in state",
      "Bug bounty workshop series completed",
      "Monthly \"Hack Night\" — live CTF practice"
    ],
    socials: { github: "#", twitter: "#", discord: "#" }
  },
  {
    id: 3,
    name: "AI/ML Guild",
    type: "AI/ML",
    tagline: "Training models. Training minds.",
    members: 156,
    description: "Research-focused AI/ML club. Paper readings, Kaggle competitions, and collaborative research projects.",
    recentActivity: [
      "Kaggle silver medal in Bengali text recognition",
      "Started reading group for transformer architectures",
      "Hosted \"ML from Scratch\" workshop series"
    ],
    socials: { github: "#", twitter: "#", discord: "#" }
  },
  {
    id: 4,
    name: "DesignLab",
    type: "DESIGN",
    tagline: "Pixels with purpose.",
    members: 72,
    description: "UI/UX and design thinking club. Figma workshops, design sprints, and portfolio building sessions.",
    recentActivity: [
      "Redesigned college website — live next month",
      "Adobe Creative Jam participation",
      "Weekly design critique sessions started"
    ],
    socials: { github: "#", twitter: "#", instagram: "#" }
  },
  {
    id: 5,
    name: "OpenForge",
    type: "OPEN SOURCE",
    tagline: "Fork it. Fix it. Ship it.",
    members: 63,
    description: "Open source contribution club. Hacktoberfest organizers, upstream contributors, and package maintainers.",
    recentActivity: [
      "15 PRs merged in major OSS projects this month",
      "Hosting local Hacktoberfest event",
      "New project: Campus app built in public"
    ],
    socials: { github: "#", twitter: "#", discord: "#" }
  }
];

export const socialFeed = [
  {
    id: 1,
    platform: "X",
    handle: "@techpulse_hub",
    content: "🚀 DEVSTORM is LIVE right now. 342 hackers. 48 hours. No sleep. Pure code.\n\nWatch the chaos unfold → link in bio\n\n#DevStorm2026 #Hackathon",
    time: "15m ago",
    likes: 234,
    retweets: 87
  },
  {
    id: 2,
    platform: "X",
    handle: "@techpulse_hub",
    content: "That moment when your team's demo breaks during judging but you debug it live on stage and it actually works better 🫡\n\n#HackathonLife",
    time: "2h ago",
    likes: 567,
    retweets: 142
  },
  {
    id: 3,
    platform: "X",
    handle: "@byteclub_campus",
    content: "3 of our members just made it to ICPC Asia Regionals.\n\nFrom grinding Codeforces at 2 AM to representing the college on the biggest stage.\n\nThe grind is real. The results are realer. 🏆",
    time: "5h ago",
    likes: 891,
    retweets: 234
  },
  {
    id: 4,
    platform: "X",
    handle: "@cybercell_sec",
    content: "Just found a reflected XSS in our own college portal.\n\nReported it. Got a \"thank you\" email.\n\nNo bounty. But the college WiFi seems faster now. Coincidence? 🤔\n\n#BugBounty #EthicalHacking",
    time: "8h ago",
    likes: 1243,
    retweets: 387
  },
  {
    id: 5,
    platform: "X",
    handle: "@techpulse_hub",
    content: "NEXUS 2026 dates announced: April 18-20\n\nTech + Cultural. Workshops + Concerts. Startups + Stand-up.\n\nEarly bird registration now open. Don't sleep on this. 🎪",
    time: "1d ago",
    likes: 432,
    retweets: 156
  }
];

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
