import { useEffect, useState } from 'react';
import * as ROSLIB from 'roslib';

export function useRos() {
  const [ros, setRos] = useState<ROSLIB.Ros | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Verbindung zum Rosbridge Server (Localhost im Container)
    const rosInstance = new ROSLIB.Ros({
      url: 'ws://localhost:9090', 
    });

    rosInstance.on('connection', () => {
      console.log('Connected to websocket server.');
      setIsConnected(true);
    });

    rosInstance.on('error', (error) => {
      console.log('Error connecting to websocket server: ', error);
      setIsConnected(false);
    });

    rosInstance.on('close', () => {
      console.log('Connection to websocket server closed.');
      setIsConnected(false);
    });

    setRos(rosInstance);

    return () => {
      rosInstance.close();
    };
  }, []);

  return { ros, isConnected };
}