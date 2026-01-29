"use client";

import { useEffect, useState, useRef } from "react";
import { MavrosLocalPosition, MavrosTwist } from "@/types/drone";

const ROS_BRIDGE_URL = "ws://localhost:9090";

export interface TelemetryDataPoint {
  time: number;
  ax: number; // Altitude (z)
  vx: number;
  vy: number;
  vz: number;
  x: number;
  y: number;
  roll: number;
  pitch: number;
  yaw: number;
}

export function useTelemetryHistory(maxPoints = 200) {
  const [history, setHistory] = useState<TelemetryDataPoint[]>([]);
  const [currentTelem, setCurrentTelem] = useState<TelemetryDataPoint | null>(null);
  const historyRef = useRef<TelemetryDataPoint[]>([]);

  // Refs for data aggregation (since topics come in separately)
  const currentDataRef = useRef<{
    pos: { x: number; y: number; z: number; roll: number; pitch: number; yaw: number } | null;
    vel: { x: number; y: number; z: number } | null;
  }>({ pos: null, vel: null });

  // Quaternion to Euler conversion
  const qToEuler = (q: { x: number; y: number; z: number; w: number }) => {
    const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
    const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);

    const sinp = 2 * (q.w * q.y - q.z * q.x);
    const pitch = Math.abs(sinp) >= 1 ? (Math.sign(sinp) * Math.PI) / 2 : Math.asin(sinp);

    const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
    const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);

    return { roll, pitch, yaw };
  };

  useEffect(() => {
    // Dynamic import
    let ros: any = null;
    let poseTopic: any = null;
    let velTopic: any = null;

    const initRos = async () => {
      const ROSLIB = await import("roslib");
      ros = new ROSLIB.Ros({ url: ROS_BRIDGE_URL });

      ros.on("error", (error: any) => {
        // console.error("Telemetry ROS Error", error);
      });

      // --- Pose Subscription ---
      poseTopic = new ROSLIB.Topic({
        ros,
        name: "/mavros/local_position/pose",
        messageType: "geometry_msgs/PoseStamped",
        throttle_rate: 100, // 10hz throttle to save render cycles
      });

      poseTopic.subscribe((msg: MavrosLocalPosition) => {
        const { position, orientation } = msg.pose;
        const euler = qToEuler(orientation);
        
        currentDataRef.current.pos = {
            x: position.x,
            y: position.y,
            z: position.z,
            roll: euler.roll,
            pitch: euler.pitch,
            yaw: euler.yaw
        };
        updateHistory();
      });

      // --- Velocity Subscription ---
      velTopic = new ROSLIB.Topic({
        ros,
        name: "/mavros/local_position/velocity_local",
        messageType: "geometry_msgs/TwistStamped",
        throttle_rate: 100, 
      });

      velTopic.subscribe((msg: MavrosTwist) => {
        currentDataRef.current.vel = {
            x: msg.twist.linear.x,
            y: msg.twist.linear.y,
            z: msg.twist.linear.z
        };
        // We update on Pose mostly, but we can check here too.
        // To avoid double updates per frame, we rely on the throttle or just update on Pose.
      });
    };

    const updateHistory = () => {
        const { pos, vel } = currentDataRef.current;
        if (!pos || !vel) return;

        const now = Date.now();
        const point: TelemetryDataPoint = {
            time: now,
            ax: pos.z,
            vx: vel.x,
            vy: vel.y,
            vz: vel.z,
            x: pos.x,
            y: pos.y,
            roll: pos.roll,
            pitch: pos.pitch,
            yaw: pos.yaw
        };

        setCurrentTelem(point);

        historyRef.current.push(point);
        if (historyRef.current.length > maxPoints) {
            historyRef.current.shift();
        }
        
        // Batch update react state for graph rendering? 
        // We'll just set it. React 18 batches anyway.
        // For very high freq, we might want to use a ref for the graph and only update state every X ms.
        // But 10Hz (throttled) should be fine.
        setHistory([...historyRef.current]);
    };

    initRos();

    return () => {
      poseTopic?.unsubscribe();
      velTopic?.unsubscribe();
      ros?.close();
    };
  }, [maxPoints]);

  return { history, current: currentTelem };
}
