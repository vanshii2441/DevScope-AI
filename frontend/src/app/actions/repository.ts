"use server"

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function uploadRepository(formData: FormData) {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/repos/upload`, {
      method: "POST",
      headers: {
        "X-User-Id": userId,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.detail || "Failed to upload repository" };
    }

    const data = await response.json();
    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (error) {
    console.error("Upload Repository Error:", error);
    return { success: false, error: "Network error occurred while connecting to the server." };
  }
}

export async function submitRepository(url: string) {
  const { userId, getToken } = await auth();
  
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  // Extract repo name from URL roughly for now
  const urlParts = url.replace(/\/$/, "").split("/");
  const repoName = urlParts.length >= 2 ? `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}` : url;

  try {
    const response = await fetch(`${API_URL}/api/v1/repos/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // In reality, we'd pass the Clerk JWT token here
        // "Authorization": `Bearer ${await getToken()}`
        "X-User-Id": userId // Mocking for now as our backend mock expects it or we can pass it
      },
      body: JSON.stringify({
        name: repoName,
        url: url
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.detail || "Failed to submit repository" };
    }

    const data = await response.json();
    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (error) {
    console.error("Submit Repository Error:", error);
    return { success: false, error: "Network error occurred while connecting to the server." };
  }
}

export async function getRepositories() {
  const { userId } = await auth();
  
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/repos/`, {
      method: "GET",
      headers: {
        "X-User-Id": userId
      },
      // cache: "no-store", // Optional: to always fetch fresh data
    });

    if (!response.ok) {
      return { success: false, error: "Failed to fetch repositories" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Get Repositories Error:", error);
    return { success: false, error: "Network error occurred while connecting to the server." };
  }
}
