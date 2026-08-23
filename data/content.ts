// ─────────────────────────────────────────────────────────────────
// EDIT THIS FILE to update the default portfolio content.
// Values saved from /admin/settings override these at runtime.
// ─────────────────────────────────────────────────────────────────

import { SocialLink } from "@/lib/types";

export interface SkillGroup {
  title: string;
  icon: string;
  skills: { name: string; level: string }[];
}

export interface TimelineItem {
  year: string;
  title: string;
  place: string;
  detail: string;
}

export interface ProjectDefault {
  slug: string;
  title: string;
  description: string;
  long_description?: string;
  technologies: string[];
  features: string[];
  github_url?: string;
  demo_url?: string;
  video_url?: string;
  image: string;
  status?: string;
}

export const PROFILE = {
  name: "Punja Bhattarai",
  firstName: "Punja",
  lastName: "Bhattarai",
  roles: ["Developer", "Designer", "Creator"],
  intro:
    "I'm a BCS student passionate about software development — building for the web, exploring backend systems, and crafting interactive experiences with Unity and 3D applications.",
  aboutBio: [
    "I'm Punja Bhattarai, a Bachelor of Computer Science student who enjoys turning ideas into working software. My interests span web development, backend systems and databases, as well as game development with Unity where I experiment with 3D environments and interactive design.",
    "I like understanding how things work end-to-end: from clean interfaces users touch, to APIs and databases doing the heavy lifting behind them. Right now I'm focused on strengthening my fundamentals while building real projects that solve small, real problems.",
  ],
  currentFocus: [
    "Full-stack web development",
    "Backend systems & APIs",
    "Unity & interactive 3D",
    "Database design with PostgreSQL",
  ],
  interests: [
    "Photography",
    "Game development",
    "Open source",
    "UI/UX design",
    "3D modelling",
    "Problem solving",
  ],
  philosophy:
    "Write code that is simple, honest and maintainable. Build things that work before making them fancy — then make them beautiful without breaking them.",
  email: "bhattaraipunja@gmail.com",
  location: "Butwal, Rupandehi, Nepal",
  avatarImage: "/images/portrait.svg",
  cvFile: "/cv/CV.pdf",
};

export const SOCIALS: SocialLink[] = [
  // Add your real URLs here or edit them in Admin → Settings.
  { label: "GitHub", url: "" },
  { label: "LinkedIn", url: "" },
  { label: "Email", url: "" },
  { label: "Instagram", url: "" },
];

export const SKILLS: SkillGroup[] = [
  {
    title: "Frontend",
    icon: "layout",
    skills: [
      { name: "HTML", level: "Comfortable" },
      { name: "CSS", level: "Comfortable" },
      { name: "JavaScript", level: "Comfortable" },
    ],
  },
  {
    title: "Programming",
    icon: "code",
    skills: [
      { name: "Java", level: "Familiar" },
      { name: "Python", level: "Familiar" },
      { name: "C", level: "Learning" },
    ],
  },
  {
    title: "Backend",
    icon: "server",
    skills: [
      { name: "PHP", level: "Learning" },
      { name: "REST APIs", level: "Learning" },
      { name: "Server-side Dev", level: "Learning" },
    ],
  },
  {
    title: "Database",
    icon: "database",
    skills: [
      { name: "PostgreSQL", level: "Learning" },
      { name: "Supabase", level: "Learning" },
    ],
  },
  {
    title: "3D / Game Development",
    icon: "cube",
    skills: [
      { name: "Unity", level: "Familiar" },
      { name: "C#", level: "Familiar" },
    ],
  },
];

export const TIMELINE: TimelineItem[] = [
  {
    year: "2024 — Present",
    title: "BCS — Bachelor of Computer Science",
    place: "University",
    detail:
      "Studying core computer science: programming, data structures, databases, networking and software engineering, while building personal projects on the side.",
  },
  {
    year: "Ongoing",
    title: "Self-directed Developer Journey",
    place: "Personal projects",
    detail:
      "Web development, backend experiments and Unity game projects — learning by shipping small, complete products rather than endless tutorials.",
  },
  {
    year: "Future",
    title: "Software Engineering Career",
    place: "Goal",
    detail:
      "Aiming to grow into a professional developer role focused on backend systems and interactive applications.",
  },
];

export const DEFAULT_PROJECTS: ProjectDefault[] = [
  {
    slug: "satyawati-trading-paints-suppliers",
    title: "Satyawati Trading & Paints Suppliers",
    description:
      "Business website for a paint & supplies shop with product catalogue and enquiry handling.",
    long_description:
      "A business website built to give a local paint supplier a professional online presence. It showcases product categories, brand information and lets customers send enquiries directly to the shop.",
    technologies: ["HTML", "CSS", "JavaScript", "PHP"],
    features: ["Product catalogue", "Enquiry form", "Responsive layout"],
    github_url: "",
    demo_url: "",
    video_url: "",
    image: "/images/projects/satyawati.svg",
  },
  {
    slug: "jungle-safari-unity",
    title: "Jungle Safari Unity Project",
    description:
      "A 3D jungle safari experience built in Unity with explorable terrain and wildlife encounters.",
    long_description:
      "An interactive 3D project developed in Unity exploring terrain creation, character controllers and environmental storytelling. Players move through a stylised jungle environment encountering animated wildlife.",
    technologies: ["Unity", "C#", "3D Modelling"],
    features: ["Explorable 3D world", "Wildlife AI behaviours", "Interactive camera"],
    github_url: "",
    demo_url: "",
    video_url: "",
    image: "/images/projects/jungle-safari.svg",
  },
  {
    slug: "weather-application",
    title: "Weather Application",
    description:
      "Clean weather app fetching live conditions and forecasts from an external weather API.",
    long_description:
      "A minimal weather application that consumes a third-party REST API to display current conditions, temperature trends and multi-day forecasts for searched cities, with graceful loading and error states.",
    technologies: ["JavaScript", "REST API", "CSS"],
    features: ["Live weather data", "City search", "Forecast view"],
    github_url: "",
    demo_url: "",
    image: "/images/projects/weather.svg",
  },
  {
    slug: "tic-tac-toe",
    title: "Tic Tac Toe",
    description:
      "Classic two-player and vs-computer tic tac toe with win detection and score tracking.",
    long_description:
      "A polished take on the classic game featuring local two-player mode, a simple computer opponent, win-line highlighting and persistent scores across rounds.",
    technologies: ["JavaScript", "HTML", "CSS"],
    features: ["2-player & CPU modes", "Win detection", "Score tracking"],
    github_url: "",
    demo_url: "",
    image: "/images/projects/tictactoe.svg",
  },
  {
    slug: "future-project",
    title: "Future Projects",
    description:
      "Space reserved for what comes next — new ideas are always in progress.",
    technologies: ["??"],
    features: [],
    image: "/images/projects/future.svg",
    status: "planned",
  },
];

export const DEFAULT_LAB: ProjectDefault[] = [
  {
    slug: "ai-house-paint-visualizer",
    title: "AI House Paint Visualizer",
    description:
      "Upload a house photo and preview different paint colours on its walls using image processing.",
    technologies: ["Python", "Image Processing", "AI"],
    features: ["Photo upload", "Wall detection", "Colour preview"],
    image: "/images/lab/paint-visualizer.svg",
    status: "in-progress",
  },
  {
    slug: "3d-unity-experiments",
    title: "3D Unity Experiments",
    description:
      "Small Unity playgrounds: physics toys, shaders, lighting studies and scene design tests.",
    technologies: ["Unity", "C#"],
    features: ["Physics sandbox", "Lighting studies"],
    image: "/images/lab/unity-experiments.svg",
    status: "ongoing",
  },
  {
    slug: "interactive-web-experiments",
    title: "Interactive Web Experiments",
    description:
      "Canvas animations, scroll effects and micro-interactions tested in isolation.",
    technologies: ["JavaScript", "Canvas", "CSS"],
    features: ["Animation studies", "Scroll interactions"],
    image: "/images/lab/web-experiments.svg",
    status: "ongoing",
  },
  {
    slug: "ui-experiments",
    title: "UI Experiments",
    description:
      "Component design explorations — glassmorphism, dark themes and motion patterns.",
    technologies: ["HTML", "CSS", "Design"],
    features: ["Design systems", "Motion patterns"],
    image: "/images/lab/ui-experiments.svg",
    status: "paused",
  },
  {
    slug: "image-processing-experiments",
    title: "Image Processing Experiments",
    description:
      "Filters, transforms and pixel-level manipulation experiments for learning fundamentals.",
    technologies: ["Python", "JavaScript"],
    features: ["Custom filters", "Pixel manipulation"],
    image: "/images/lab/image-processing.svg",
    status: "in-progress",
  },
];
