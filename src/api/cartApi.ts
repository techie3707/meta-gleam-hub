/**
 * Cart API - User Metadata Based
 * Handles shopping cart operations using eperson.cart metadata
 * Cart items stored as: itemUUID_bitstreamUUID_dateAdded_pageRange
 */

import axiosInstance from "./axiosInstance";
import { siteConfig } from "@/config/siteConfig";

export interface CartItemInfo {
  fullValue: string;
  itemId: string;
  bitstreamId: string;
  date: string;
  pages: string | null;
  name?: string; // Document title/name
}

/**
 * Add item to user's cart via eperson metadata
 * Format: itemUUID_bitstreamUUID_YYYY-MM-DD_pageRange
 */
export const updateUserCart = async (
  userId: string,
  bitstreamId: string,
  itemId?: string,
  pageRange?: string
): Promise<void> => {
  const authToken = localStorage.getItem(siteConfig.auth.tokenKey) || "";
  const csrfToken = localStorage.getItem("csrfToken") || "";

  // Format: itemUUID_bitstreamUUID_dateAdded_pageRange
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const cartValue = itemId
    ? `${itemId}_${bitstreamId}_${today}_${pageRange || ""}`
    : `${bitstreamId}_${today}_${pageRange || ""}`;

  const payload = [
    {
      op: "add",
      path: "/metadata/eperson.cart",
      value: cartValue,
    },
  ];

  try {
    await axiosInstance.patch(
      `/api/eperson/epersons/${userId}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrfToken,
          Authorization: `Bearer ${authToken}`,
        },
        withCredentials: true,
      }
    );
  } catch (error) {
    console.error("Failed to add item to cart:", error);
    throw error;
  }
};

/**
 * Remove item from user's cart
 */
export const removeFromCart = async (
  userId: string,
  cartItemValue: string
): Promise<void> => {
  const authToken = localStorage.getItem(siteConfig.auth.tokenKey) || "";
  const csrfToken = localStorage.getItem("csrfToken") || "";

  const payload = [
    {
      op: "remove",
      path: "/metadata/eperson.cart",
      value: cartItemValue,
    },
  ];

  try {
    await axiosInstance.patch(
      `/api/eperson/epersons/${userId}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrfToken,
          Authorization: `Bearer ${authToken}`,
        },
        withCredentials: true,
      }
    );
  } catch (error) {
    console.error("Failed to remove item from cart:", error);
    throw error;
  }
};

/**
 * Clear entire user cart
 */
export const clearUserCart = async (userId: string): Promise<void> => {
  const authToken = localStorage.getItem(siteConfig.auth.tokenKey) || "";
  const csrfToken = localStorage.getItem("csrfToken") || "";

  const payload = [
    {
      op: "remove",
      path: "/metadata/eperson.cart",
    },
  ];

  try {
    await axiosInstance.patch(
      `/api/eperson/epersons/${userId}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrfToken,
          Authorization: `Bearer ${authToken}`,
        },
        withCredentials: true,
      }
    );
  } catch (error) {
    console.error("Failed to clear cart:", error);
    throw error;
  }
};

/**
 * Parse cart item format: itemId_bitstreamId_date_pages
 */
export const parseCartItem = (raw: string): CartItemInfo | null => {
  // Parse: UUID_UUID_YYYY-MM-DD_pageRange (pageRange optional)
  const match = raw.match(
    /^([a-f0-9-]{36})_([a-f0-9-]{36})_([\d]{4}-[\d]{2}-[\d]{2})_(.*)$/i
  );

  if (match) {
    return {
      fullValue: raw,
      itemId: match[1],
      bitstreamId: match[2],
      date: match[3],
      pages: match[4] || null,
    };
  }

  return null;
};
