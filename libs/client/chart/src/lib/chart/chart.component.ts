import { CommonModule, DatePipe } from '@angular/common';
import {
  Component,
  OnChanges,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DataStorageService, Route } from '@my-own-org/route-data-access';
import { ChartConfiguration, ChartData, ChartDataset } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import {
  Subject,
  Subscription,
  distinctUntilChanged,
  switchMap,
  tap,
  throttleTime,
  timer,
} from 'rxjs';

@Component({
  selector: 'lib-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.css',
})
export class ChartComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild(BaseChartDirective) private chart!: BaseChartDirective;

  pointClick = output<number>();

  distance = input.required<number>();

  activeRoute = inject(DataStorageService).activeRoute;

  chardData = signal<ChartData<'line'> | null>(null);

  chartOptions: ChartConfiguration['options'] = {
    elements: {
      line: {
        tension: 0.1,
      },
    },
    animation: {
      duration: 0,
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        this.activeIndex = elements[0].index;
        this.pointClick.emit(this.activeIndex);
        this.chart.update();
      }
    },
    scales: {
      x: {
        display: false,
      },
    },
  };

  private activeIndex = 0;

  private updateSubject = new Subject<number>();

  private activeRouteEffect = effect(
    () => {
      const route = this.activeRoute();
      if (route) {
        this.preperaData(route);
      } else {
        this.chardData.set(null);
      }
    },
    { allowSignalWrites: true }
  );

  private datePipe = new DatePipe('en-US');

  private sub!: Subscription;

  ngOnInit(): void {
    this.sub = this.updateSubject
      .pipe(
        distinctUntilChanged(),
        throttleTime(100),
        tap(() => this.chart.update()),
        switchMap(() => timer(300))
      )
      .subscribe(() => {
        this.chart.update();
      });
  }

  ngOnDestroy(): void {
    // i wont use this uproach for production and big apps, but for test app it's ok
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  ngOnChanges(): void {
    const rote = this.activeRoute();
    if (rote && this.distance !== undefined) {
      const newIndex = Route.getPointIndexFromDistance(
        this.distance(),
        rote.points,
        rote.all_distance
      );

      if (newIndex !== this.activeIndex) {
        this.activeIndex = newIndex;
        this.updateSubject.next(newIndex);
      }
    }
  }

  private preperaData(route: Route): void {
    const labels: string[] = [];
    const datasets: ChartDataset<'line'> = {
      label: `${route.from_port} => ${route.to_port}`,
      pointBackgroundColor: context => {
        return context.dataIndex === this.activeIndex
          ? 'red'
          : 'rgba(75,192,192,0)';
      },
      pointBorderColor: 'rgba(0,0,0,0)',
      borderColor: 'green',
      data: [],
    };

    route.points.forEach(point => {
      labels.push(
        this.datePipe.transform(new Date(point[2]), 'MM.d HH:mm') || ''
      );
      datasets.data.push(point[3]);
    });

    this.chardData.set({
      labels,
      datasets: [datasets],
    });
  }
}
