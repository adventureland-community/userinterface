/**
 * Shared query-search suggestion types — Market is the reference shape.
 */

export type QuerySearchSuggestion = {
  kind: "op" | "value";
  label: string;
  hint: string;
  ico: string;
  insert?: string;
  value?: string;
};

export type QuerySearchSection = {
  title: string;
  rows: QuerySearchSuggestion[];
};

export type QuerySearchMenu = {
  sections: QuerySearchSection[];
  flat: QuerySearchSuggestion[];
};
