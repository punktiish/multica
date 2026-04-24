import "@testing-library/jest-dom/vitest";

const storage = (() => {
  let items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
    removeItem: (key: string) => {
      items.delete(key);
    },
    clear: () => {
      items = new Map();
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: storage,
  configurable: true,
});
