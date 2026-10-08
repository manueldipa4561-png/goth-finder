// Demo people. All fictional: no photos, no real users. The UI labels every one of them as a demo.
// hexBack: she swipes back when you hex her. likedYou: an admirer who already hexed a goth girl using the app.

export const PROMPTS = [
  "Wednesday or Nosferatu?",
  "The song I play at midnight",
  "My most unexpected soft spot",
  "Green flag: someone who",
  "I will absolutely judge you for",
  "A perfect first date is",
  "Things I will not explain again",
  "Hot take that ends this match:",
];

const girl = (id, name, age, city, subgenres, obsession, promptQ, promptA, sigil, hexBack) => ({
  id, role: "goth_girl", name, age, city, subgenres, obsession, promptQ, promptA, sigil, hexBack, demo: true,
});
const admirer = (id, name, age, city, obsession, promptQ, promptA, sigil) => ({
  id, role: "admirer", name, age, city, subgenres: [], obsession, promptQ, promptA, sigil, likedYou: true, hexBack: true, demo: true,
});

export const PROFILES = [
  girl("g1", "Morrigan", 26, "Milan", ["Trad goth", "Deathrock"], "Sisters of Mercy on vinyl", PROMPTS[1], "Any Cure song, preferably with the windows open.", 0, true),
  girl("g2", "Selene", 24, "Turin", ["Romantic goth", "Dark academia"], "Gothic novels and cold coffee", PROMPTS[0], "Nosferatu. I saw it twice and wore velvet both times.", 1, true),
  girl("g3", "Vesper", 29, "New York", ["Cyber goth"], "Industrial nights in Brooklyn", PROMPTS[3], "Texts back, even if it is just a bat emoji.", 2, false),
  girl("g4", "Calla", 22, "Portland", ["Whimsigoth", "Pastel goth"], "Pressed flowers and candle wax", PROMPTS[2], "I cry at nature documentaries.", 3, true),
  girl("g5", "Isolde", 31, "Los Angeles", ["Trad goth", "Romantic goth"], "Cemetery walks at golden hour", PROMPTS[5], "Wandering a cemetery, then pasta. Not negotiable.", 4, false),
  girl("g6", "Nyx", 27, "Austin", ["Deathrock", "Mall goth"], "Thrifted band tees", PROMPTS[4], "People who say goth is just a phase.", 5, true),
  girl("g7", "Ravenna", 25, "Chicago", ["Nosferatu-core", "Dark academia"], "Frankenstein, the 2025 one, and the book", PROMPTS[7], "The 2025 Frankenstein was better than the book. Say it to my face.", 6, false),
  girl("g8", "Ophelia", 23, "Seattle", ["Whimsigoth"], "Moon phases and herbal tea", PROMPTS[2], "I name my plants after poets.", 7, true),
  girl("g9", "Lilith", 33, "Milan", ["Trad goth"], "Bauhaus, always Bauhaus", PROMPTS[6], "That it isn't a phase.", 8, false),
  girl("g10", "Circe", 28, "Turin", ["Romantic goth", "Whimsigoth"], "Velvet, lace and sea glass", PROMPTS[5], "A used bookshop that smells like rain.", 9, true),
];

export const ADMIRERS = [
  admirer("a1", "Dario", 30, "Milan", "Synths and film posters", PROMPTS[3], "Reads the whole message before replying.", 1),
  admirer("a2", "Jonas", 27, "New York", "Vinyl diggers and dive bars", PROMPTS[1], "Joy Division, then a very long hug.", 4),
  admirer("a3", "Elio", 34, "Turin", "Gothic architecture tours", PROMPTS[5], "Walking somewhere old and talking nonsense.", 6),
];

export const ALL_PROFILES = [...PROFILES, ...ADMIRERS];

export const DEMO_REPLIES = [
  "Hi. Your profile made my night better.",
  "Be honest, did you pick that song to impress me?",
  "Okay but what are you doing on Saturday?",
  "I was hoping you'd swipe right.",
  "Tell me something nobody knows about you.",
  "Wednesday or Nosferatu. Wrong answers only.",
];
