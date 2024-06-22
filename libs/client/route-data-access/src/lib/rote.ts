export interface Route {
  route_id: number;
  from_port: string;
  to_port: string;
  leg_duration: number;
  points: number[][];
}
