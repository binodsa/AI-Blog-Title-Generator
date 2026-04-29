export type GeneratedTitle = {
  id: string;
  text: string;
};

export type GenerateTitlesRequest = {
  topic: string;
  tone?: string;
  generateMore?: boolean;
  existingTitles?: string[];
  previousTitles?: string[];
  nonce?: number;
};

export type GenerateTitlesResponse = {
  titles: string[];
};
