import { describe, expect, test } from "bun:test";
import { calculateBurnRateAndProjection } from "../services/budget.service";

describe("Budget Logic - calculateBurnRateAndProjection", () => {
  test("projects correctly for daily budget 1 hour in", () => {
    const periodStart = new Date("2025-01-01T00:00:00Z");
    const periodEnd = new Date("2025-01-02T00:00:00Z"); // 24h later
    const now = new Date("2025-01-01T01:00:00Z"); // 1h in
    const usedUnits = 100;
    const amountUnits = 10000;

    const result = calculateBurnRateAndProjection(
      usedUnits,
      amountUnits,
      periodStart,
      periodEnd,
      "daily",
      now,
    );

    // We expect linear projection: 100 units in 1h -> 2400 units in 24h
    // Allow some floating point variance
    expect(result.projectedEndOfPeriodUnits).toBeGreaterThan(2300);
    expect(result.projectedEndOfPeriodUnits).toBeLessThan(2500);
  });

  test("projects correctly for weekly budget 1 day in", () => {
    const periodStart = new Date("2025-01-01T00:00:00Z");
    const periodEnd = new Date("2025-01-08T00:00:00Z"); // 7 days later
    const now = new Date("2025-01-02T00:00:00Z"); // 24h in
    const usedUnits = 1000;
    const amountUnits = 10000;

    const result = calculateBurnRateAndProjection(
      usedUnits,
      amountUnits,
      periodStart,
      periodEnd,
      "weekly",
      now,
    );

    // 1000 in 1 day -> 7000 in 7 days
    expect(result.projectedEndOfPeriodUnits).toBeGreaterThan(6900);
    expect(result.projectedEndOfPeriodUnits).toBeLessThan(7100);
  });
});
