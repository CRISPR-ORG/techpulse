const TECH_INCLUDES = [
  // Core computing and software
  "tech", "technology", "software", "hardware", "firmware", "algorithm", "algorithms",
  "developer", "developers", "programmer", "programmers", "programming", "coding",
  "code", "codebase", "debugging", "compiler", "runtime", "devops", "sysadmin",
  "git", "github", "gitlab", "bitbucket", "repository", "open source", "opensource",
  "kernel", "linux", "ubuntu", "debian", "arch", "macos", "windows 11", "android",
  "ios", "ipados", "chromeos",

  // AI & Machine Learning
  "ai", "artificial intelligence", "machine learning", "deep learning", "neural network",
  "neural networks", "llm", "llms", "gpt", "gpt-4", "gpt-5", "chatgpt", "openai",
  "anthropic", "claude", "gemini", "copilot", "mistral", "llama", "deepseek",
  "transformer", "diffusion model", "genai", "generative ai", "computer vision",
  "nlp", "natural language processing", "reinforcement learning", "agi",

  // Cloud & Infrastructure & Databases
  "cloud", "aws", "amazon web services", "azure", "gcp", "google cloud",
  "serverless", "lambda", "kubernetes", "k8s", "docker", "container", "containers",
  "database", "databases", "sql", "nosql", "postgres", "postgresql", "mysql",
  "mongodb", "redis", "supabase", "firebase", "sqlite", "graphql", "rest api",
  "microservices", "backend", "frontend", "fullstack",

  // Languages & Frameworks & Web
  "javascript", "typescript", "python", "rust", "golang", "c\\+\\+", "c#", "java",
  "react", "reactjs", "nextjs", "vue", "angular", "svelte", "tailwind", "node\\.js",
  "nodejs", "express", "django", "fastapi", "flask", "spring boot",

  // Hardware, Semiconductors & Devices
  "chip", "chips", "semiconductor", "semiconductors", "microprocessor", "transistor",
  "gpu", "gpus", "cpu", "cpus", "tpu", "npu", "nvidia", "intel", "amd", "tsmc",
  "qualcomm", "arm", "broadcom", "mediatek", "blackwell", "hopper", "rtx",
  "smartphone", "smartphones", "iphone", "pixel", "galaxy", "macbook", "ipad",
  "gadget", "gadgets", "wearable", "smartwatch", "robotics", "robot", "robots",
  "drone", "drones", "quantum computing", "quantum", "supercomputer",

  // Cybersecurity
  "cybersecurity", "infosec", "hacker", "hackers", "hacking", "malware", "ransomware",
  "spyware", "phishing", "vulnerability", "cve", "zero-day", "exploit", "encryption",
  "firewall", "data breach", "pen testing",

  // Web3 & Blockchain & Networks
  "blockchain", "web3", "crypto", "cryptocurrency", "bitcoin", "ethereum",
  "solana", "smart contract", "defi", "5g", "6g", "wifi", "broadband", "satellite internet",

  // Tech Companies & Ecosystem
  "google", "apple", "microsoft", "meta", "alphabet", "amazon", "tesla",
  "spacex", "y combinator", "startup", "startups", "venture capital", "silicon valley",
  "fintech", "biotech", "edtech", "saas", "b2b", "api", "apis", "sdk"
];

const NON_TECH_EXCLUDES = [
  // Sports
  "cricket", "football", "soccer", "basketball", "nba", "nfl", "ipl", "premier league",
  "world cup", "olympics", "tennis", "golf", "athletics", "formula 1", "f1 race",
  "touchdown", "quarterback", "super bowl",

  // Celebrity & Entertainment Gossip
  "celebrity", "bollywood", "hollywood", "actor", "actress", "box office",
  "oscars", "grammys", "emmys", "paparazzi", "dating", "divorce", "dating rumors",
  "reality tv", "red carpet",

  // Politics & War (when devoid of tech policy context)
  "election poll", "senate vote", "congressional hearing", "parliament session",
  "prime minister", "biden administration", "trump rally", "democrat party",
  "republican party", "ceasefire agreement", "peace talks", "military airstrike",
  "missile strike", "casualty toll", "homicide", "murder trial",

  // Disasters / Accidents
  "earthquake epicenter", "deadly flood", "hurricane category", "tornado warning",
  "plane crash", "fatal car accident"
];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTokenRegex(words) {
  const patterns = words.map((w) => {
    if (w.includes(" ") || w.includes("-") || w.includes("\\")) {
      return `(?:^|\\W)${w}(?:\\W|$)`;
    }
    return `\\b${escapeRegex(w)}\\b`;
  });
  return new RegExp(patterns.join("|"), "i");
}

const techPattern = buildTokenRegex(TECH_INCLUDES);
const nonTechPattern = buildTokenRegex(NON_TECH_EXCLUDES);

/**
 * Checks whether an article is strictly tech-related.
 * Uses regex word boundaries to prevent false positives on substrings.
 */
function isTechArticle(article = {}) {
  if (!article) return false;

  const category = String(article.category || "").toLowerCase();
  if (category === "campus-pulse") {
    return false;
  }

  const title = String(article.title || "");
  const description = String(article.description || article.content || article.contentSnippet || "");
  const url = String(article.url || article.link || "");
  const source = String(article.source || article.source_name || "");

  const fullText = `${title} ${description} ${url} ${source}`.toLowerCase();

  const hasNonTech = nonTechPattern.test(fullText);
  if (hasNonTech) {
    return false;
  }

  const hasTech = techPattern.test(fullText);
  return hasTech;
}

module.exports = {
  isTechArticle,
  TECH_INCLUDES,
  NON_TECH_EXCLUDES,
};
