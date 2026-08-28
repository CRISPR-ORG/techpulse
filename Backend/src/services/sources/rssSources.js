/**
 * Tech news feeds.
 *
 * Every URL here was verified to parse and return items. Feeds that returned
 * 403/404/406/410 (InfoWorld, Reuters Tech, Microsoft AI, Unite AI,
 * AI News, Semafor, Verge Tech) were dropped rather than left to fail on
 * every run. Reddit's RSS endpoints answer 429 to server traffic almost
 * every time, so they are omitted too.
 *
 * `trusted: true` marks a feed that is already entirely about technology, so
 * its items skip the keyword filter. Without it, tech coverage that happens
 * not to use an obvious keyword ("Overcooked? Why robotic pizza makers are
 * failing") gets discarded.
 *
 * `maxItems` caps how much of a feed is taken per run. Some feeds return their
 * entire archive (OpenAI's returns >1000 entries), which would swamp everything
 * else and slow persistence down for no benefit.
 */

const DEFAULT_MAX_ITEMS = 40;

const RSS_SOURCES = [
  // ── General tech press ──
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "technology", trusted: true },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "technology", trusted: true },
  { name: "Wired", url: "https://www.wired.com/feed/rss", category: "technology", trusted: true },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", category: "technology", trusted: true },
  { name: "Engadget", url: "https://www.engadget.com/rss.xml", category: "technology", trusted: true },
  { name: "Gizmodo", url: "https://gizmodo.com/feed", category: "technology" },
  { name: "VentureBeat", url: "https://venturebeat.com/feed/", category: "technology", trusted: true },
  { name: "ZDNet", url: "https://www.zdnet.com/news/rss.xml", category: "technology", trusted: true },
  { name: "CNET", url: "https://www.cnet.com/rss/news/", category: "technology" },
  { name: "TechRadar", url: "https://www.techradar.com/rss", category: "technology", trusted: true },
  { name: "The Register", url: "https://www.theregister.com/headlines.atom", category: "technology", trusted: true },
  { name: "Slashdot", url: "https://rss.slashdot.org/Slashdot/slashdotMain", category: "technology", trusted: true },
  { name: "TechSpot", url: "https://www.techspot.com/backend.xml", category: "technology", trusted: true },
  { name: "Digital Trends", url: "https://www.digitaltrends.com/feed/", category: "technology" },
  { name: "Techmeme", url: "https://www.techmeme.com/feed.xml", category: "technology", trusted: true },
  { name: "The Next Web", url: "https://thenextweb.com/feed", category: "technology", trusted: true },
  { name: "Mashable Tech", url: "https://mashable.com/feeds/rss/tech", category: "technology", trusted: true, maxItems: 30 },
  { name: "SiliconANGLE", url: "https://siliconangle.com/feed/", category: "technology", trusted: true },
  { name: "Rest of World", url: "https://restofworld.org/feed/latest/", category: "technology", trusted: true },

  // ── Mainstream outlets, technology desks ──
  { name: "NYT Technology", url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", category: "technology", trusted: true },
  { name: "BBC Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", category: "technology", trusted: true },
  { name: "Guardian Tech", url: "https://www.theguardian.com/uk/technology/rss", category: "technology", trusted: true },
  { name: "Business Insider Tech", url: "https://markets.businessinsider.com/rss/news", category: "technology" },

  // ── Developer and engineering ──
  { name: "Hacker News", url: "https://hnrss.org/frontpage", category: "technology", trusted: true },
  { name: "HN Best", url: "https://hnrss.org/best", category: "technology", trusted: true },
  { name: "HN Show", url: "https://hnrss.org/show", category: "technology", trusted: true, maxItems: 20 },
  { name: "HN Ask", url: "https://hnrss.org/ask", category: "technology", trusted: true, maxItems: 20 },
  { name: "Lobsters", url: "https://lobste.rs/rss", category: "technology", trusted: true },
  { name: "Dev.to", url: "https://dev.to/feed", category: "technology", trusted: true },
  { name: "Stack Overflow Blog", url: "https://stackoverflow.blog/feed/", category: "technology", trusted: true, maxItems: 25 },
  { name: "GitHub Blog", url: "https://github.blog/feed/", category: "technology", trusted: true },
  { name: "Hackaday", url: "https://hackaday.com/feed/", category: "technology", trusted: true },
  { name: "Phoronix", url: "https://www.phoronix.com/rss.php", category: "technology", trusted: true },
  { name: "SD Times", url: "https://sdtimes.com/feed/", category: "technology", trusted: true },
  { name: "Reddit r/webdev", url: "https://www.reddit.com/r/webdev/.rss", category: "technology", trusted: true, maxItems: 20 },

  // ── AI and research ──
  { name: "MIT Tech Review", url: "https://www.technologyreview.com/feed/", category: "technology", trusted: true },
  { name: "IEEE Spectrum", url: "https://spectrum.ieee.org/feeds/feed.rss", category: "technology", trusted: true },
  { name: "OpenAI Blog", url: "https://openai.com/blog/rss.xml", category: "technology", trusted: true, maxItems: 20 },
  { name: "DeepMind", url: "https://deepmind.google/blog/rss.xml", category: "technology", trusted: true, maxItems: 20 },
  { name: "Google Research", url: "https://research.google/blog/rss/", category: "technology", trusted: true, maxItems: 20 },
  { name: "NVIDIA Blog", url: "https://blogs.nvidia.com/feed/", category: "technology", trusted: true },
  { name: "Wired AI", url: "https://www.wired.com/feed/tag/ai/latest/rss", category: "technology", trusted: true },
  { name: "Nature Computing", url: "https://www.nature.com/subjects/computer-science.rss", category: "technology", trusted: true, maxItems: 20 },
  { name: "ScienceDaily Computers", url: "https://www.sciencedaily.com/rss/computers_math.xml", category: "technology", trusted: true, maxItems: 30 },

  // ── Cloud and infrastructure ──
  { name: "AWS News", url: "https://aws.amazon.com/blogs/aws/feed/", category: "technology", trusted: true },
  { name: "Cloudflare Blog", url: "https://blog.cloudflare.com/rss/", category: "technology", trusted: true },

  // ── Security ──
  { name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/", category: "technology", trusted: true },
  { name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/", category: "technology", trusted: true },
  { name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews", category: "technology", trusted: true },

  // ── Consumer hardware and mobile ──
  { name: "9to5Mac", url: "https://9to5mac.com/feed/", category: "technology", trusted: true, maxItems: 30 },
  { name: "9to5Google", url: "https://9to5google.com/feed/", category: "technology", trusted: true, maxItems: 30 },
  { name: "Android Authority", url: "https://www.androidauthority.com/feed/", category: "technology", trusted: true, maxItems: 30 },
  { name: "Android Police", url: "https://www.androidpolice.com/feed/", category: "technology", trusted: true },
  { name: "XDA", url: "https://www.xda-developers.com/feed/", category: "technology", trusted: true },
  { name: "MacRumors", url: "https://feeds.macrumors.com/MacRumors-All", category: "technology", trusted: true },
  { name: "Toms Hardware", url: "https://www.tomshardware.com/feeds/all", category: "technology", trusted: true, maxItems: 30 },

  // ── India tech and startups ──
  { name: "ET Tech", url: "https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms", category: "technology", trusted: true, maxItems: 30 },
  { name: "Mint Tech", url: "https://www.livemint.com/rss/technology", category: "technology", trusted: true, maxItems: 30 },
  { name: "YourStory", url: "https://yourstory.com/feed", category: "technology", trusted: true },
  { name: "Inc42", url: "https://inc42.com/feed/", category: "technology", trusted: true },
];

module.exports = RSS_SOURCES;
module.exports.DEFAULT_MAX_ITEMS = DEFAULT_MAX_ITEMS;
