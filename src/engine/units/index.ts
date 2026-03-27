export interface UnitDefinition {
  readonly id: string;
  readonly label: string;
  readonly symbol: string;
  readonly category: string;
}

export type UnitRegistry = ReadonlyArray<UnitDefinition>;
