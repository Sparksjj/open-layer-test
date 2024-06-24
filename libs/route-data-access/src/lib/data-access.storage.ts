import { Injectable, WritableSignal, signal } from '@angular/core';
import { Route } from './rote';

@Injectable({
  providedIn: 'root',
})
export class DataStorageService {
  routes: WritableSignal<Route[]> = signal([]);

  activeRoute: WritableSignal<Route | null> = signal(null);
}
