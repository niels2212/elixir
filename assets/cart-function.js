/* =========================================================
   CART FUNCTION – OWNER VERSION (NO LICENSE CHECK)
   ========================================================= */

(function () {
  "use strict";

  /* -----------------------------------------
     Utilities
  ----------------------------------------- */

  function triggerEvent(name, detail = {}) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function enableScroll() {
    document.body.style.overflow = "auto";
  }

  function disableScroll() {
    document.body.style.overflow = "hidden";
  }

  /* -----------------------------------------
     CART API HELPERS
  ----------------------------------------- */

  async function addToCart(formData) {
    const response = await fetch("/cart/add.js", {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw error;
    }

    return response.json();
  }

  async function updateCart(updates) {
    const response = await fetch("/cart/update.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ updates }),
    });

    return response.json();
  }

  async function fetchCart() {
    const response = await fetch("/cart.js", {
      headers: { Accept: "application/json" },
    });
    return response.json();
  }

  /* -----------------------------------------
     ADD TO CART HANDLER
  ----------------------------------------- */

  document.addEventListener("submit", async (event) => {
    const form = event.target;

    if (!form.matches("form[action*='/cart/add']")) return;

    event.preventDefault();

    const submitButton = form.querySelector('[type="submit"]');
    const formData = new FormData(form);

    try {
      submitButton && submitButton.setAttribute("disabled", "disabled");

      const item = await addToCart(formData);
      const cart = await fetchCart();

      triggerEvent("cart:item-added", { item, cart });
      triggerEvent("cart:refresh", { cart });

      enableScroll();
    } catch (error) {
      console.error("Add to cart error:", error);
      alert(error?.description || "Unable to add item to cart.");
    } finally {
      submitButton && submitButton.removeAttribute("disabled");
    }
  });

  /* -----------------------------------------
     CART QUANTITY CHANGE
  ----------------------------------------- */

  document.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-cart-quantity]");
    if (!btn) return;

    event.preventDefault();

    const line = btn.dataset.line;
    const qty = parseInt(btn.dataset.quantity, 10);

    if (!line || isNaN(qty)) return;

    const updates = {};
    updates[line] = qty;

    const cart = await updateCart(updates);
    triggerEvent("cart:refresh", { cart });
  });

  /* -----------------------------------------
     REMOVE FROM CART
  ----------------------------------------- */

  document.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-cart-remove]");
    if (!btn) return;

    event.preventDefault();

    const line = btn.dataset.line;
    if (!line) return;

    const updates = {};
    updates[line] = 0;

    const cart = await updateCart(updates);
    triggerEvent("cart:item-removed", { cart });
    triggerEvent("cart:refresh", { cart });
  });

  /* -----------------------------------------
     CART DRAWER SUPPORT
  ----------------------------------------- */

  document.addEventListener("cart:refresh", (e) => {
    const cart = e.detail.cart;

    // Update cart count
    const countEls = document.querySelectorAll("[data-cart-count]");
    countEls.forEach((el) => (el.textContent = cart.item_count));

    // Optional: Open cart drawer automatically
    const drawer = document.querySelector("cart-drawer");
    if (drawer && typeof drawer.open === "function") {
      drawer.open();
    }
  });

  /* -----------------------------------------
     FREE GIFT SUPPORT (OPTIONAL)
     Requires global freeGiftProductIds[]
  ----------------------------------------- */

  document.addEventListener("cart:refresh", async (e) => {
    if (!window.freeGiftProductIds || !window.freeGiftProductIds.length) return;

    const cart = e.detail.cart;
    const cartProductIds = cart.items.map((i) => String(i.product_id));

    for (const giftId of window.freeGiftProductIds) {
      if (!cartProductIds.includes(String(giftId))) {
        await fetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: giftId, quantity: 1 }),
        });
      }
    }
  });

  /* -----------------------------------------
     INITIAL LOAD
  ----------------------------------------- */

  document.addEventListener("DOMContentLoaded", () => {
    enableScroll();
    triggerEvent("cart:initialized");
  });
})();
