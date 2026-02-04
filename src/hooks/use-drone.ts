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
  lidarData: number[];
  slamPoints: Float32Array | null;
  pose: DronePose;
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

  const [lidarData, setLidarData] = useState<number[]>([]);
  const [slamPoints, setSlamPoints] = useState<Float32Array | null>(null);
  const [pose, setPose] = useState<DronePose>({
    x: 0, y: 0, z: 0,
    orientation: { x: 0, y: 0, z: 0, w: 1 }
  });

  const lastAltitudeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());
  const slamActiveRef = useRef<boolean>(false);

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
    let slamPoseTopic: any = null;
    let cameraTopic: any = null;
    let lidarScanTopic: any = null;
    let slamCloudTopic: any = null;

    const initRos = async () => {
      const ROSLIB = await import("roslib");
      roslibRef.current = ROSLIB;
      const ros = new ROSLIB.Ros({ url: ROS_BRIDGE_URL });
      rosRef.current = ros;

      ros.on("connection", () => setIsConnected(true));
      ros.on("close", () => setIsConnected(false));

      stateTopic = new ROSLIB.Topic({ ros, name: "/mavros/state", messageType: "mavros_msgs/State" });
      stateTopic.subscribe((message: MavrosState) => {
        setIsArmed(message.armed);
        setModeState(parseMode(message.mode));
      });

      batteryTopic = new ROSLIB.Topic({ ros, name: "/mavros/battery", messageType: "sensor_msgs/BatteryState" });
      batteryTopic.subscribe((message: MavrosBattery) => setBattery(Math.round(message.percentage * 100)));

      // POSE FROM FAST LIO
      slamPoseTopic = new ROSLIB.Topic({ ros, name: "/Odometry", messageType: "nav_msgs/Odometry" });
      slamPoseTopic.subscribe((m: any) => {
        slamActiveRef.current = true;
        const p = m.pose.pose.position;
        const o = m.pose.pose.orientation;
        setPose({ x: p.x, y: p.y, z: p.z, orientation: o });
        setAltitude(Math.round(p.z * 100) / 100);
      });

      // FALLBACK POSE
      poseTopic = new ROSLIB.Topic({ ros, name: "/mavros/local_position/pose", messageType: "geometry_msgs/PoseStamped" });
      poseTopic.subscribe((message: MavrosLocalPosition) => {
        if (slamActiveRef.current) return;
        setPose({ x: message.pose.position.x, y: message.pose.position.y, z: message.pose.position.z, orientation: message.pose.orientation });
      });

      lidarScanTopic = new ROSLIB.Topic({ ros, name: "/lidar/scan", messageType: "sensor_msgs/LaserScan" });
      lidarScanTopic.subscribe((message: any) => setLidarData(message.ranges));

      // CLOUD FROM FAST LIO
      slamCloudTopic = new ROSLIB.Topic({ ros, name: "/cloud_registered", messageType: "sensor_msgs/PointCloud2" });
      let skipFrame = false;
      slamCloudTopic.subscribe((m: any) => {
        if (skipFrame) { skipFrame = false; return; }
        skipFrame = true;
        try {
          const binaryString = atob(m.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
          const dv = new DataView(bytes.buffer);
          const numPoints = Math.floor(bytes.length / m.point_step);
          const factor = 4; // Downsampling
          const points = new Float32Array(Math.floor(numPoints / factor) * 3);
          for (let i = 0; i < numPoints; i += factor) {
            const offset = i * m.point_step;
            points[(i/factor)*3] = dv.getFloat32(offset + 0, true);
            points[(i/factor)*3 + 1] = dv.getFloat32(offset + 4, true);
            points[(i/factor)*3 + 2] = dv.getFloat32(offset + 8, true);
          }
          setSlamPoints(points);
        } catch (e) {}
      });

      cameraTopic = new ROSLIB.Topic({ ros, name: "/camera/image_raw/compressed", messageType: "sensor_msgs/CompressedImage" });
      cameraTopic.subscribe((message: any) => setCameraImage(`data:image/jpeg;base64,${message.data}`));
    };

    initRos();
    return () => { rosRef.current?.close(); };
  }, [parseMode]);

  // --- COMMAND FUNCTIONS ---
  const callService = useCallback(<T>(serviceName: string, serviceType: string, request: object = {}): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!rosRef.current || !roslibRef.current) return reject(new Error("ROS not connected"));
      const service = new roslibRef.current.Service({ ros: rosRef.current, name: serviceName, serviceType });
      service.callService(request, (res: T) => resolve(res), (err: string) => reject(new Error(err)));
    });
  }, []);

  const arm = useCallback(async () => {
    try { return (await callService<{ success: boolean }>("/commander/arm", "std_srvs/Trigger")).success; }
    catch { return false; }
  }, [callService]);

  const disarm = useCallback(async () => {
    try { return (await callService<{ success: boolean }>("/commander/disarm", "std_srvs/Trigger")).success; }
    catch { return false; }
  }, [callService]);

  const takeoff = useCallback(async (height = 5) => {
    try {
      if (height === 5) return (await callService<{ success: boolean }>("/commander/takeoff", "std_srvs/Trigger")).success;
      return (await callService<{ success: boolean }>("/mavros/cmd/takeoff", "mavros_msgs/CommandTOL", { altitude: height })).success;
    } catch { return false; }
  }, [callService]);

  const land = useCallback(async () => {
    try { return (await callService<{ success: boolean }>("/commander/land", "std_srvs/Trigger")).success; }
    catch { return false; }
  }, [callService]);

  const move = useCallback((x: number, y: number, z: number, yaw: number = 0) => {
    if (!rosRef.current || !roslibRef.current) return;
    const cmdVel = new roslibRef.current.Topic({ ros: rosRef.current, name: "/commander/move_relative", messageType: "geometry_msgs/Twist" });
    cmdVel.publish({ linear: { x, y, z }, angular: { x: 0, y: 0, z: yaw } });
  }, []);

  const setMode = useCallback(async (newMode: DroneMode) => {
    try { return (await callService<{ mode_sent: boolean }>("/mavros/set_mode", "mavros_msgs/SetMode", { custom_mode: newMode })).mode_sent; }
    catch { return false; }
  }, [callService]);

  const setMoveSpeed = useCallback(async (speed: number) => {
    try {
      const request = { parameters: [{ name: "move_speed", value: { type: 3, double_value: speed } }] };
      const res = await callService<any>("/commander_node/set_parameters", "rcl_interfaces/srv/SetParameters", request);
      return res?.results?.[0]?.successful ?? false;
    } catch { return false; }
  }, [callService]);

  const executeMission = useCallback(async (waypoints: { x: number; y: number; z: number }[]) => {
    if (!rosRef.current || !roslibRef.current || waypoints.length === 0) return false;
    const missionTopic = new roslibRef.current.Topic({ ros: rosRef.current, name: "/commander/mission_path", messageType: "geometry_msgs/PoseArray" });
    missionTopic.publish({ header: { frame_id: "map" }, poses: waypoints.map(wp => ({ position: wp, orientation: { x: 0, y: 0, z: 0, w: 1 } })) });
    await new Promise(r => setTimeout(r, 200));
    return (await arm()) && (await callService<{ success: boolean }>("/commander/start_mission", "std_srvs/Trigger")).success;
  }, [callService, arm]);

  const setMissionStrategy = useCallback(async (strategy: string) => {
    try {
      const request = { parameters: [{ name: "mission_strategy", value: { type: 4, string_value: strategy } }] };
      const res = await callService<any>("/commander_node/set_parameters", "rcl_interfaces/srv/SetParameters", request);
      return res?.results?.[0]?.successful ?? false;
    } catch { return false; }
  }, [callService]);

  const setInspectROI = useCallback(async (x: number, y: number, z: number) => {
    try {
      const request = { parameters: [
        { name: "roi_x", value: { type: 3, double_value: x } },
        { name: "roi_y", value: { type: 3, double_value: y } },
        { name: "roi_z", value: { type: 3, double_value: z } }
      ]};
      const res = await callService<any>("/commander_node/set_parameters", "rcl_interfaces/srv/SetParameters", request);
      return res?.results?.every((r: any) => r.successful) ?? false;
    } catch { return false; }
  }, [callService]);

  const setOrbitRadius = useCallback(async (radius: number) => {
    try {
      const request = { parameters: [{ name: "orbit_radius", value: { type: 3, double_value: radius } }] };
      const res = await callService<any>("/commander_node/set_parameters", "rcl_interfaces/srv/SetParameters", request);
      return res?.results?.[0]?.successful ?? false;
    } catch { return false; }
  }, [callService]);

  return {
    isConnected, isArmed, mode, battery, altitude, verticalSpeed, cameraImage, lidarData, slamPoints, pose,
    arm, disarm, takeoff, land, move, setMode, setMoveSpeed, executeMission, setMissionStrategy, setInspectROI, setOrbitRadius,
  };
}