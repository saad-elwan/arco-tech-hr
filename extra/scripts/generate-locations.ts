import { prisma } from "../src/lib/prisma";

// Haversine formula
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate random coordinates around a center point
// radius in meters
function getRandomLocation(centerLat: number, centerLng: number, maxRadiusMeters: number) {
  const y0 = centerLat;
  const x0 = centerLng;
  const rd = maxRadiusMeters / 111300; // about 111km per degree

  const u = Math.random();
  const v = Math.random();

  const w = rd * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);

  // Adjust longitude based on latitude
  const newLng = x / Math.cos(y0 * Math.PI / 180);

  return {
    latitude: y0 + y,
    longitude: x0 + newLng
  };
}

async function main() {
  console.log("📍 جاري إضافة بيانات تتبع جغرافية (داخل وخارج النطاق)...");

  const company = await prisma.company.findUnique({ where: { id: 1 } });
  
  const compLat = company?.geofenceLat || 30.0444; // Cairo center
  const compLng = company?.geofenceLng || 31.2357;
  const compRadius = company?.geofenceRadius || 500;

  const employees = await prisma.employee.findMany();

  const now = new Date();
  
  for (const emp of employees) {
    // Generate 1-5 logs per employee for today
    const logsCount = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < logsCount; i++) {
      let lat, lng;
      
      if (emp.role === "delegate") {
        // Delegates are mostly out of range (80% chance)
        const outOfRange = Math.random() < 0.8;
        if (outOfRange) {
          // Generate between (radius) and (radius + 5000) meters away
          const loc = getRandomLocation(compLat, compLng, compRadius + 5000);
          // Make sure it's strictly outside
          lat = loc.latitude + (Math.random() > 0.5 ? 0.01 : -0.01);
          lng = loc.longitude + (Math.random() > 0.5 ? 0.01 : -0.01);
        } else {
          // Inside range
          const loc = getRandomLocation(compLat, compLng, compRadius - 50);
          lat = loc.latitude;
          lng = loc.longitude;
        }
      } else {
        // Employees are mostly in range (95% chance)
        const outOfRange = Math.random() > 0.95;
        if (outOfRange) {
          const loc = getRandomLocation(compLat, compLng, compRadius + 1000);
          lat = loc.latitude + 0.005;
          lng = loc.longitude + 0.005;
        } else {
          const loc = getRandomLocation(compLat, compLng, compRadius - 100);
          lat = loc.latitude;
          lng = loc.longitude;
        }
      }

      const distance = haversineDistance(lat, lng, compLat, compLng);
      const isOutOfRange = distance > compRadius;

      // Random time today (past 8 hours)
      const timestamp = new Date(now.getTime() - Math.random() * 8 * 60 * 60 * 1000);

      await prisma.locationLog.create({
        data: {
          employeeId: emp.id,
          latitude: lat,
          longitude: lng,
          isOutOfRange: isOutOfRange,
          timestamp: timestamp
        }
      });
    }
  }

  console.log("✅ تم إضافة بيانات التتبع الجغرافية لجميع الموظفين بنجاح!");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
