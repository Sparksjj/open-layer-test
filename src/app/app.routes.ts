import { Route } from '@angular/router';
import { MapComponent } from '@my-own-org/map';

export const appRoutes: Route[] = [
  { path: '', component: MapComponent },
  { path: '**', redirectTo: '' },
];
