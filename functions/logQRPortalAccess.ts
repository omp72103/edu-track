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
        const { session_id, latitude, longitude, gps_accuracy, device_fingerprint } = body;

        if (!session_id || !latitude || !longitude) {
            return Response.json({ 
                success: false, 
                error: "Missing required parameters" 
            }, { status: 400 });
        }

        // Get session data
        const sessionData = await base44.asServiceRole.entities.Session.get(session_id);
        if (!sessionData) {
            return Response.json({ 
                success: false, 
                error: "Session not found" 
            }, { status: 404 });
        }

        // Check geo-fence
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
                    break;
                }
                
                if (distanceFromGeofence === null || distance < distanceFromGeofence) {
                    distanceFromGeofence = distance;
                }
            }
        } else {
            // No geo-fence configured, consider inside
            isInsideGeofence = true;
        }

        // Log as active student (without PRN initially - will be updated on submission)
        await base44.asServiceRole.entities.QRActiveStudent.create({
            session_id,
            device_fingerprint,
            latitude,
            longitude,
            gps_accuracy,
            is_inside_geofence: isInsideGeofence,
            distance_from_geofence: distanceFromGeofence,
            portal_opened_at: new Date().toISOString(),
            last_active_at: new Date().toISOString(),
            status: 'active'
        });

        return Response.json({ 
            success: true,
            is_inside_geofence: isInsideGeofence,
            distance: distanceFromGeofence
        });

    } catch (error) {
        console.error("Error logging portal access:", error);
        return Response.json({ 
            success: false, 
            error: "Internal server error",
            details: error.message 
        }, { status: 500 });
    }
});