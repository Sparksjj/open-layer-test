export interface Route {
  route_id: number;
  all_distance: number;
  from_port: string;
  to_port: string;
  leg_duration: number;
  points: number[][];
}

export class Route {
  static getPointIndexFromDistance(
    distance: number,
    points: number[][],
    allDistance: number
  ): number {
    if (!distance) {
      return 0;
    }

    if (distance === 1) {
      return points.length - 1;
    }

    const timestampFromDistance = allDistance * distance;
    let i: number | undefined = undefined;

    points.reduce((complitedDistance, point, pointIndex) => {
      complitedDistance = complitedDistance + point[4];

      if (complitedDistance >= timestampFromDistance && i === undefined) {
        i = pointIndex;
      }

      return complitedDistance;
    }, 0);

    return i || 0;
  }

  static getDistanceFromPointIndex(
    pointIndex: number,
    points: number[][],
    allDistance: number
  ): number {
    if (pointIndex === 0) {
      return 0;
    } else if (pointIndex === points.length - 1) {
      return 1;
    }

    let distance: number | undefined = undefined;

    points.reduce((complitedDistance, point, i) => {
      complitedDistance = complitedDistance + point[4];

      if (i === pointIndex && distance === undefined) {
        distance = complitedDistance / allDistance;
      }

      return complitedDistance;
    }, 0);

    return distance || 0;
  }
}
