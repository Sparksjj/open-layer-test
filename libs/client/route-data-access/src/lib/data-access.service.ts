import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Route } from './rote';

@Injectable({
  providedIn: 'root',
})
export class DataAccessService {
  private http = inject(HttpClient);

  getRoutes(): Observable<Route[]> {
    return this.http
      .get(
        'https://raw.githubusercontent.com/Marcura/frontend-developer-test/master/web_challenge.csv',
        { responseType: 'text' }
      )
      .pipe(
        map(data => {
          return csvToJson(data);
        })
      );
  }
}

/**
 * A bit ugly method to convert csv string to json, i could use a library but i wanted to keep it simple
 * @param {string} data string content of csv file
 */
function csvToJson(data: string): Route[] {
  const csvToRowArray = data.split('\n');

  const keys: (keyof Route)[] = csvToRowArray
    .shift()
    ?.split(',')
    .map(key => JSON.parse(key)) as never as (keyof Route)[];

  const output: Route[] = new Array<Route>(csvToRowArray.length)
    .fill(null as never)
    .map(() => ({}) as Route);

  csvToRowArray.forEach((row, index) => {
    if (!row) {
      return;
    }

    const values = row.slice(1, -2).split('","');

    keys.forEach((key, keyIndex) => {
      if (values[keyIndex]) {
        (output[index] as any)[key] = values[keyIndex];
      }
    });

    output[index].points = JSON.parse(output[index].points as any);
    output[index].route_id = Number.parseInt(output[index].route_id as any);
    output[index].leg_duration = Number.parseInt(
      output[index].leg_duration as any
    );
  });

  return output;
}
