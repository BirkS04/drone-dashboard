/**
 * Drone-spezifische TypeScript Types
 */

/** Drohnen-Flugmodi (MAVROS/ArduPilot) */
export type DroneMode = 
  | 'STABILIZE'
  | 'GUIDED'
  | 'AUTO'
  | 'RTL'
  | 'LAND'
  | 'LOITER'
  | 'POSHOLD'
  | 'ALT_HOLD'
  | 'UNKNOWN';

/** Aktueller Drohnen-Status */
export interface DroneState {
  isConnected: boolean;
  isArmed: boolean;
  mode: DroneMode;
  battery: number;
  altitude: number;
  verticalSpeed: number;
}

/** Telemetrie-Daten */
export interface DroneTelemetry {
  altitude: number;
  verticalSpeed: number;
  battery: number;
  heading: number;
  groundSpeed: number;
}

/** MAVROS State Message Interface */
export interface MavrosState {
  connected: boolean;
  armed: boolean;
  guided: boolean;
  manual_input: boolean;
  mode: string;
}

/** MAVROS Battery Message Interface */
export interface MavrosBattery {
  voltage: number;
  current: number;
  percentage: number;
}

/** MAVROS Local Position Interface */
export interface MavrosLocalPosition {
  header: {
    stamp: {
      sec: number;
      nanosec: number;
    };
    frame_id: string;
  };
  pose: {
    position: {
      x: number;
      y: number;
      z: number;
    };
    orientation: {
      x: number;
      y: number;
      z: number;
      w: number;
    };
  };
}

/** Twist Message für relative Bewegung */
export interface TwistMessage {
  linear: {
    x: number;
    y: number;
    z: number;
  };
  angular: {
    x: number;
    y: number;
    z: number;
  };
}

/** Twist Stamped Message */
export interface MavrosTwist {
  header: {
    stamp: {
      sec: number;
      nanosec: number;
    };
    frame_id: string;
  };
  twist: {
    linear: {
      x: number;
      y: number;
      z: number;
    };
    angular: {
      x: number;
      y: number;
      z: number;
    };
  };
}
