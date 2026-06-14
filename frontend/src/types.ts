export type Project = {
  id: string;
  title: string;
  summary: string;
  tech: string[];
  href?: string | null;
  featured: boolean;
};

export type Testimonial = {
  id: string;
  name: string;
  role?: string | null;
  company?: string | null;
  quote: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type ContactOut = {
  id: string;
  created_at: string;
};
