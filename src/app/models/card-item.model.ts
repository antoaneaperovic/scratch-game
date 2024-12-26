export interface CardItem {
  symbol: number;
  numCards: number;
  prize: number;
}

export const PAY_TABLE: CardItem[] = [
  { symbol: 1, numCards: 10000, prize: 1 },
  { symbol: 2, numCards: 2000, prize: 2 },
  { symbol: 3, numCards: 400, prize: 5 },
  { symbol: 4, numCards: 200, prize: 10 },
  { symbol: 5, numCards: 50, prize: 50 },
  { symbol: 6, numCards: 25, prize: 200 },
  { symbol: 7, numCards: 10, prize: 400 },
  { symbol: 8, numCards: 4, prize: 2000 },
  { symbol: 9, numCards: 1, prize: 10000 },
];

export const totalCards = 50000;
