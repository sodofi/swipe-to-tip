import { sendFrameNotification } from "@/lib/notification-client";
import {
  deleteUserNotificationDetails,
  setUserNotificationDetails,
} from "@/lib/memory-store";
import { createPublicClient, http } from "viem";
import { optimism } from "viem/chains";

const KEY_REGISTRY_ADDRESS = "0x00000000Fc1237824fb747aBDE0FF18990E59b7e";

const KEY_REGISTRY_ABI = [
  {
    inputs: [
      { name: "fid", type: "uint256" },
      { name: "key", type: "bytes" },
    ],
    name: "keyDataOf",
    outputs: [
      {
        components: [
          { name: "state", type: "uint8" },
          { name: "keyType", type: "uint32" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

async function verifyFidOwnership(fid: number, appKey: `0x${string}`) {
  const client = createPublicClient({
    chain: optimism,
    transport: http(),
  });

  try {
    const result = await client.readContract({
      address: KEY_REGISTRY_ADDRESS,
      abi: KEY_REGISTRY_ABI,
      functionName: "keyDataOf",
      args: [BigInt(fid), appKey],
    });

    return result.state === 1 && result.keyType === 1;
  } catch (error) {
    console.error("Key Registry verification failed:", error);
    return false;
  }
}

function decode(encoded: string) {
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { untrustedData, trustedData } = body;

    if (untrustedData?.buttonIndex === 1) {
      // Add frame notification
      const { fid } = decode(trustedData.messageBytes);
      const appKey = `0x${Buffer.from(
        decode(untrustedData.state || "{}").publicKey || "",
        "base64"
      ).toString("hex")}` as `0x${string}`;

      const isValidKey = await verifyFidOwnership(fid, appKey);
      if (!isValidKey) {
        return new Response("Unauthorized", { status: 401 });
      }

      await setUserNotificationDetails(fid, {
        url: untrustedData.url,
        token: untrustedData.notificationDetails?.token || "",
      });

      // Send a test notification
      await sendFrameNotification({
        fid,
        title: "Welcome to farcaster-miniapp!",
        body: "You've successfully enabled notifications.",
      });

      return new Response("OK");
    } else if (untrustedData?.buttonIndex === 2) {
      // Remove frame notification
      const { fid } = decode(trustedData.messageBytes);
      await deleteUserNotificationDetails(fid);
      return new Response("OK");
    }

    return new Response("Invalid request", { status: 400 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
