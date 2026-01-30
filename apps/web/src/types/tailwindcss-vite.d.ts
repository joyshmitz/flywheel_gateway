/**
 * Ambient module declaration for Tailwind's Vite plugin.
 */
declare module "@tailwindcss/vite" {
  const plugin: () => unknown;
  export default plugin;
}
