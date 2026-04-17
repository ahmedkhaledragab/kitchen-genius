// Shared recipe shape used both by AI snapshots and DB rows.
export type Difficulty = "easy" | "medium" | "hard";

export interface Recipe {
  id?: string;
  title: string;
  description?: string;
  ingredients: string[];
  missing_ingredients: string[];
  steps: string[];
  estimated_time_minutes: number;
  difficulty: Difficulty;
  tags: string[];
  cuisine?: string;
  language?: string;
  image_url?: string | null;
}

export interface FavoriteRow {
  id: string;
  user_id: string;
  recipe_id: string | null;
  recipe_snapshot: Recipe | null;
  created_at: string;
}
