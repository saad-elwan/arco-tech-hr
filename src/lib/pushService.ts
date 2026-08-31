import { prisma } from "./prisma";
import { ensureDatabaseSchema } from "./ensureSchema";

export interface PushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: any;
  sound?: string;
  priority?: "default" | "normal" | "high";
  channelId?: string;
}

// Send Cloud Push Notification via Expo Push Servers
export async function sendExpoPushNotifications(messages: PushMessage[]) {
  if (!messages || messages.length === 0) return;

  try {
    const formatted = messages.map(msg => ({
      to: msg.to,
      sound: msg.sound || "default",
      title: msg.title,
      body: msg.body,
      data: msg.data || {},
      channelId: msg.channelId || "arco-alerts-channel",
      priority: msg.priority || "high",
      _displayInForeground: true,
    }));

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formatted),
    });

    if (!res.ok) {
      console.warn("Expo push send status:", res.status);
    }
  } catch (err) {
    console.error("Expo push notification send error:", err);
  }
}

// Push to specific employee devices (even when app is closed)
export async function pushToEmployee(employeeId: number, title: string, body: string, data?: any) {
  try {
    await ensureDatabaseSchema();
    const rows = await prisma.$queryRawUnsafe<Array<{ token: string }>>(
      `SELECT token FROM "DevicePushToken" WHERE "employeeId" = $1`,
      employeeId
    );

    if (rows && rows.length > 0) {
      const tokens = rows.map(r => r.token).filter(t => t && t.startsWith("ExponentPushToken"));
      if (tokens.length > 0) {
        await sendExpoPushNotifications(tokens.map(to => ({
          to,
          title,
          body,
          data,
          sound: "default",
          priority: "high",
        })));
      }
    }
  } catch (err) {
    console.error("pushToEmployee error:", err);
  }
}

// Push to all active admin/superadmin devices
export async function pushToAdmins(title: string, body: string, data?: any) {
  try {
    await ensureDatabaseSchema();
    const admins = await prisma.employee.findMany({
      where: { role: { in: ["superadmin", "admin", "hr"] }, status: "active" },
      select: { id: true }
    });

    if (admins.length === 0) return;
    const adminIds = admins.map(a => a.id);

    const rows = await prisma.$queryRawUnsafe<Array<{ token: string }>>(
      `SELECT token FROM "DevicePushToken" WHERE "employeeId" = ANY($1::int[])`,
      adminIds
    );

    if (rows && rows.length > 0) {
      const tokens = rows.map(r => r.token).filter(t => t && t.startsWith("ExponentPushToken"));
      if (tokens.length > 0) {
        await sendExpoPushNotifications(tokens.map(to => ({
          to,
          title,
          body,
          data,
          sound: "default",
          priority: "high",
        })));
      }
    }
  } catch (err) {
    console.error("pushToAdmins error:", err);
  }
}
