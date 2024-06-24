import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  DataAccessService,
  DataStorageService,
} from '@my-own-org/route-data-access';

@Component({
  selector: 'lib-route-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './route-select.component.html',
  styleUrl: './route-select.component.css',
})
export class RouteSelectComponent implements OnInit {
  private dataAccessService = inject(DataAccessService);

  private dataStorage = inject(DataStorageService);

  get data() {
    return this.dataStorage.routes;
  }

  contol = new FormControl();

  ngOnInit(): void {
    this.getData();
    this.subscribeToCotnrolValue();
  }

  private getData(): void {
    this.dataAccessService.getRoutes().subscribe({
      next: res => {
        this.dataStorage.routes.set(res);
      },
    });
  }

  private subscribeToCotnrolValue(): void {
    this.contol.valueChanges.subscribe({
      next: value => {
        this.dataStorage.activeRoute.set(value);
      },
    });
  }
}
