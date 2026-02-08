import { Obstacle } from "@/hooks/use-drone";

interface Waypoint {
    x: number;
    y: number;
    z: number;
}

// Configuration - Tuned for smoother flight and less overshoot
const ORBIT_DISTANCE = 2.0;        // 2 meters from obstacle edge (increased for safety)
const FLIGHT_HEIGHT = 1.5;         // 1.5 meter flight height
const ORBIT_POINTS = 8;            // More points = smoother orbit
const INTERPOLATION_STEPS = 3;     // Extra points between waypoints for smoother transitions

/**
 * Generates an orbit path around a single obstacle
 */
function generateOrbitWaypoints(obs: Obstacle, height: number): Waypoint[] {
    // Calculate effective radius (obstacle size + orbit distance)
    let effectiveRadius = ORBIT_DISTANCE;
    
    if (obs.type === 'cylinder') {
        effectiveRadius += obs.radius || 0.5;
    } else {
        // For box: use diagonal/2 as radius
        const w = obs.width || 1;
        const h = obs.height || 1;
        effectiveRadius += Math.sqrt(w * w + h * h) / 2;
    }

    const waypoints: Waypoint[] = [];
    
    // Generate points around the obstacle
    for (let i = 0; i < ORBIT_POINTS; i++) {
        const angle = (i / ORBIT_POINTS) * 2 * Math.PI;
        waypoints.push({
            x: obs.x + Math.cos(angle) * effectiveRadius,
            y: obs.y + Math.sin(angle) * effectiveRadius,
            z: height
        });
    }

    return waypoints;
}

/**
 * Finds the nearest point in a set of waypoints to a given position
 */
function findNearestIndex(waypoints: Waypoint[], fromX: number, fromY: number): number {
    let minDist = Infinity;
    let minIdx = 0;
    
    for (let i = 0; i < waypoints.length; i++) {
        const dx = waypoints[i].x - fromX;
        const dy = waypoints[i].y - fromY;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
            minDist = dist;
            minIdx = i;
        }
    }
    
    return minIdx;
}

/**
 * Linear interpolation between two waypoints
 */
function interpolateWaypoints(from: Waypoint, to: Waypoint, steps: number): Waypoint[] {
    const result: Waypoint[] = [];
    
    for (let i = 1; i <= steps; i++) {
        const t = i / (steps + 1);
        result.push({
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t,
            z: from.z + (to.z - from.z) * t
        });
    }
    
    return result;
}

/**
 * Generates a complete obstacle course that orbits around each obstacle.
 * 
 * Strategy:
 * 1. Sort obstacles by distance from origin (nearest first)
 * 2. For each obstacle, generate orbit waypoints with extra interpolation
 * 3. Enter orbit at nearest point, complete full orbit
 * 4. Add intermediate points between obstacles for smooth transitions
 * 5. Return to origin at the end
 */
export function generateObstacleCourse(obstacles: Obstacle[]): Waypoint[] {
    if (!obstacles || obstacles.length === 0) return [];

    // Sort obstacles by distance from origin (visit nearest first)
    const sortedObs = [...obstacles].sort((a, b) => {
        const distA = Math.sqrt(a.x * a.x + a.y * a.y);
        const distB = Math.sqrt(b.x * b.x + b.y * b.y);
        return distA - distB;
    });

    const allWaypoints: Waypoint[] = [];
    let currentX = 0;
    let currentY = 0;
    let currentZ = FLIGHT_HEIGHT;

    for (const obs of sortedObs) {
        // Generate orbit waypoints for this obstacle
        const orbitWps = generateOrbitWaypoints(obs, FLIGHT_HEIGHT);
        
        if (orbitWps.length === 0) continue;

        // Find entry point (nearest to current position)
        const entryIdx = findNearestIndex(orbitWps, currentX, currentY);
        const entryPoint = orbitWps[entryIdx];

        // Add interpolated waypoints from current position to entry point
        if (allWaypoints.length > 0) {
            const lastWp = allWaypoints[allWaypoints.length - 1];
            const interpPoints = interpolateWaypoints(lastWp, entryPoint, INTERPOLATION_STEPS);
            allWaypoints.push(...interpPoints);
        }

        // Add entry point
        allWaypoints.push(entryPoint);

        // Add orbit waypoints in order, starting from entry point (full orbit)
        for (let i = 1; i <= ORBIT_POINTS; i++) {
            const idx = (entryIdx + i) % ORBIT_POINTS;
            const prevIdx = (entryIdx + i - 1) % ORBIT_POINTS;
            
            // Add interpolated points within the orbit for smoother curves
            const interpInOrbit = interpolateWaypoints(orbitWps[prevIdx], orbitWps[idx], 1);
            allWaypoints.push(...interpInOrbit);
            allWaypoints.push(orbitWps[idx]);
        }

        // Update current position to last waypoint
        const lastWp = allWaypoints[allWaypoints.length - 1];
        currentX = lastWp.x;
        currentY = lastWp.y;
        currentZ = lastWp.z;
    }

    // Add interpolated waypoints back to origin
    if (allWaypoints.length > 0) {
        const lastWp = allWaypoints[allWaypoints.length - 1];
        const returnPoint: Waypoint = { x: 0, y: 0, z: FLIGHT_HEIGHT };
        const interpReturn = interpolateWaypoints(lastWp, returnPoint, INTERPOLATION_STEPS + 2);
        allWaypoints.push(...interpReturn);
    }

    // Final return to origin
    allWaypoints.push({ x: 0, y: 0, z: FLIGHT_HEIGHT });

    return allWaypoints;
}
