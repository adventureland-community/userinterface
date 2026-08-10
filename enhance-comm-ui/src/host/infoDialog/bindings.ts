type OpenItemFn = (entity: any, slotName: string, slotOverride?: any) => void;
type OpenConditionFn = (entity: any, conditionName: string) => void;

let openItemFn: OpenItemFn | null = null;
let openConditionFn: OpenConditionFn | null = null;

export function bindOpenHandlers(
  openItem: OpenItemFn,
  openCondition: OpenConditionFn,
): void {
  openItemFn = openItem;
  openConditionFn = openCondition;
}

export function callOpenItem(
  entity: any,
  slotName: string,
  slotOverride?: any,
): void {
  if (openItemFn) openItemFn(entity, slotName, slotOverride);
}

export function callOpenCondition(entity: any, conditionName: string): void {
  if (openConditionFn) openConditionFn(entity, conditionName);
}
