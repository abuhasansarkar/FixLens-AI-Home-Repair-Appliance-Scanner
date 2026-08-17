export type SafetyLevel = "green" | "yellow" | "orange" | "red";

const redPatterns = [
  /\b(gas.{0,20}(leak|odor|smell)|(leak|odor|smell).{0,20}gas)\b/i,
  /\bgas (stove|range|oven|dryer|furnace|water heater|boiler|fireplace)\b/i,
  /carbon monoxide|\bco alarm\b/i,
  /smoke|flame|\bfire\b/i,
  /exposed (mains|live|electrical)?\s*wir|\blive wire/i,
  /electric(al)? shock|electrocut|\barcing\b/i,
  /(water|flood).{0,30}(outlet|socket|panel|wire|electric)|(outlet|socket|panel|wire|electric).{0,30}(water|flood)/i,
  /electrical panel/i,
  /structural (failure|collapse)|collapsing|ceiling.{0,20}(sag|bow)/i,
  /asbestos/i,
];
const orangePatterns = [/refrigerant/i, /mold/i, /flood/i, /high[- ]pressure/i, /high voltage/i, /burning smell/i, /spark(ing|s)?/i, /swollen battery/i];

export function classifyHazard(text: string): SafetyLevel {
  if (redPatterns.some((pattern) => pattern.test(text))) return "red";
  if (orangePatterns.some((pattern) => pattern.test(text))) return "orange";
  if (/disconnect|unplug|shut off|protective equipment/i.test(text)) return "yellow";
  return "green";
}

export function permitsRepairSteps(level: SafetyLevel) { return level === "green" || level === "yellow"; }
const rank: Record<SafetyLevel, number> = { green: 0, yellow: 1, orange: 2, red: 3 };
export function enforceSafeResult<T extends { observations?: unknown[]; safety: { level: SafetyLevel; summary?: string; stopReasons?: string[] }; repairSteps?: unknown[]; tools?: unknown[]; parts?: unknown[]; professionalRequired?: boolean }>(result: T, sourceText = ""): T {
  const detected = classifyHazard(`${sourceText} ${JSON.stringify(result.observations ?? "")} ${result.safety.summary ?? ""}`);
  const level = rank[detected] > rank[result.safety.level] ? detected : result.safety.level;
  if (permitsRepairSteps(level)) return level === result.safety.level ? result : { ...result, safety: { ...result.safety, level } };
  return { ...result, safety: { ...result.safety, level, stopReasons: result.safety.stopReasons?.length ? result.safety.stopReasons : ["Stop using the appliance and keep a safe distance."] }, professionalRequired: true, repairSteps: [], tools: [], parts: [] };
}
