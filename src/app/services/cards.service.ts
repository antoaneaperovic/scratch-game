import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { PAY_TABLE, totalCards } from '../models/card-item.model';
import { HistoryItem } from '../models/history-item.model';

@Injectable({
  providedIn: 'root',
})
export class CardsService {
  cards = signal<number[]>([]);
  winValue = signal<number>(0);
  betValue = signal<number>(1);
  historyItems = signal<HistoryItem[]>([]);

  drawCards(numCardsToDraw: number): void {
    const drawnCards: number[] = [];
    const counts: Record<number, number> = {};
    const chanceToWin = Math.random();
    this.winValue.set(0);

    while (drawnCards.length < numCardsToDraw) {
      const newCard = this.drawCard();
      if (chanceToWin < 0.5 && counts[newCard] === 2) continue;
      if (
        Object.values(counts).some((count) => count === 3) &&
        counts[newCard] === 2
      ) {
        continue;
      }

      counts[newCard] = (counts[newCard] || 0) + 1;
      if (counts[newCard] === 3) this.winValue.set(newCard);

      if (counts[newCard] > 3) {
        counts[newCard]--;
        continue;
      }
      drawnCards.push(newCard);
    }
    return this.cards.set(drawnCards);
  }

  addHistoryItem() {
    const historyItem = {
      id: this.historyItems.length + 1,
      date: new Date(Date.now()),
      cards: this.cards(),
      win: this.winValue() * this.betValue(),
    };

    this.historyItems.update((items) => {
      if (items.length >= 20) {
        items.pop();
      }

      const updatedItems = [historyItem, ...items];
      return updatedItems;
    });
  }

  private drawCard(): number {
    const randomValue = Math.random();
    let cumulativeProbability = 0;
    for (const { symbol, numCards, prize } of PAY_TABLE) {
      cumulativeProbability = numCards / totalCards;
      console.log(randomValue, cumulativeProbability, symbol);
      if (randomValue > cumulativeProbability) {
        return prize;
      }
    }

    return PAY_TABLE[PAY_TABLE.length - 1].prize;
  }

  loadImage(): Observable<HTMLImageElement> {
    return new Observable((observer) => {
      const image = new Image();
      image.crossOrigin = 'Anonymous';
      image.src = 'https://i.postimg.cc/3RHFDZHV/mycoins.jpg';
      image.onload = () => {
        observer.next(image);
        observer.complete();
      };
      image.onerror = (event) => {
        observer.error(new Error(`Image is not loaded.`));
      };
    });
  }
}
