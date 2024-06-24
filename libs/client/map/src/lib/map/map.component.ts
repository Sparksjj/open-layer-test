import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, effect, inject } from '@angular/core';
import { DataStorageService, Route } from '@my-own-org/route-data-access';
import { RouteSelectComponent } from '@my-own-org/route-select';

import Feature from 'ol/Feature.js';
import Map from 'ol/Map.js';
import View from 'ol/View';
import LineString from 'ol/geom/LineString.js';
import Point from 'ol/geom/Point';
import { Tile as TileLayer } from 'ol/layer.js';
import VectorLayer from 'ol/layer/Vector';
import { transform } from 'ol/proj';
import { getVectorContext } from 'ol/render.js';
import RenderEvent from 'ol/render/Event';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import Icon from 'ol/style/Icon';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';

interface AnimationData {
  animating: boolean;
  distance: number;
  activePointIndex: number;
  lastTime: number;
  geoMarker: Feature;
  startPosition: Feature;
  position: Point;
  vectorLayer: VectorLayer<Feature<Point> | Feature<LineString>>;
  routeFeature: LineString;
}

@Component({
  selector: 'lib-map',
  standalone: true,
  imports: [CommonModule, RouteSelectComponent],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css',
})
export class MapComponent implements OnInit {
  readonly isBrouser = isPlatformBrowser(inject(PLATFORM_ID));

  activeRoute = inject(DataStorageService).activeRoute;

  animationData: AnimationData = {
    animating: false,
    distance: 0,
    lastTime: 0,
    activePointIndex: 0,
  } as AnimationData;

  private serverProj = 'EPSG:4326';

  private olProj = 'EPSG:900913';

  private centerFallback = [-5639523.95, -3501274.52];

  private map!: Map;

  private activeRouteEffect = effect(() => {
    const route = this.activeRoute();
    if (route) {
      this.initNewRoute(route);
    } else {
      if (this.map) {
        if (this.animationData.animating) {
          this.toggleAnimation();
        }
        this.clearMap();
      }
    }
  });

  private styles!: {
    iconStart: Style;
    iconEnd: Style;
    geoMarker: Style;
  };

  ngOnInit(): void {
    if (this.isBrouser) {
      this.initMap();
      this.initStyles();
      this.getUserLocation();
    }
  }

  // just for fun
  toggleAnimation(): void {
    this.animationData.animating = !this.animationData.animating;
    if (this.animationData.animating) {
      this.animationData.lastTime = Date.now();
      this.animationData.vectorLayer.on(
        'postrender',
        this.moveFeature.bind(this)
      );
      // hide geoMarker and trigger map render through change event
      this.animationData.geoMarker.setGeometry(undefined);
    } else {
      this.resetAnimationData();
    }
  }

  private moveFeature(event: RenderEvent) {
    const speed = 300;
    const time = event.frameState?.time || 0;
    const elapsedTime = time - (this.animationData.lastTime || 0);

    this.animationData.distance =
      (this.animationData.distance + (speed * elapsedTime) / 1000000) % 2;
    this.animationData.lastTime = time;

    if (this.animationData.distance >= 1) {
      this.toggleAnimation();
      return;
    }

    const currentCoordinate = this.animationData.routeFeature.getCoordinateAt(
      this.animationData.distance
    );

    this.animationData.position.setCoordinates(currentCoordinate);
    const vectorContext = getVectorContext(event);
    vectorContext.setStyle(this.styles.geoMarker);
    vectorContext.drawGeometry(this.animationData.position);
    // tell OpenLayers to continue the postrender animation
    this.map.render();
  }

  private initMap(): void {
    this.map = new Map({
      target: document.getElementById('map') as HTMLElement,
      view: new View({
        center: this.centerFallback,
        zoom: 10,
        minZoom: 2,
        maxZoom: 19,
      }),
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            tileSize: 512,
          }),
        }),
      ],
    });
  }

  private initNewRoute(route: Route): void {
    this.clearMap();

    if (this.animationData.animating) {
      this.toggleAnimation();
    }

    const currPath = new LineString(
      route.points.map(el => el.slice(0, 2))
    ).transform('EPSG:4326', 'EPSG:3857');

    const routeFeature = new Feature({
      type: 'route',
      geometry: currPath,
    });

    const startMarker = new Feature({
      type: 'iconStart',
      geometry: new Point(
        transform(
          [route.points[0][0], route.points[0][1]],
          this.serverProj,
          this.olProj
        )
      ),
    });

    const endMarker = new Feature({
      type: 'iconEnd',
      geometry: new Point(
        transform(
          [
            route.points[route.points.length - 1][0],
            route.points[route.points.length - 1][1],
          ],
          this.serverProj,
          this.olProj
        )
      ),
    });

    const position = startMarker.getGeometry()?.clone() as Point;

    const geoMarker = new Feature({
      type: 'geoMarker',
      geometry: position,
    });

    const vectorLayer = new VectorLayer({
      source: new VectorSource({
        features: [routeFeature, geoMarker, startMarker, endMarker],
      }),
      style: feature => {
        if (feature.get('type') === 'route') {
          const styles: Style[] = [];

          const coordinates = (
            feature.getGeometry() as LineString
          ).getCoordinates();

          for (let i = 0; i < coordinates.length - 1; i++) {
            styles.push(
              new Style({
                geometry: new LineString(coordinates.slice(i, i + 2)),
                stroke: new Stroke({
                  color: getColor(
                    this.activeRoute()?.points[i][3] as number,
                    15
                  ),
                  width: 3,
                }),
              })
            );
          }

          return styles;
        }

        return this.styles[
          feature.get('type') as 'iconStart' | 'iconEnd' | 'geoMarker'
        ];
      },
    });

    this.map.addLayer(vectorLayer);

    const extent = routeFeature.getGeometry()?.getExtent();

    if (extent) {
      this.map
        .getView()
        .fit(extent, { padding: [100, 100, 100, 100], duration: 1000 });
    }

    // save data for animation
    this.animationData.vectorLayer = vectorLayer;
    this.animationData.position = position;
    this.animationData.routeFeature = routeFeature.getGeometry() as LineString;
    this.animationData.startPosition = startMarker;
    this.animationData.geoMarker = geoMarker;
  }

  /**
   * Try to get user's geoposition create point and change map ceter to fit it
   */
  private getUserLocation(): void {
    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      pos => {
        if (this.activeRoute()) {
          return;
        }

        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const view = this.map.getView();

        this.map.setView(
          new View({
            center: transform([lon, lat], this.serverProj, this.olProj),
            zoom: view.getZoom(),
            maxZoom: view.getMaxZoom(),
            minZoom: view.getMinZoom(),
          })
        );
      },
      () => {
        // do nothing here
      },
      options
    );
  }

  private clearMap(): void {
    this.map.getAllLayers().forEach((layer, i) => {
      if (i) {
        this.map.removeLayer(layer);
      }
    });
  }

  private resetAnimationData(): void {
    const listner = this.animationData.vectorLayer.getListeners('postrender');

    if (listner?.length) {
      this.animationData.vectorLayer.un('postrender', listner[0] as never);
    }

    this.animationData.distance = 0;
    this.animationData.activePointIndex = 0;
    this.animationData.geoMarker.setGeometry(
      this.animationData.startPosition.getGeometry()
    );
  }

  private initStyles(): void {
    this.styles = {
      iconStart: new Style({
        image: new Icon({
          anchor: [0.14, 1],
          width: 40,
          height: 40,
          src: 'checkered-flag.png',
        }),
      }),
      iconEnd: new Style({
        image: new Icon({
          anchor: [0.5, 1],
          width: 40,
          height: 40,
          src: 'location.png',
        }),
      }),
      geoMarker: new Style({
        image: new Icon({
          anchor: [0.5, 0.5],
          width: 22,
          height: 22,
          src: '/boat.png',
        }),
      }),
    };
  }
}

function getColor(speed: number, maxSpeed: number): string {
  return `hsl(${(120 * speed) / maxSpeed}, 100%, 50%)`;
}
