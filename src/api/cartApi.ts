/**
 * Cart API
 * Handles shopping cart operations for items
 */

import axiosInstance from "./axiosInstance";

export interface CartItem {
  id: string;
  itemId: string;
  itemName: string;
  addedAt: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  totalItems: number;
}

/**
 * Get current user's cart
 */
export const getCart = async (): Promise<Cart | null> => {
  try {
    const response = await axiosInstance.get("/api/cart");
    return {
      id: response.data.id,
      items: response.data._embedded?.items || [],
      totalItems: response.data._embedded?.items?.length || 0,
    };
  } catch (error) {
    console.error("Get cart error:", error);
    return null;
  }
};

/**
 * Add item to cart
 */
export const addToCart = async (itemId: string): Promise<boolean> => {
  try {
    await axiosInstance.post(
      "/api/cart/items",
      `${axiosInstance.defaults.baseURL}/api/core/items/${itemId}`,
      {
        headers: {
          "Content-Type": "text/uri-list",
        },
      }
    );
    return true;
  } catch (error) {
    console.error("Add to cart error:", error);
    return false;
  }
};

/**
 * Remove item from cart
 */
export const removeFromCart = async (cartItemId: string): Promise<boolean> => {
  try {
    await axiosInstance.delete(`/api/cart/items/${cartItemId}`);
    return true;
  } catch (error) {
    console.error("Remove from cart error:", error);
    return false;
  }
};

/**
 * Clear all items from cart
 */
export const clearCart = async (): Promise<boolean> => {
  try {
    await axiosInstance.delete("/api/cart/items");
    return true;
  } catch (error) {
    console.error("Clear cart error:", error);
    return false;
  }
};

/**
 * Download all items in cart as ZIP
 */
export const downloadCartAsZip = async (): Promise<void> => {
  try {
    const response = await axiosInstance.get("/api/cart/download", {
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "application/zip" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cart-download.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download cart error:", error);
    throw error;
  }
};
