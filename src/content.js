// Single source of truth for the resume. Book pages, the link dock and the
// hidden screen-reader version are all generated from this file.

export const RESUME_PDF = '/praveen-bajpai-resume.pdf'

export const profile = {
  name: 'Praveen Bajpai',
  tagline: 'Agentic AI · Backends · Web',
  intro:
    "I'm an Electronics & Communication undergrad at IIIT Naya Raipur who likes building things end to end — agentic AI pipelines, backends that hold up in production, and fast, typography-first web products.",
  facts: [
    ['Studying', 'B.Tech ECE, IIIT Naya Raipur (2024 – 2028)'],
    ['CGPA', '8.82 / 10'],
    ['Last role', 'AI Research Intern, Samsung R&D Institute India'],
    ['Practice', '750+ problems on LeetCode, Codeforces & GfG'],
  ],
  // shorter versions for the book's About page
  pageFacts: [
    ['Studying', 'B.Tech ECE · IIIT Naya Raipur'],
    ['CGPA', '8.82 / 10'],
    ['Last role', 'AI Research Intern, Samsung R&D'],
    ['Practice', '750+ DSA problems solved'],
  ],
  email: 'praveen24101@iiitnr.edu.in',
  links: [
    { label: 'Email', value: 'praveen24101@iiitnr.edu.in', href: 'mailto:praveen24101@iiitnr.edu.in', icon: 'mail' },
    { label: 'LinkedIn', value: 'in/praveen-bajpai', href: 'https://www.linkedin.com/in/praveen-bajpai-302bb0270/', icon: 'linkedin' },
    { label: 'GitHub', value: 'PraveenBajpai123', href: 'https://github.com/PraveenBajpai123', icon: 'github' },
    { label: 'LeetCode', value: 'u/praveen1982', href: 'https://leetcode.com/u/praveen1982/', icon: 'leetcode' },
    { label: 'Codeforces', value: 'crucious', href: 'https://codeforces.com/profile/crucious', icon: 'codeforces' },
  ],
}

// `icon` keys refer to src/lib/icons.js. Groups without icons render as text chips.
const sk = (name, icon) => ({ name, icon })
export const skills = [
  { group: 'Languages', items: [sk('C++', 'cpp'), sk('Python', 'python'), sk('JavaScript', 'javascript'), sk('TypeScript', 'typescript'), sk('C', 'c'), sk('SQL', 'sql')] },
  { group: 'Frameworks', items: [sk('React', 'react'), sk('Next.js', 'nextjs'), sk('Node.js', 'nodejs'), sk('Express', 'express'), sk('Flask', 'flask'), sk('FastAPI', 'fastapi')] },
  { group: 'AI & Data', items: [sk('Claude API', 'claude'), sk('Agentic AI', 'agent'), sk('RAG', 'rag'), sk('MCP', 'mcp'), sk('TensorFlow.js', 'tensorflow'), sk('Prisma', 'prisma'), sk('PostgreSQL', 'postgresql'), sk('Neo4j', 'neo4j')] },
  { group: 'Tools', items: [sk('Git', 'git'), sk('FFmpeg', 'ffmpeg'), sk('AWS Lambda', 'lambda'), sk('Vercel', 'vercel'), sk('VS Code', 'vscode')] },
  { group: 'Core', items: [sk('DSA'), sk('OOP'), sk('DBMS'), sk('Operating Systems'), sk('REST APIs')] },
]

export const experience = [
  {
    company: 'Samsung R&D Institute India',
    role: 'AI Research Intern — Agentic AI & LLM Systems',
    where: 'India',
    when: 'Dec 2025 – Jan 2026',
    stats: [
      ['92%', 'faster design → code'],
      ['~90%', 'lower monthly cost'],
    ],
    bullets: [
      'Built an end-to-end agentic AI pipeline (Claude Agent SDK + FastAPI) that turns Figma designs into production-ready React + TypeScript components, with 100% build success.',
      'Integrated LLM agents with the frontend over REST for task automation and decision-making; worked hands-on with MCP servers and RAG pipelines in production.',
      'Ran model evaluation and experiments; replaced local GPU inference with cloud LLMs behind a LiteLLM proxy.',
    ],
    tags: ['Claude Agent SDK', 'FastAPI', 'MCP', 'RAG', 'LiteLLM', 'React + TS'],
    logo: 'samsung',
    // tighter wording for the book page (the full bullets above go to the accessible version)
    page: [
      'Built an agentic pipeline (Claude Agent SDK + FastAPI) that turns Figma designs into production React + TypeScript — with 100% build success.',
      'Wired LLM agents into the frontend over REST, working with MCP servers and RAG pipelines in production.',
      'Ran model evaluations and moved local GPU inference to cloud LLMs behind a LiteLLM proxy.',
    ],
    stackIcons: ['claude', 'fastapi', 'mcp', 'rag', 'react', 'typescript'],
  },
  {
    company: 'Rootvestors',
    role: 'Backend Developer Intern',
    where: 'Remote',
    when: 'Jun 2025 – Nov 2025',
    stats: [
      ['20+', 'REST endpoints'],
      ['140+', 'subtopics in a graph'],
    ],
    bullets: [
      'Built the backend of an adaptive learning platform for NCERT Chemistry (Classes 11 & 12) with Node.js, TypeScript and Express, serving AI-personalised lessons via the Claude API.',
      'Designed a dual-database architecture: PostgreSQL (Neon) + Prisma for students and quizzes, and a Neo4j knowledge graph of 28 chapters modelling prerequisites.',
      'Implemented EMA-based mastery tracking, quiz scoring, a 0.6-mastery unlock gate, Zod validation and per-student rate limiting.',
    ],
    tags: ['Node.js', 'TypeScript', 'Express', 'PostgreSQL', 'Prisma', 'Neo4j', 'Zod'],
    logo: null,
    page: [
      'Backend for an adaptive NCERT Chemistry platform (Classes 11–12), serving AI-personalised lessons via the Claude API.',
      'Dual database: PostgreSQL (Neon) + Prisma for students and quizzes, and a Neo4j graph of 28 chapters and their prerequisites.',
      'EMA mastery tracking, a 0.6-mastery unlock gate, Zod validation and per-student rate limiting.',
    ],
    stackIcons: ['nodejs', 'typescript', 'express', 'postgresql', 'prisma', 'neo4j', 'zod', 'claude'],
  },
]

export const projects = [
  {
    name: 'The CinePrism',
    kind: 'Film criticism journal',
    stack: ['Next.js', 'React', 'Tailwind CSS', 'Vercel'],
    stat: ['10,000+', 'monthly visitors'],
    bullets: [
      'A full-stack editorial journal for film reviews, essays and curated lists.',
      'End-to-end SEO — canonical URLs, OpenGraph / Twitter cards and semantic markup — with a long-form, typography-first reading experience.',
      'Fast, fully responsive, statically generated pages with optimised asset loading.',
    ],
    link: { label: 'thecineprism.com', href: 'https://thecineprism.com' },
    page: [
      'An editorial journal for film reviews, essays and curated lists, built for long-form reading.',
      'End-to-end SEO: canonical URLs, OpenGraph and Twitter cards, semantic markup.',
      'Statically generated, fully responsive pages with optimised asset loading.',
    ],
    stackIcons: ['nextjs', 'react', 'tailwind', 'vercel'],
  },
  {
    name: 'AI Image & Video Editor',
    kind: 'In-browser media editing',
    stack: ['Next.js', 'Python', 'TensorFlow.js', 'FFmpeg', 'AWS Lambda'],
    stat: ['In-browser', 'ML inference'],
    bullets: [
      'Background removal plus object and face detection with in-browser TensorFlow.js inference.',
      'Real-time filter previews and colour grading; video trimming, merging and quality-configurable exports powered by FFmpeg.',
      'Heavy processing offloaded to Python + AWS Lambda jobs so the Next.js UI stays responsive during exports.',
    ],
    link: null,
    page: [
      'Background removal, plus object and face detection, running in the browser with TensorFlow.js.',
      'Live filter previews and colour grading; trim, merge and export video with FFmpeg.',
      'Heavy processing offloaded to Python on AWS Lambda so the UI stays responsive.',
    ],
    stackIcons: ['nextjs', 'python', 'tensorflow', 'ffmpeg', 'lambda'],
  },
]

export const education = [
  { school: 'IIIT Naya Raipur', detail: 'B.Tech, Electronics & Communication', when: '2024 – 2028', score: 'CGPA 8.82 / 10' },
  { school: 'Lucknow Public School', detail: 'Class XII · Class X', when: '2023 · 2021', score: '90% · 95%' },
]

export const achievements = [
  ['98 percentile', 'JEE Mains, among 1.2 million+ candidates'],
  ['CRL 14,000', 'JEE Advanced'],
  ['750+ problems', 'LeetCode, Codeforces & GfG — DP, graphs, trees, greedy'],
  ['ATF 2025', 'Selected for analytical & problem-solving skills'],
]

// The four open spreads (after the cover), in reading order.
export const spreads = [
  { id: 'about', chapter: 'About', title: 'About & Tech stack' },
  { id: 'experience', chapter: 'Experience', title: 'Experience' },
  { id: 'projects', chapter: 'Projects', title: 'Projects' },
  { id: 'contact', chapter: 'Contact', title: 'Education & Contact' },
]

// Links shown in the bottom dock for each spread (index 0 = closed book).
export const dockLinks = [
  [],
  profile.links.slice(0, 3),
  [],
  projects.filter((p) => p.link).map((p) => ({ label: p.link.label, href: p.link.href })),
  [profile.links[0], profile.links[1], profile.links[2], { label: 'Resume PDF', href: RESUME_PDF, download: true }],
]

// First page (landing): a single profile card. Edit freely.
export const landing = {
  role: 'Agentic AI · Backend · Full-stack',
  summary: 'ECE at IIIT Naya Raipur. Previously AI Research Intern at Samsung R&D.',
  location: 'Naya Raipur, India',
  timeZone: 'Asia/Kolkata',
  availability: 'Open to internships & collaborations', // ← change if this isn't right
  photo: '/photo.jpg', // drop your photo at public/photo.jpg
}
