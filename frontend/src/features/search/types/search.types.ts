export interface SearchResult {
  id: string;
  type: 'message' | 'channel' | 'person' | 'file';
  title: string;
  description?: string;
  icon?: string;
  metadata?: Record<string, any>;
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  recentSearches: string[];
  isLoading: boolean;
  error: string | null;
}
