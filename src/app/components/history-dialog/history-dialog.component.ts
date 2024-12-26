import { Component, inject } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialogRef } from '@angular/material/dialog';
import { CardsService } from '../../services/cards.service';
import { CurrencyPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-history-dialog',
  imports: [MatDialogModule, DatePipe, CurrencyPipe],
  templateUrl: './history-dialog.component.html',
  styleUrl: './history-dialog.component.scss',
})
export class HistoryDialogComponent {
  dialogRef = inject(MatDialogRef<HistoryDialogComponent>);
  cardService = inject(CardsService);

  closeModal() {
    this.dialogRef.close();
  }
}
