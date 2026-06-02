export const GAMES = [
  "Valorant",
  "BGMI",
  "CS2",
  "Fortnite",
  "Apex Legends",
  "Call of Duty",
  "Free Fire",
  "GTA V",
  "Roblox",
  "Other",
] as const;

export const GAME_MODES = ["Duo", "Squad", "Clan", "Co-op", "Custom"] as const;

export const PLAY_STYLES = [
  "Casual Gaming",
  "Competitive",
  "Ranked Push",
  "Duo Queue",
  "Squad Play",
  "Achievement Grinding",
  "New Player Friendly",
  "Voice Chat Friendly",
] as const;

export const COACHING_CATEGORIES = [
  "Beginner Coaching",
  "Ranked Coaching",
  "Competitive Coaching",
  "Team Coaching",
  "Strategy Coaching",
  "Aim Training",
  "VOD Review",
  "Gameplay Review",
  "Positioning & Game Sense",
  "Role-Specific Coaching",
  "Tournament Preparation",
] as const;

export const SESSION_DURATIONS = [30, 60, 90, 120] as const;

export type Game = (typeof GAMES)[number];
export type GameMode = (typeof GAME_MODES)[number];
export type PlayStyle = (typeof PLAY_STYLES)[number];
export type CoachingCategory = (typeof COACHING_CATEGORIES)[number];

