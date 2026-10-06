export interface TagOption {
  id: string;
  name: string;
}

export interface BookOption {
  id: number;
  name: string;
  testament: "old" | "new";
  category: string;
  hasVerses: boolean;
}

export interface SearchOptions {
  themes: TagOption[];
  situations: TagOption[];
  moods: TagOption[];
  books: BookOption[];
  chapters: number[];
}
