import { describe, expect, it } from "bun:test";
import {
  BREAKPOINTS,
  getCurrentBreakpoint,
  isDesktopBreakpoint,
  isMobileBreakpoint,
  isTabletBreakpoint,
} from "../../styles/breakpoints";

describe("breakpoints", () => {
  describe("BREAKPOINTS", () => {
    it("should have all expected breakpoints", () => {
      expect(BREAKPOINTS.xs).toBe(320);
      expect(BREAKPOINTS.sm).toBe(480);
      expect(BREAKPOINTS.md).toBe(768);
      expect(BREAKPOINTS.lg).toBe(1024);
      expect(BREAKPOINTS.xl).toBe(1280);
      expect(BREAKPOINTS.xxl).toBe(1536);
    });
  });

  describe("getCurrentBreakpoint", () => {
    it("should return xs for small widths", () => {
      expect(getCurrentBreakpoint(300)).toBe("xs");
      expect(getCurrentBreakpoint(319)).toBe("xs");
    });

    it("should return sm for phone widths", () => {
      expect(getCurrentBreakpoint(480)).toBe("sm");
      expect(getCurrentBreakpoint(600)).toBe("sm");
    });

    it("should return md for tablet widths", () => {
      expect(getCurrentBreakpoint(768)).toBe("md");
      expect(getCurrentBreakpoint(900)).toBe("md");
    });

    it("should return lg for laptop widths", () => {
      expect(getCurrentBreakpoint(1024)).toBe("lg");
      expect(getCurrentBreakpoint(1200)).toBe("lg");
    });

    it("should return xl for desktop widths", () => {
      expect(getCurrentBreakpoint(1280)).toBe("xl");
      expect(getCurrentBreakpoint(1400)).toBe("xl");
    });

    it("should return xxl for large widths", () => {
      expect(getCurrentBreakpoint(1536)).toBe("xxl");
      expect(getCurrentBreakpoint(2000)).toBe("xxl");
    });
  });

  describe("isMobileBreakpoint", () => {
    it("should return true for mobile breakpoints", () => {
      expect(isMobileBreakpoint("xs")).toBe(true);
      expect(isMobileBreakpoint("sm")).toBe(true);
    });

    it("should return false for non-mobile breakpoints", () => {
      expect(isMobileBreakpoint("md")).toBe(false);
      expect(isMobileBreakpoint("lg")).toBe(false);
      expect(isMobileBreakpoint("xl")).toBe(false);
      expect(isMobileBreakpoint("xxl")).toBe(false);
    });
  });

  describe("isTabletBreakpoint", () => {
    it("should return true for tablet breakpoints", () => {
      expect(isTabletBreakpoint("md")).toBe(true);
    });

    it("should return false for non-tablet breakpoints", () => {
      expect(isTabletBreakpoint("xs")).toBe(false);
      expect(isTabletBreakpoint("sm")).toBe(false);
      expect(isTabletBreakpoint("lg")).toBe(false);
      expect(isTabletBreakpoint("xl")).toBe(false);
      expect(isTabletBreakpoint("xxl")).toBe(false);
    });
  });

  describe("isDesktopBreakpoint", () => {
    it("should return true for desktop breakpoints", () => {
      expect(isDesktopBreakpoint("lg")).toBe(true);
      expect(isDesktopBreakpoint("xl")).toBe(true);
      expect(isDesktopBreakpoint("xxl")).toBe(true);
    });

    it("should return false for non-desktop breakpoints", () => {
      expect(isDesktopBreakpoint("xs")).toBe(false);
      expect(isDesktopBreakpoint("sm")).toBe(false);
      expect(isDesktopBreakpoint("md")).toBe(false);
    });
  });
});
