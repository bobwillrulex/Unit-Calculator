import type { Quantity, UnitDefinition } from '../units';

export interface ConversionRequest {
  readonly quantityInBaseUnits: Quantity;
  readonly to: UnitDefinition;
}

export interface ConversionResult {
  readonly value: number;
  readonly unitSymbol: string;
}

export interface ConversionEngine {
  convert(request: ConversionRequest): ConversionResult;
}
