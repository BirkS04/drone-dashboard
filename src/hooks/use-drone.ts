"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type {
  DroneMode,
  MavrosState,
  MavrosBattery,
  MavrosLocalPosition,
} from "@/types/drone";

const ROS_BRIDGE_URL = "ws://localhost:9090";

interface DronePose {
  x: number;
  y: number;
  z: number;
  orientation: { x: number; y: number; z: number; w: number };
}

interface UseDroneReturn {
  isConnected: boolean;
  isArmed: boolean;
  mode: DroneMode;
  battery: number;
  altitude: number;
  verticalSpeed: number;
  cameraImage: string | null; 
  // --- NEUE RETURNS FÜR SLAM ---
  lidarData: number[];
  pose: DronePose;
  // -----------------------------
  arm: () => Promise<boolean>;
  disarm: () => Promise<boolean>;
  takeoff: (height?: number) => Promise<boolean>;
  land: () => Promise<boolean>;
  move: (x: number, y: number, z: number, yaw?: number) => void;
  setMode: (mode: DroneMode) => Promise<boolean>;
  setMoveSpeed: (speed: number) => Promise<boolean>;
  executeMission: (waypoints: { x: number; y: number; z: number }[]) => Promise<boolean>;
  setMissionStrategy: (strategy: "CASUAL" | "FACE_TARGET" | "INSPECT" | "ORBIT") => Promise<boolean>;
  setInspectROI: (x: number, y: number, z: number) => Promise<boolean>;
  setOrbitRadius: (radius: number) => Promise<boolean>;
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
  const [cameraImage, setCameraImage] = useState<string | null>(null);

  // --- NEUE STATES ---
  const [lidarData, setLidarData] = useState<number[]>([]);
  const [pose, setPose] = useState<DronePose>({
    x: 0, y: 0, z: 0,
    orientation: { x: 0, y: 0, z: 0, w: 1 }
  });

  const lastAltitudeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());

  const parseMode = useCallback((modeString: string): DroneMode => {
    const modeMap: Record<string, DroneMode> = {
      STABILIZE: "STABILIZE", GUIDED: "GUIDED", AUTO: "AUTO",
      RTL: "RTL", LAND: "LAND", LOITER: "LOITER",
      POSHOLD: "POSHOLD", ALT_HOLD: "ALT_HOLD",
    };
    return modeMap[modeString] || "UNKNOWN";
  }, []);

  useEffect(() => {
    let stateTopic: any = null;
    let batteryTopic: any = null;
    let poseTopic: any = null;
    let cameraTopic: any = null;
    let lidarTopic: any = null;

    const initRos = async () => {
      const ROSLIB = await import("roslib");
      roslibRef.current = ROSLIB;

      const ros = new ROSLIB.Ros({ url: ROS_BRIDGE_URL });
      rosRef.current = ros;

      ros.on("connection", () => setIsConnected(true));
      ros.on("error", () => setIsConnected(false));
      ros.on("close", () => setIsConnected(false));

      stateTopic = new ROSLIB.Topic({
        ros,
        name: "/mavros/state",
        messageType: "mavros_msgs/State",
      });
      stateTopic.subscribe((message: MavrosState) => {
        setIsArmed(message.armed);
        setModeState(parseMode(message.mode));
      });

      batteryTopic = new ROSLIB.Topic({
        ros,
        name: "/mavros/battery",
        messageType: "sensor_msgs/BatteryState",
      });
      batteryTopic.subscribe((message: MavrosBattery) => {
        setBattery(Math.round(message.percentage * 100));
      });

      poseTopic = new ROSLIB.Topic({
        ros,
        name: "/mavros/local_position/pose",
        messageType: "geometry_msgs/PoseStamped",
      });
      poseTopic.subscribe((message: MavrosLocalPosition) => {
        // Update die volle Pose für SLAM
        setPose({
            x: message.pose.position.x,
            y: message.pose.position.y,
            z: message.pose.position.z,
            orientation: message.pose.orientation
        });

        // Deine bestehende Telemetrie-Logik (Altitude & Speed)
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

      cameraTopic = new ROSLIB.Topic({
        ros,
        name: "/camera/image_raw/compressed",
        messageType: "sensor_msgs/CompressedImage",
      });
      cameraTopic.subscribe((message: any) => {
        setCameraImage(`data:image/jpeg;base64,${message.data}`);
      });

      // --- LIDAR SUBSCRIPTION ---
      lidarTopic = new ROSLIB.Topic({
        ros,
        name: "/lidar/scan",
        messageType: "sensor_msgs/LaserScan",
      });
      lidarTopic.subscribe((message: any) => {
        setLidarData(message.ranges);
      });
    };

    initRos();

    return () => {
      stateTopic?.unsubscribe();
      batteryTopic?.unsubscribe();
      poseTopic?.unsubscribe();
      cameraTopic?.unsubscribe();
      lidarTopic?.unsubscribe();
      rosRef.current?.close();
    };
  }, [parseMode]);

  // --- DIE BLEIBENDEN FUNKTIONEN (EXAKT WIE ZUVOR) ---

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
        service.callService(
          request,
          (response: T) => resolve(response),
          (error: string) => reject(new Error(error))
        );
      });
    },
    []
  );

  const arm = useCallback(async (): Promise<boolean> => {
    try {
      const response = await callService<{ success: boolean }>("/commander/arm", "std_srvs/Trigger");
      return response.success;
    } catch (error) { return false; }
  }, [callService]);

  const disarm = useCallback(async (): Promise<boolean> => {
    try {
      const response = await callService<{ success: boolean }>("/commander/disarm", "std_srvs/Trigger");
      return response.success;
    } catch (error) { return false; }
  }, [callService]);

  const takeoff = useCallback(
    async (height = 5): Promise<boolean> => {
      try {
        if (height === 5) {
          const response = await callService<{ success: boolean }>("/commander/takeoff", "std_srvs/Trigger");
          return response.success;
        }
        const response = await callService<{ success: boolean }>("/mavros/cmd/takeoff", "mavros_msgs/CommandTOL", { altitude: height });
        return response.success;
      } catch (error) { return false; }
    },
    [callService]
  );

  const land = useCallback(async (): Promise<boolean> => {
    try {
      const response = await callService<{ success: boolean }>("/commander/land", "std_srvs/Trigger");
      return response.success;
    } catch (error) { return false; }
  }, [callService]);

  const move = useCallback(
    (x: number, y: number, z: number, yaw: number = 0) => {
      if (!rosRef.current || !roslibRef.current) return;
      const cmdVel = new roslibRef.current.Topic({
        ros: rosRef.current,
        name: "/commander/move_relative",
        messageType: "geometry_msgs/Twist",
      });
      cmdVel.publish({ linear: { x, y, z }, angular: { x: 0, y: 0, z: yaw } });
    },
    []
  );

  const setMode = useCallback(
    async (newMode: DroneMode): Promise<boolean> => {
      try {
        const response = await callService<{ mode_sent: boolean }>("/mavros/set_mode", "mavros_msgs/SetMode", { custom_mode: newMode });
        return response.mode_sent;
      } catch (error) { return false; }
    },
    [callService]
  );

  const setMoveSpeed = useCallback(
    async (speed: number): Promise<boolean> => {
        if (!rosRef.current || !roslibRef.current) return false;
        const paramClient = new roslibRef.current.Service({
            ros: rosRef.current,
            name: "/commander_node/set_parameters",
            serviceType: "rcl_interfaces/srv/SetParameters" 
        });
        const request = { parameters: [{ name: "move_speed", value: { type: 3, double_value: speed } }] };
        return new Promise((resolve) => {
            paramClient.callService(request, (res: any) => {
                 resolve(res && res.results && res.results[0].successful);
            }, () => resolve(false));
        });
    },
    []
  );

  const executeMission = useCallback(
    async (waypoints: { x: number; y: number; z: number }[]): Promise<boolean> => {
      if (!rosRef.current || !roslibRef.current || waypoints.length === 0) return false;
      const missionTopic = new roslibRef.current.Topic({ ros: rosRef.current, name: "/commander/mission_path", messageType: "geometry_msgs/PoseArray" });
      missionTopic.publish({ header: { frame_id: "map" }, poses: waypoints.map((wp) => ({ position: wp, orientation: { x: 0, y: 0, z: 0, w: 1 } })) });
      await new Promise((r) => setTimeout(r, 200));
      try {
        const response = await callService<{ success: boolean }>("/commander/start_mission", "std_srvs/Trigger");
        return response.success;
      } catch (error) { return false; }
    },
    [callService]
  );

  const setMissionStrategy = useCallback(
    async (strategy: string): Promise<boolean> => {
        if (!rosRef.current || !roslibRef.current) return false;
        const paramClient = new roslibRef.current.Service({ ros: rosRef.current, name: "/commander_node/set_parameters", serviceType: "rcl_interfaces/srv/SetParameters" });
        return new Promise((resolve) => {
            paramClient.callService({ parameters: [{ name: "mission_strategy", value: { type: 4, string_value: strategy } }] }, 
            (res: any) => resolve(res && res.results && res.results[0].successful), () => resolve(false));
        });
    },
    []
  );

  const setInspectROI = useCallback(
    async (x: number, y: number, z: number): Promise<boolean> => {
        if (!rosRef.current || !roslibRef.current) return false;
        const paramClient = new roslibRef.current.Service({ ros: rosRef.current, name: "/commander_node/set_parameters", serviceType: "rcl_interfaces/srv/SetParameters" });
        const request = { parameters: [{ name: "roi_x", value: { type: 3, double_value: x } }, { name: "roi_y", value: { type: 3, double_value: y } }, { name: "roi_z", value: { type: 3, double_value: z } }] };
        return new Promise((resolve) => {
            paramClient.callService(request, (res: any) => resolve(res && res.results && res.results.every((r: any) => r.successful)), () => resolve(false));
        });
    },
    []
  );

  const setOrbitRadius = useCallback(
    async (radius: number): Promise<boolean> => {
        if (!rosRef.current || !roslibRef.current) return false;
        const paramClient = new roslibRef.current.Service({ ros: rosRef.current, name: "/commander_node/set_parameters", serviceType: "rcl_interfaces/srv/SetParameters" });
        return new Promise((resolve) => {
            paramClient.callService({ parameters: [{ name: "orbit_radius", value: { type: 3, double_value: radius } }] }, 
            (res: any) => resolve(res && res.results && res.results[0].successful), () => resolve(false));
        });
    },
    []
  );

  return {
    isConnected, isArmed, mode, battery, altitude, verticalSpeed, cameraImage, lidarData, pose,
    arm, disarm, takeoff, land, move, setMode, setMoveSpeed, executeMission, setMissionStrategy, setInspectROI, setOrbitRadius,
  };
}