import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const body = await req.json();
        const { session_id, device_fingerprint, latitude, longitude, gps_accuracy } = body;

        if (!session_id || !device_fingerprint || !latitude || !longitude) {
            return Response.json({ 
                success: false, 
                error: "Missing required parameters" 
            }, { status: 400 });
        }

        // Find active student record by device fingerprint and session
        const activeStudents = await base44.asServiceRole.entities.QRActiveStudent.filter({
            session_id,
            device_fingerprint,
            status: 'active'
        });

        if (activeStudents.length === 0) {
            return Response.json({ 
                success: false, 
                error: "No active session found for this device" 
            }, { status: 404 });
        }

        const activeStudent = activeStudents[0];

        // Get geo-fence zones
        const geoFenceZones = await base44.asServiceRole.entities.GeoFenceZone.filter({ 
            session_id,
            is_active: true 
        });

        let isInsideGeofence = false;
        let distanceFromGeofence = null;

        if (geoFenceZones.length > 0) {
            for (const zone of geoFenceZones) {
                const distance = calculateDistance(
                    latitude, 
                    longitude, 
                    zone.latitude, 
                    zone.longitude
                );
                
                if (distance <= zone.radius_meters) {
                    isInsideGeofence = true;
                    distanceFromGeofence = 0;
                    break;
                }
                
                if (distanceFromGeofence === null || distance < distanceFromGeofence) {
                    distanceFromGeofence = distance;
                }
            }
        } else {
            // No geo-fence configured, consider inside
            isInsideGeofence = true;
            distanceFromGeofence = 0;
        }

        // Update location and status
        await base44.asServiceRole.entities.QRActiveStudent.update(activeStudent.id, {
            latitude,
            longitude,
            gps_accuracy,
            is_inside_geofence: isInsideGeofence,
            distance_from_geofence: distanceFromGeofence,
            last_active_at: new Date().toISOString()
        });

        return Response.json({ 
            success: true,
            is_inside_geofence: isInsideGeofence,
            distance: distanceFromGeofence
        });

    } catch (error) {
        console.error("Error updating heartbeat:", error);
        return Response.json({ 
            success: false, 
            error: "Internal server error",
            details: error.message 
        }, { status: 500 });
    }
});