/**
 * Cost Analytics Routes - REST API endpoints for cost tracking and optimization.
 */

import { type Context, Hono } from "hono";
import { z } from "zod";
import { getLogger } from "../middleware/correlation";
import type { BudgetPeriod, ProviderId } from "../models/cost";
import {
  acknowledgeBudgetAlert,
  checkBudgetThresholds,
  createBudget,
  deleteBudget,
  getAllBudgetStatuses,
  getBudget,
  getBudgetAlerts,
  getBudgetStatus,
  listBudgets,
  updateBudget,
} from "../services/budget.service";
import {
  calculateForecastAccuracy,
  generateForecast,
  generateScenarios,
  getLatestForecast,
} from "../services/cost-forecast.service";
import {
  generateRecommendations,
  getOptimizationSummary,
  getRecommendations,
  updateRecommendationStatus,
} from "../services/cost-optimization.service";
import {
  formatCostUnits,
  getAllRateCards,
  getCostBreakdown,
  getCostRecords,
  getCostSummary,
  getDailyCostTrend,
  getHourlyCostTrend,
  getTopSpendingAgents,
  recordCost,
  upsertRateCard,
} from "../services/cost-tracker.service";
import {
  sendCreated,
  sendError,
  sendInternalError,
  sendList,
  sendNoContent,
  sendNotFound,
  sendResource,
  sendValidationError,
} from "../utils/response";
import { transformZodError } from "../utils/validation";

const costAnalytics = new Hono();

// ============================================================================
// Validation Schemas
// ============================================================================

const CostRecordInputSchema = z.object({
  organizationId: z.string().optional(),
  projectId: z.string().optional(),
  agentId: z.string().optional(),
  taskId: z.string().optional(),
  sessionId: z.string().optional(),
  model: z.string(),
  provider: z.enum(["anthropic", "openai", "google", "local"]),
  promptTokens: z.number().int().min(0),
  completionTokens: z.number().int().min(0),
  cachedTokens: z.number().int().min(0).optional(),
  taskType: z.string().optional(),
  complexityTier: z.enum(["simple", "moderate", "complex"]).optional(),
  success: z.boolean(),
  requestDurationMs: z.number().int().min(0).optional(),
  correlationId: z.string().optional(),
});

const BudgetInputSchema = z.object({
  name: z.string().min(1).max(100),
  organizationId: z.string().optional(),
  projectId: z.string().optional(),
  period: z.enum(["daily", "weekly", "monthly", "yearly"]),
  amountUnits: z.number().int().min(1),
  alertThresholds: z.array(z.number().min(0).max(100)).optional(),
  actionOnExceed: z.enum(["alert", "throttle", "block"]).optional(),
  rollover: z.boolean().optional(),
  effectiveDate: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  enabled: z.boolean().optional(),
});

const BudgetUpdateSchema = BudgetInputSchema.partial();

const ForecastOptionsSchema = z.object({
  organizationId: z.string().optional(),
  projectId: z.string().optional(),
  horizonDays: z.number().int().min(1).max(90).optional(),
  historicalDays: z.number().int().min(7).max(365).optional(),
  methodology: z.enum(["linear", "exponential", "ensemble"]).optional(),
});

const RecommendationStatusSchema = z.object({
  status: z.enum([
    "pending",
    "in_progress",
    "implemented",
    "rejected",
    "failed",
  ]),
  implementedBy: z.string().optional(),
  rejectedReason: z.string().optional(),
  actualSavingsUnits: z.number().int().optional(),
});

const RateCardSchema = z.object({
  model: z.string(),
  provider: z.enum(["anthropic", "openai", "google", "local"]),
  promptCostPer1kTokens: z.number().int().min(0),
  completionCostPer1kTokens: z.number().int().min(0),
  cachedPromptCostPer1kTokens: z.number().int().min(0).optional(),
  effectiveDate: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

// ============================================================================
// Error Handler Helper
// ============================================================================

function handleError(error: unknown, c: Context) {
  const log = getLogger();

  if (error instanceof z.ZodError) {
    return sendValidationError(c, transformZodError(error));
  }

  log.error({ error }, "Unexpected error in cost-analytics route");
  return sendInternalError(c);
}

// ============================================================================
// Cost Tracking Routes
// ============================================================================

/**
 * POST /cost-analytics/records - Record a cost event
 */
costAnalytics.post("/records", async (c) => {
  try {
    const body = await c.req.json();
    const validated = CostRecordInputSchema.parse(body);

    const record = await recordCost({
      ...validated,
      provider: validated.provider as ProviderId,
    });

    return sendCreated(
      c,
      "costRecord",
      {
        id: record.id,
        timestamp: record.timestamp.toISOString(),
        model: record.model,
        totalCostUnits: record.totalCostUnits,
        formattedCost: formatCostUnits(record.totalCostUnits),
      },
      `/cost-analytics/records/${record.id}`,
    );
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * GET /cost-analytics/records - Get cost records with filtering
 */
costAnalytics.get("/records", async (c) => {
  try {
    const filter = {
      organizationId: c.req.query("organizationId") || undefined,
      projectId: c.req.query("projectId") || undefined,
      agentId: c.req.query("agentId") || undefined,
      model: c.req.query("model") || undefined,
      provider: (c.req.query("provider") as ProviderId) || undefined,
      since: c.req.query("since") ? new Date(c.req.query("since")!) : undefined,
      until: c.req.query("until") ? new Date(c.req.query("until")!) : undefined,
      limit: c.req.query("limit")
        ? parseInt(c.req.query("limit")!, 10)
        : undefined,
      startingAfter: c.req.query("startingAfter") || undefined,
    };

    const result = await getCostRecords(filter);

    const items = result.records.map((r) => ({
      id: r.id,
      timestamp: r.timestamp.toISOString(),
      model: r.model,
      provider: r.provider,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      totalCostUnits: r.totalCostUnits,
      formattedCost: formatCostUnits(r.totalCostUnits),
      success: r.success,
      agentId: r.agentId,
      taskType: r.taskType,
    }));

    return sendList(c, items, {
      total: result.total,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
      prevCursor: result.prevCursor,
    });
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * GET /cost-analytics/summary - Get cost summary for a period
 */
costAnalytics.get("/summary", async (c) => {
  try {
    const filter = {
      organizationId: c.req.query("organizationId") || undefined,
      projectId: c.req.query("projectId") || undefined,
      agentId: c.req.query("agentId") || undefined,
      since: c.req.query("since") ? new Date(c.req.query("since")!) : undefined,
      until: c.req.query("until") ? new Date(c.req.query("until")!) : undefined,
    };

    const summary = await getCostSummary(filter);

    return sendResource(c, "costSummary", {
      ...summary,
      formattedTotalCost: formatCostUnits(summary.totalCostUnits),
      formattedAvgCost: formatCostUnits(summary.avgCostPerRequest),
    });
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * GET /cost-analytics/breakdown/:dimension - Get cost breakdown by dimension
 */
costAnalytics.get("/breakdown/:dimension", async (c) => {
  try {
    const dimension = c.req.param("dimension") as
      | "model"
      | "agent"
      | "project"
      | "provider";

    if (!["model", "agent", "project", "provider"].includes(dimension)) {
      return sendError(
        c,
        "INVALID_DIMENSION",
        "Dimension must be one of: model, agent, project, provider",
        400,
      );
    }

    const filter = {
      organizationId: c.req.query("organizationId") || undefined,
      projectId: c.req.query("projectId") || undefined,
      since: c.req.query("since") ? new Date(c.req.query("since")!) : undefined,
      until: c.req.query("until") ? new Date(c.req.query("until")!) : undefined,
    };

    const breakdown = await getCostBreakdown(dimension, filter);

    return sendResource(c, "costBreakdown", {
      dimension: breakdown.dimension,
      totalCostUnits: breakdown.totalCostUnits,
      formattedTotalCost: formatCostUnits(breakdown.totalCostUnits),
      period: {
        start: breakdown.period.start.toISOString(),
        end: breakdown.period.end.toISOString(),
      },
      items: breakdown.items.map((item) => ({
        ...item,
        formattedCost: formatCostUnits(item.totalCostUnits),
      })),
    });
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * GET /cost-analytics/trends/hourly - Get hourly cost trend
 */
costAnalytics.get("/trends/hourly", async (c) => {
  try {
    const filter = {
      organizationId: c.req.query("organizationId") || undefined,
      projectId: c.req.query("projectId") || undefined,
      since: c.req.query("since") ? new Date(c.req.query("since")!) : undefined,
      until: c.req.query("until") ? new Date(c.req.query("until")!) : undefined,
    };
    const hours = c.req.query("hours")
      ? parseInt(c.req.query("hours")!, 10)
      : 24;

    const trend = await getHourlyCostTrend(filter, hours);

    return sendList(
      c,
      trend.map((t) => ({
        hour: t.hour.toISOString(),
        costUnits: t.costUnits,
        formattedCost: formatCostUnits(t.costUnits),
        requestCount: t.requestCount,
      })),
      { total: trend.length },
    );
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * GET /cost-analytics/trends/daily - Get daily cost trend
 */
costAnalytics.get("/trends/daily", async (c) => {
  try {
    const filter = {
      organizationId: c.req.query("organizationId") || undefined,
      projectId: c.req.query("projectId") || undefined,
      since: c.req.query("since") ? new Date(c.req.query("since")!) : undefined,
      until: c.req.query("until") ? new Date(c.req.query("until")!) : undefined,
    };
    const days = c.req.query("days") ? parseInt(c.req.query("days")!, 10) : 30;

    const trend = await getDailyCostTrend(filter, days);

    return sendList(
      c,
      trend.map((t) => ({
        date: t.date.toISOString(),
        costUnits: t.costUnits,
        formattedCost: formatCostUnits(t.costUnits),
        requestCount: t.requestCount,
      })),
      { total: trend.length },
    );
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * GET /cost-analytics/top-agents - Get top spending agents
 */
costAnalytics.get("/top-agents", async (c) => {
  try {
    const filter = {
      organizationId: c.req.query("organizationId") || undefined,
      projectId: c.req.query("projectId") || undefined,
      since: c.req.query("since") ? new Date(c.req.query("since")!) : undefined,
      until: c.req.query("until") ? new Date(c.req.query("until")!) : undefined,
    };
    const limit = c.req.query("limit")
      ? parseInt(c.req.query("limit")!, 10)
      : 10;

    const agents = await getTopSpendingAgents(filter, limit);

    return sendList(
      c,
      agents.map((a) => ({
        ...a,
        formattedCost: formatCostUnits(a.totalCostUnits),
        formattedAvgCost: formatCostUnits(a.avgCostPerRequest),
      })),
      { total: agents.length },
    );
  } catch (error) {
    return handleError(error, c);
  }
});

// ============================================================================
// Budget Routes
// ============================================================================

/**
 * POST /cost-analytics/budgets - Create a budget
 */
costAnalytics.post("/budgets", async (c) => {
  try {
    const body = await c.req.json();
    const validated = BudgetInputSchema.parse(body);

    const budget = await createBudget({
      ...validated,
      period: validated.period as BudgetPeriod,
      effectiveDate: validated.effectiveDate
        ? new Date(validated.effectiveDate)
        : undefined,
      expiresAt: validated.expiresAt
        ? new Date(validated.expiresAt)
        : undefined,
    });

    return sendCreated(
      c,
      "budget",
      {
        id: budget.id,
        name: budget.name,
        period: budget.period,
        amountUnits: budget.amountUnits,
        formattedAmount: formatCostUnits(budget.amountUnits),
        enabled: budget.enabled,
      },
      `/cost-analytics/budgets/${budget.id}`,
    );
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * GET /cost-analytics/budgets - List budgets
 */
costAnalytics.get("/budgets", async (c) => {
  try {
    const filter = {
      organizationId: c.req.query("organizationId") || undefined,
      projectId: c.req.query("projectId") || undefined,
      enabled:
        c.req.query("enabled") !== undefined
          ? c.req.query("enabled") === "true"
          : undefined,
    };

    const budgetList = await listBudgets(filter);

    const items = budgetList.map((b) => ({
      id: b.id,
      name: b.name,
      period: b.period,
      amountUnits: b.amountUnits,
      formattedAmount: formatCostUnits(b.amountUnits),
      enabled: b.enabled,
      actionOnExceed: b.actionOnExceed,
      alertThresholds: b.alertThresholds,
    }));

    return sendList(c, items, { total: items.length });
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * GET /cost-analytics/budgets/:budgetId - Get a budget
 */
costAnalytics.get("/budgets/:budgetId", async (c) => {
  try {
    const budgetId = c.req.param("budgetId");
    const budget = await getBudget(budgetId);

    if (!budget) {
      return sendNotFound(c, "budget", budgetId);
    }

    return sendResource(c, "budget", {
      ...budget,
      effectiveDate: budget.effectiveDate.toISOString(),
      expiresAt: budget.expiresAt?.toISOString(),
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
      formattedAmount: formatCostUnits(budget.amountUnits),
    });
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * PUT /cost-analytics/budgets/:budgetId - Update a budget
 */
costAnalytics.put("/budgets/:budgetId", async (c) => {
  try {
    const budgetId = c.req.param("budgetId");
    const body = await c.req.json();
    const validated = BudgetUpdateSchema.parse(body);

    const updated = await updateBudget(budgetId, {
      ...validated,
      effectiveDate: validated.effectiveDate
        ? new Date(validated.effectiveDate)
        : undefined,
      expiresAt: validated.expiresAt
        ? new Date(validated.expiresAt)
        : undefined,
    });

    if (!updated) {
      return sendNotFound(c, "budget", budgetId);
    }

    return sendResource(c, "budget", {
      id: updated.id,
      name: updated.name,
      period: updated.period,
      amountUnits: updated.amountUnits,
      formattedAmount: formatCostUnits(updated.amountUnits),
      enabled: updated.enabled,
    });
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * DELETE /cost-analytics/budgets/:budgetId - Delete a budget
 */
costAnalytics.delete("/budgets/:budgetId", async (c) => {
  try {
    const budgetId = c.req.param("budgetId");
    const deleted = await deleteBudget(budgetId);

    if (!deleted) {
      return sendNotFound(c, "budget", budgetId);
    }

    return sendNoContent(c);
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * GET /cost-analytics/budgets/:budgetId/status - Get budget status
 */
costAnalytics.get("/budgets/:budgetId/status", async (c) => {
  try {
    const budgetId = c.req.param("budgetId");
    const status = await getBudgetStatus(budgetId);

    if (!status) {
      return sendNotFound(c, "budget", budgetId);
    }

    return sendResource(c, "budgetStatus", {
      budgetId: status.budget.id,
      budgetName: status.budget.name,
      periodStart: status.periodStart.toISOString(),
      periodEnd: status.periodEnd.toISOString(),
      usedUnits: status.usedUnits,
      usedPercent: status.usedPercent,
      remainingUnits: status.remainingUnits,
      formattedUsed: formatCostUnits(status.usedUnits),
      formattedRemaining: formatCostUnits(status.remainingUnits),
      burnRateUnitsPerDay: status.burnRateUnitsPerDay,
      projectedEndOfPeriodUnits: status.projectedEndOfPeriodUnits,
      projectedExceed: status.projectedExceed,
      daysUntilExhausted: status.daysUntilExhausted,
      status: status.status,
      currentThreshold: status.currentThreshold,
      alertsTriggered: status.alertsTriggered,
      lastUpdatedAt: status.lastUpdatedAt.toISOString(),
    });
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * GET /cost-analytics/budget-statuses - Get all budget statuses
 */
costAnalytics.get("/budget-statuses", async (c) => {
  try {
    const statuses = await getAllBudgetStatuses();

    const items = statuses.map((status) => ({
      budgetId: status.budget.id,
      budgetName: status.budget.name,
      periodStart: status.periodStart.toISOString(),
      periodEnd: status.periodEnd.toISOString(),
      usedPercent: status.usedPercent,
      status: status.status,
      projectedExceed: status.projectedExceed,
    }));

    return sendList(c, items, { total: items.length });
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * POST /cost-analytics/budgets/:budgetId/check - Check budget thresholds
 */
costAnalytics.post("/budgets/:budgetId/check", async (c) => {
  try {
    const budgetId = c.req.param("budgetId");
    const result = await checkBudgetThresholds(budgetId);

    return sendResource(c, "thresholdCheck", result);
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * GET /cost-analytics/budget-alerts - Get budget alerts
 */
costAnalytics.get("/budget-alerts", async (c) => {
  try {
    const filter = {
      budgetId: c.req.query("budgetId") || undefined,
      acknowledged:
        c.req.query("acknowledged") !== undefined
          ? c.req.query("acknowledged") === "true"
          : undefined,
      since: c.req.query("since") ? new Date(c.req.query("since")!) : undefined,
      limit: c.req.query("limit")
        ? parseInt(c.req.query("limit")!, 10)
        : undefined,
    };

    const alerts = await getBudgetAlerts(filter);

    const items = alerts.map((a) => ({
      ...a,
      periodStart: a.periodStart.toISOString(),
      periodEnd: a.periodEnd.toISOString(),
      acknowledgedAt: a.acknowledgedAt?.toISOString(),
      createdAt: a.createdAt.toISOString(),
    }));

    return sendList(c, items, { total: items.length });
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * POST /cost-analytics/budget-alerts/:alertId/acknowledge - Acknowledge alert
 */
costAnalytics.post("/budget-alerts/:alertId/acknowledge", async (c) => {
  try {
    const alertId = c.req.param("alertId");
    const body = await c.req.json().catch(() => ({}));
    const acknowledgedBy = (body as { acknowledgedBy?: string }).acknowledgedBy;

    const success = await acknowledgeBudgetAlert(alertId, acknowledgedBy);

    if (!success) {
      return sendNotFound(c, "budgetAlert", alertId);
    }

    return sendResource(c, "budgetAlert", { id: alertId, acknowledged: true });
  } catch (error) {
    return handleError(error, c);
  }
});

// ============================================================================
// Forecast Routes
// ============================================================================

/**
 * POST /cost-analytics/forecasts - Generate a new forecast
 */
costAnalytics.post("/forecasts", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const validated = ForecastOptionsSchema.parse(body);

    const forecast = await generateForecast(validated);

    return sendCreated(
      c,
      "forecast",
      {
        id: forecast.id,
        forecastDate: forecast.forecastDate.toISOString(),
        horizonDays: forecast.horizonDays,
        totalForecastUnits: forecast.totalForecastUnits,
        formattedForecast: formatCostUnits(forecast.totalForecastUnits),
        methodology: forecast.methodology,
        trendDirection: forecast.trendDirection,
        confidence95: forecast.confidenceInterval95,
      },
      `/cost-analytics/forecasts/${forecast.id}`,
    );
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * GET /cost-analytics/forecasts/latest - Get the latest forecast
 */
costAnalytics.get("/forecasts/latest", async (c) => {
  try {
    const filter = {
      organizationId: c.req.query("organizationId") || undefined,
      projectId: c.req.query("projectId") || undefined,
    };

    const forecast = await getLatestForecast(filter);

    if (!forecast) {
      return sendResource(c, "forecast", null);
    }

    return sendResource(c, "forecast", {
      id: forecast.id,
      forecastDate: forecast.forecastDate.toISOString(),
      horizonDays: forecast.horizonDays,
      totalForecastUnits: forecast.totalForecastUnits,
      formattedForecast: formatCostUnits(forecast.totalForecastUnits),
      confidence95: forecast.confidenceInterval95,
      methodology: forecast.methodology,
      accuracyMetrics: forecast.accuracyMetrics,
      trendDirection: forecast.trendDirection,
      trendStrength: forecast.trendStrength,
      seasonalityDetected: forecast.seasonalityDetected,
      historicalDaysUsed: forecast.historicalDaysUsed,
      dailyForecasts: forecast.dailyForecasts.map((df) => ({
        date: df.date.toISOString(),
        predictedCostUnits: df.predictedCostUnits,
        formattedPredicted: formatCostUnits(df.predictedCostUnits),
        lowerBoundUnits: df.lowerBoundUnits,
        upperBoundUnits: df.upperBoundUnits,
        confidence: df.confidence,
      })),
      createdAt: forecast.createdAt.toISOString(),
    });
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * GET /cost-analytics/forecasts/:forecastId/scenarios - Get forecast scenarios
 */
costAnalytics.get("/forecasts/:forecastId/scenarios", async (c) => {
  try {
    const filter = {
      organizationId: c.req.query("organizationId") || undefined,
      projectId: c.req.query("projectId") || undefined,
    };

    const forecast = await getLatestForecast(filter);

    if (!forecast) {
      return sendNotFound(c, "forecast", c.req.param("forecastId"));
    }

    const scenarios = await generateScenarios(forecast);

    const items = scenarios.map((s) => ({
      name: s.name,
      description: s.description,
      adjustmentPercent: s.adjustmentPercent,
      totalForecastUnits: s.totalForecastUnits,
      formattedForecast: formatCostUnits(s.totalForecastUnits),
    }));

    return sendList(c, items, { total: items.length });
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * GET /cost-analytics/forecasts/:forecastId/accuracy - Get forecast accuracy
 */
costAnalytics.get("/forecasts/:forecastId/accuracy", async (c) => {
  try {
    const forecastId = c.req.param("forecastId");
    const accuracy = await calculateForecastAccuracy(forecastId);

    if (!accuracy) {
      return sendNotFound(c, "forecast", forecastId);
    }

    return sendResource(c, "forecastAccuracy", accuracy);
  } catch (error) {
    return handleError(error, c);
  }
});

// ============================================================================
// Optimization Routes
// ============================================================================

/**
 * POST /cost-analytics/recommendations/generate - Generate recommendations
 */
costAnalytics.post("/recommendations/generate", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const options = {
      organizationId: (body as { organizationId?: string }).organizationId,
      projectId: (body as { projectId?: string }).projectId,
      daysBack: (body as { daysBack?: number }).daysBack,
    };

    const recommendations = await generateRecommendations(options);

    return sendCreated(c, "recommendations", {
      count: recommendations.length,
      totalPotentialSavingsUnits: recommendations.reduce(
        (sum, r) => sum + r.estimatedSavingsUnits,
        0,
      ),
      formattedSavings: formatCostUnits(
        recommendations.reduce((sum, r) => sum + r.estimatedSavingsUnits, 0),
      ),
    });
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * GET /cost-analytics/recommendations - Get recommendations
 */
costAnalytics.get("/recommendations", async (c) => {
  try {
    const filter = {
      organizationId: c.req.query("organizationId") || undefined,
      projectId: c.req.query("projectId") || undefined,
      category: c.req.query("category") as
        | "model_optimization"
        | "caching"
        | "batching"
        | "context_optimization"
        | "consolidation"
        | "scheduling"
        | "rate_limiting"
        | undefined,
      status: c.req.query("status") as
        | "pending"
        | "in_progress"
        | "implemented"
        | "rejected"
        | "failed"
        | undefined,
      limit: c.req.query("limit")
        ? parseInt(c.req.query("limit")!, 10)
        : undefined,
    };

    const recommendations = await getRecommendations(filter);

    const items = recommendations.map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      description: r.description,
      estimatedSavingsUnits: r.estimatedSavingsUnits,
      formattedSavings: formatCostUnits(r.estimatedSavingsUnits),
      savingsPercent: r.savingsPercent,
      confidence: r.confidence,
      risk: r.risk,
      status: r.status,
      priority: r.priority,
      implementation: r.implementation,
      createdAt: r.createdAt.toISOString(),
    }));

    return sendList(c, items, { total: items.length });
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * GET /cost-analytics/recommendations/summary - Get optimization summary
 */
costAnalytics.get("/recommendations/summary", async (c) => {
  try {
    const filter = {
      organizationId: c.req.query("organizationId") || undefined,
      projectId: c.req.query("projectId") || undefined,
    };

    const summary = await getOptimizationSummary(filter);

    return sendResource(c, "optimizationSummary", {
      totalRecommendations: summary.totalRecommendations,
      byCategory: summary.byCategory,
      totalPotentialSavingsUnits: summary.totalPotentialSavingsUnits,
      formattedPotentialSavings: formatCostUnits(
        summary.totalPotentialSavingsUnits,
      ),
      implementedSavingsUnits: summary.implementedSavingsUnits,
      formattedImplementedSavings: formatCostUnits(
        summary.implementedSavingsUnits,
      ),
      topRecommendations: summary.pendingRecommendations
        .slice(0, 5)
        .map((r) => ({
          id: r.id,
          title: r.title,
          estimatedSavingsUnits: r.estimatedSavingsUnits,
          formattedSavings: formatCostUnits(r.estimatedSavingsUnits),
        })),
    });
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * PUT /cost-analytics/recommendations/:recommendationId/status - Update status
 */
costAnalytics.put("/recommendations/:recommendationId/status", async (c) => {
  try {
    const recommendationId = c.req.param("recommendationId");
    const body = await c.req.json();
    const validated = RecommendationStatusSchema.parse(body);

    const updated = await updateRecommendationStatus(
      recommendationId,
      validated.status,
      {
        implementedBy: validated.implementedBy,
        rejectedReason: validated.rejectedReason,
        actualSavingsUnits: validated.actualSavingsUnits,
      },
    );

    if (!updated) {
      return sendNotFound(c, "recommendation", recommendationId);
    }

    return sendResource(c, "recommendation", {
      id: updated.id,
      status: updated.status,
      implementedAt: updated.implementedAt?.toISOString(),
      actualSavingsUnits: updated.actualSavingsUnits,
    });
  } catch (error) {
    return handleError(error, c);
  }
});

// ============================================================================
// Rate Card Routes
// ============================================================================

/**
 * GET /cost-analytics/rate-cards - Get all rate cards
 */
costAnalytics.get("/rate-cards", async (c) => {
  try {
    const rateCards = await getAllRateCards();

    const items = rateCards.map((rc) => ({
      model: rc.model,
      provider: rc.provider,
      promptCostPer1kTokens: rc.promptCostPer1kTokens,
      completionCostPer1kTokens: rc.completionCostPer1kTokens,
      cachedPromptCostPer1kTokens: rc.cachedPromptCostPer1kTokens,
      effectiveDate: rc.effectiveDate.toISOString(),
      expiresAt: rc.expiresAt?.toISOString(),
    }));

    return sendList(c, items, { total: items.length });
  } catch (error) {
    return handleError(error, c);
  }
});

/**
 * POST /cost-analytics/rate-cards - Create or update a rate card
 */
costAnalytics.post("/rate-cards", async (c) => {
  try {
    const body = await c.req.json();
    const validated = RateCardSchema.parse(body);

    const rateCard = await upsertRateCard({
      ...validated,
      provider: validated.provider as ProviderId,
      effectiveDate: validated.effectiveDate
        ? new Date(validated.effectiveDate)
        : undefined,
      expiresAt: validated.expiresAt
        ? new Date(validated.expiresAt)
        : undefined,
    });

    return sendCreated(c, "rateCard", {
      model: rateCard.model,
      provider: rateCard.provider,
      promptCostPer1kTokens: rateCard.promptCostPer1kTokens,
      completionCostPer1kTokens: rateCard.completionCostPer1kTokens,
      effectiveDate: rateCard.effectiveDate.toISOString(),
    });
  } catch (error) {
    return handleError(error, c);
  }
});

export { costAnalytics };
