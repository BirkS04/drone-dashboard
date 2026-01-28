"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type {
  DroneMode,
  MavrosState,
  MavrosBattery,
  MavrosLocalPosition,
  TwistMessage,
} from "@/types/drone";

const ROS_BRIDGE_URL = "ws://localhost:9090";

interface UseDroneReturn {
  isConnected: boolean;
  isArmed: boolean;
  mode: DroneMode;
  battery: number;
  altitude: number;
  verticalSpeed: number;
  arm: () => Promise<boolean>;
  disarm: () => Promise<boolean>;
  takeoff: (height?: number) => Promise<boolean>;
  land: () => Promise<boolean>;
  move: (x: number, y: number, z: number) => void;
  setMode: (mode: DroneMode) => Promise<boolean>;
}

export function useDrone(): UseDroneReturn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rosRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roslibRef = useRef<any>(null);

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isArmed, setIsArmed] = useState(false);
  const [mode, setModeState] = useState<DroneMode>("UNKNOWN");
  const [battery, setBattery] = useState(0);
  const [altitude, setAltitude] = useState(0);
  const [verticalSpeed, setVerticalSpeed] = useState(0);

  // Vorherige Position für Geschwindigkeitsberechnung
  const lastAltitudeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());

  const parseMode = useCallback((modeString: string): DroneMode => {
    const modeMap: Record<string, DroneMode> = {
      STABILIZE: "STABILIZE",
      GUIDED: "GUIDED",
      AUTO: "AUTO",
      RTL: "RTL",
      LAND: "LAND",
      LOITER: "LOITER",
      POSHOLD: "POSHOLD",
      ALT_HOLD: "ALT_HOLD",
    };
    return modeMap[modeString] || "UNKNOWN";
  }, []);

  // ========================
  // ROS Connection - Dynamic Import
  // ========================
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let stateTopic: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let batteryTopic: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let poseTopic: any = null;

    const initRos = async () => {
      // Dynamic import to avoid SSR/Turbopack issues
      const ROSLIB = await import("roslib");
      roslibRef.current = ROSLIB;

      const ros = new ROSLIB.Ros({ url: ROS_BRIDGE_URL });
      rosRef.current = ros;

      ros.on("connection", () => {
        console.log("Connected to ROS bridge");
        setIsConnected(true);
      });

      ros.on("error", (error: unknown) => {
        console.error("ROS connection error:", error);
        setIsConnected(false);
      });

      ros.on("close", () => {
        console.log("ROS connection closed");
        setIsConnected(false);
      });

      // ========================
      // Topic Subscriptions
      // ========================

      // MAVROS State
      stateTopic = new ROSLIB.Topic({
        ros,
        name: "/mavros/state",
        messageType: "mavros_msgs/State",
      });

      stateTopic.subscribe((message: MavrosState) => {
        setIsArmed(message.armed);
        setModeState(parseMode(message.mode));
      });

      // Battery
      batteryTopic = new ROSLIB.Topic({
        ros,
        name: "/mavros/battery",
        messageType: "sensor_msgs/BatteryState",
      });

      batteryTopic.subscribe((message: MavrosBattery) => {
        setBattery(Math.round(message.percentage * 100));
      });

      // Local Position
      poseTopic = new ROSLIB.Topic({
        ros,
        name: "/mavros/local_position/pose",
        messageType: "geometry_msgs/PoseStamped",
      });

      poseTopic.subscribe((message: MavrosLocalPosition) => {
        const newAltitude = message.pose.position.z;
        const currentTime = Date.now();

        // Berechne Vertikalgeschwindigkeit
        const dt = (currentTime - lastTimeRef.current) / 1000;
        if (dt > 0) {
          const vSpeed = (newAltitude - lastAltitudeRef.current) / dt;
          setVerticalSpeed(Math.round(vSpeed * 100) / 100);
        }

        setAltitude(Math.round(newAltitude * 100) / 100);
        lastAltitudeRef.current = newAltitude;
        lastTimeRef.current = currentTime;
      });
    };

    initRos();

    return () => {
      stateTopic?.unsubscribe();
      batteryTopic?.unsubscribe();
      poseTopic?.unsubscribe();
      rosRef.current?.close();
    };
  }, [parseMode]);

  // ========================
  // Service Call Helper
  // ========================
  const callService = useCallback(
    <T>(serviceName: string, serviceType: string, request: object = {}): Promise<T> => {
      return new Promise((resolve, reject) => {
        if (!rosRef.current || !roslibRef.current) {
          reject(new Error("ROS not connected"));
          return;
        }

        const ROSLIB = roslibRef.current;
        const service = new ROSLIB.Service({
          ros: rosRef.current,
          name: serviceName,
          serviceType,
        });

        // roslib expects request object directly, not a ServiceRequest instance
        service.callService(
          request,
          (response: T) => resolve(response),
          (error: string) => reject(new Error(error))
        );
      });
    },
    []
  );

  // ========================
  // Drone Control Functions
  // ========================

  const arm = useCallback(async (): Promise<boolean> => {
    try {
      const response = await callService<{ success: boolean }>(
        "/commander/arm",
        "std_srvs/Trigger"
      );
      return response.success;
    } catch (error) {
      console.error("Failed to arm:", error);
      return false;
    }
  }, [callService]);

  const disarm = useCallback(async (): Promise<boolean> => {
    try {
      const response = await callService<{ success: boolean }>(
        "/commander/disarm",
        "std_srvs/Trigger"
      );
      return response.success;
    } catch (error) {
      console.error("Failed to disarm:", error);
      return false;
    }
  }, [callService]);

  const takeoff = useCallback(
    async (height = 5): Promise<boolean> => {
      try {
        // Nutze den Commander Node Service für 5m Takeoff
        if (height === 5) {
          const response = await callService<{ success: boolean }>(
            "/commander/takeoff_5m",
            "std_srvs/Trigger"
          );
          return response.success;
        }

        // Für andere Höhen direkt MAVROS nutzen
        const response = await callService<{ success: boolean }>(
          "/mavros/cmd/takeoff",
          "mavros_msgs/CommandTOL",
          { altitude: height }
        );
        return response.success;
      } catch (error) {
        console.error("Failed to takeoff:", error);
        return false;
      }
    },
    [callService]
  );

  const land = useCallback(async (): Promise<boolean> => {
    try {
      const response = await callService<{ success: boolean }>(
        "/commander/land",
        "std_srvs/Trigger"
      );
      return response.success;
    } catch (error) {
      console.error("Failed to land:", error);
      return false;
    }
  }, [callService]);

  const move = useCallback((x: number, y: number, z: number): void => {
    if (!rosRef.current || !roslibRef.current) {
      console.error("ROS not connected");
      return;
    }

    const ROSLIB = roslibRef.current;
    const moveTopic = new ROSLIB.Topic({
      ros: rosRef.current,
      name: "/commander/move_relative",
      messageType: "geometry_msgs/Twist",
    });

    const message: TwistMessage = {
      linear: { x, y, z },
      angular: { x: 0, y: 0, z: 0 },
    };

    // roslib publish() accepts object directly
    moveTopic.publish(message);
  }, []);

  const setMode = useCallback(
    async (newMode: DroneMode): Promise<boolean> => {
      try {
        const response = await callService<{ mode_sent: boolean }>(
          "/mavros/set_mode",
          "mavros_msgs/SetMode",
          { custom_mode: newMode }
        );
        return response.mode_sent;
      } catch (error) {
        console.error("Failed to set mode:", error);
        return false;
      }
    },
    [callService]
  );

  return {
    // State
    isConnected,
    isArmed,
    mode,
    battery,
    altitude,
    verticalSpeed,
    // Actions
    arm,
    disarm,
    takeoff,
    land,
    move,
    setMode,
  };
}
