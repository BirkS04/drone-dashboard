"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type {
  DroneMode,
  MavrosState,
  MavrosBattery,
  MavrosLocalPosition,
} from "@/types/drone";

const ROS_BRIDGE_URL = "ws://localhost:9090";

interface UseDroneReturn {
  isConnected: boolean;
  isArmed: boolean;
  mode: DroneMode;
  battery: number;
  altitude: number;
  verticalSpeed: number;
  // --- NEU: Kamera State ---
  cameraImage: string | null; 
  // -------------------------
  arm: () => Promise<boolean>;
  disarm: () => Promise<boolean>;
  takeoff: (height?: number) => Promise<boolean>;
  land: () => Promise<boolean>;
  move: (x: number, y: number, z: number, yaw?: number) => void;
  setMode: (mode: DroneMode) => Promise<boolean>;
  setMoveSpeed: (speed: number) => Promise<boolean>;
  executeMission: (waypoints: { x: number; y: number; z: number }[]) => Promise<boolean>;
}

export function useDrone(): UseDroneReturn {
  const rosRef = useRef<any>(null);
  const roslibRef = useRef<any>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isArmed, setIsArmed] = useState(false);
  const [mode, setModeState] = useState<DroneMode>("UNKNOWN");
  const [battery, setBattery] = useState(0);
  const [altitude, setAltitude] = useState(0);
  const [verticalSpeed, setVerticalSpeed] = useState(0);
  
  // --- NEU: State für das Kamerabild (Base64 String) ---
  const [cameraImage, setCameraImage] = useState<string | null>(null);
  // ----------------------------------------------------

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

  useEffect(() => {
    let stateTopic: any = null;
    let batteryTopic: any = null;
    let poseTopic: any = null;
    // --- NEU: Kamera Topic Variable ---
    let cameraTopic: any = null;

    const initRos = async () => {
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
        const dt = (currentTime - lastTimeRef.current) / 1000;
        if (dt > 0) {
          const vSpeed = (newAltitude - lastAltitudeRef.current) / dt;
          setVerticalSpeed(Math.round(vSpeed * 100) / 100);
        }
        setAltitude(Math.round(newAltitude * 100) / 100);
        lastAltitudeRef.current = newAltitude;
        lastTimeRef.current = currentTime;
      });

      // =====================================================
      // --- NEU: Kamera Subscription (Vision Proxy Topic) ---
      // =====================================================
      cameraTopic = new ROSLIB.Topic({
        ros,
        name: "/camera/image_raw/compressed",
        messageType: "sensor_msgs/CompressedImage",
      });

      cameraTopic.subscribe((message: any) => {
        // ROS sendet uint8[] Daten via Bridge als Base64 String
        // Wir fügen den Data-URI Header für den Browser hinzu
        setCameraImage(`data:image/jpeg;base64,${message.data}`);
      });
      // =====================================================
    };

    initRos();

    return () => {
      stateTopic?.unsubscribe();
      batteryTopic?.unsubscribe();
      poseTopic?.unsubscribe();
      cameraTopic?.unsubscribe(); // --- NEU: Cleanup ---
      rosRef.current?.close();
    };
  }, [parseMode]);

  // ... (Die restlichen Funktionen arm, disarm, move etc. bleiben gleich)

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
            "/commander/takeoff",
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

  const move = useCallback(
    (x: number, y: number, z: number, yaw: number = 0) => {
      if (!rosRef.current || !roslibRef.current) {
        console.error("ROS not connected");
        return;
      }

      const twist = {
        linear: { x, y, z },
        angular: { x: 0, y: 0, z: yaw },
      };

      const cmdVel = new roslibRef.current.Topic({
        ros: rosRef.current,
        name: "/commander/move_relative",
        messageType: "geometry_msgs/Twist",
      });

      cmdVel.publish(twist);
    },
    []
  );

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

  const setMoveSpeed = useCallback(
    async (speed: number): Promise<boolean> => {
      try {
        // Parameter update calls usually go to /<node_name>/set_parameters
        // Type: rcl_interfaces/srv/SetParameters
        // Note: roslib might not handle complex parameter objects easily.
        // We will assume standard ROS 2 parameter service structure.
        
        // Construct Parameter object
        // We need to send { parameters: [ { name: "move_speed", value: { type: 3, double_value: speed } } ] }
        // Type 3 is DOUBLE_VALUE in rcl_interfaces/msg/ParameterType
        
        if (!rosRef.current || !roslibRef.current) return false;
        
        const ROSLIB = roslibRef.current;
        const paramClient = new ROSLIB.Service({
            ros: rosRef.current,
            name: "/commander_node/set_parameters",
            serviceType: "rcl_interfaces/srv/SetParameters" 
        });

        const request = {
            parameters: [
                {
                    name: "move_speed",
                    value: {
                        type: 3, // ACTION_INTRINSIC_TYPE_DOUBLE
                        double_value: speed
                    }
                }
            ]
        };

        return new Promise((resolve) => {
            paramClient.callService(request, (res: any) => {
                 // res.results is array of SetParametersResult
                 if (res && res.results && res.results.length > 0 && res.results[0].successful) {
                     resolve(true);
                 } else {
                     resolve(false);
                 }
            }, () => resolve(false));
        });

      } catch (error) {
        console.error("Failed to set speed:", error);
        return false;
      }
    },
    []
  );

  const executeMission = useCallback(
    async (waypoints: { x: number; y: number; z: number }[]): Promise<boolean> => {
      if (!rosRef.current || !roslibRef.current || waypoints.length === 0) {
        console.error("Cannot start mission: ROS disconnected or no waypoints");
        return false;
      }

      const ROSLIB = roslibRef.current;

      // 1. Publish Path
      const missionTopic = new ROSLIB.Topic({
        ros: rosRef.current,
        name: "/commander/mission_path",
        messageType: "geometry_msgs/PoseArray",
      });

      const poseArray = {
        header: {
          frame_id: "map",
          stamp: { sec: 0, nsec: 0 }, // Timestamp internally handled
        },
        poses: waypoints.map((wp) => ({
          position: { x: wp.x, y: wp.y, z: wp.z },
          orientation: { x: 0, y: 0, z: 0, w: 1 }, // Default orientation
        })),
      };

      missionTopic.publish(poseArray);

      // Short delay to ensure message is received before starting
      await new Promise((r) => setTimeout(r, 200));

      // 2. Start Mission Service Call
      try {
        const response = await callService<{ success: boolean; message: string }>(
          "/commander/start_mission",
          "std_srvs/Trigger"
        );
        console.log("Mission Start Response:", response.message);
        return response.success;
      } catch (error) {
        console.error("Failed to start mission:", error);
        return false;
      }
    },
    [callService]
  );

  return {
    isConnected,
    isArmed,
    mode,
    battery,
    altitude,
    verticalSpeed,
    cameraImage,
    arm,
    disarm,
    takeoff,
    land,
    move,
    setMode,
    setMoveSpeed,
    executeMission,
  };
}