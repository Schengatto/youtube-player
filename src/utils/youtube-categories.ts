export const INTEREST_CONFIG: Record<string, {
  categories?: string[],
  searchKeywords?: string[]
}> = {
  // Finanza
  'finanza': {
    searchKeywords: ['finanza personale', 'investimenti', 'borsa italiana', 'economia']
  },
  'finance': {
    searchKeywords: ['personal finance', 'investing', 'stock market', 'financial education']
  },
  'investimenti': {
    searchKeywords: ['come investire', 'investimenti sicuri', 'portafoglio investimenti']
  },
  'investing': {
    searchKeywords: ['how to invest', 'investment strategies', 'portfolio management']
  },
  'trading': {
    searchKeywords: ['day trading', 'trading strategies', 'forex trading', 'crypto trading']
  },
  'borsa': {
    searchKeywords: ['borsa italiana', 'analisi tecnica', 'trading online']
  },
  'stock market': {
    searchKeywords: ['stock analysis', 'market news', 'stock picks']
  },
  'criptovalute': {
    searchKeywords: ['bitcoin', 'ethereum', 'crypto news', 'blockchain']
  },
  'cryptocurrency': {
    searchKeywords: ['bitcoin', 'ethereum', 'crypto news', 'defi']
  },
  'crypto': {
    searchKeywords: ['bitcoin news', 'crypto market', 'altcoins']
  },
  'economia': {
    searchKeywords: ['economia spiegata', 'macroeconomia', 'economia italiana']
  },
  'economics': {
    searchKeywords: ['economics explained', 'macroeconomics', 'economic theory']
  },
  'business': {
    searchKeywords: ['business strategies', 'entrepreneurship', 'startup advice']
  },
  'imprenditoria': {
    searchKeywords: ['come avviare un business', 'strategie imprenditoriali']
  },
  'startup': {
    searchKeywords: ['startup tips', 'come creare una startup', 'venture capital']
  },

  // Tecnologia
  'tecnologia': { categories: ['28'] },
  'technology': { categories: ['28'] },
  'tech': { categories: ['28'] },
  'informatica': { categories: ['28'] },
  'computer science': { categories: ['28'] },
  'programming': {
    searchKeywords: ['tutorial programming', 'learn to code', 'programming tips']
  },
  'programmazione': {
    searchKeywords: ['tutorial programmazione', 'imparare a programmare', 'coding']
  },
  'ai': {
    searchKeywords: ['artificial intelligence', 'AI news', 'machine learning tutorial']
  },
  'intelligenza artificiale': {
    searchKeywords: ['AI spiegata', 'machine learning', 'deep learning']
  },

  // Gaming
  'gaming': { categories: ['20'] },
  'videogames': { categories: ['20'] },
  'videogiochi': { categories: ['20'] },
  'esports': { categories: ['20'] },

  // Musica
  'musica': { categories: ['10'] },
  'music': { categories: ['10'] },
  'rap': { categories: ['10'] },
  'rock': { categories: ['10'] },
  'pop': { categories: ['10'] },

  // Sport
  'sport': { categories: ['17'] },
  'sports': { categories: ['17'] },
  'calcio': { categories: ['17'] },
  'football': { categories: ['17'] },
  'basket': { categories: ['17'] },
  'fitness': { categories: ['17'] },
  'palestra': { categories: ['17'] },

  // Cucina
  'cucina': { categories: ['26'] },
  'cooking': { categories: ['26'] },
  'ricette': {
    searchKeywords: ['ricette facili', 'ricette veloci', 'cucina italiana']
  },
  'recipes': {
    searchKeywords: ['easy recipes', 'quick recipes', 'cooking tutorial']
  },

  // Viaggi
  'viaggi': { categories: ['19'] },
  'travel': { categories: ['19'] },

  // Film & Cinema
  'film': { categories: ['1', '24'] },
  'movies': { categories: ['1', '24'] },
  'cinema': { categories: ['1', '24'] },
  'serie tv': {
    searchKeywords: ['serie tv consigliate', 'migliori serie tv', 'recensioni serie']
  },

  // Educazione & Scienza
  'educazione': { categories: ['27'] },
  'education': { categories: ['27'] },
  'scienza': { categories: ['27', '28'] },
  'science': { categories: ['27', '28'] },
  'matematica': {
    searchKeywords: ['matematica spiegata', 'tutorial matematica', 'math lessons']
  },
  'storia': {
    searchKeywords: ['storia documentari', 'lezioni di storia', 'storia spiegata']
  },

  // Auto
  'auto': { categories: ['2'] },
  'cars': { categories: ['2'] },

  // Animali
  'animali': { categories: ['15'] },
  'animals': { categories: ['15'] },
  'cani': { categories: ['15'] },
  'gatti': { categories: ['15'] },

  // Moda & Bellezza
  'moda': { categories: ['26'] },
  'fashion': { categories: ['26'] },
  'bellezza': { categories: ['26'] },
  'beauty': { categories: ['26'] },

  // Altri
  'comedy': { categories: ['23', '24'] },
  'podcast': {
    searchKeywords: ['best podcasts', 'podcast ita', 'podcast recommendations']
  },
};
