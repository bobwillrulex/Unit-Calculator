import type { UnitDefinition } from '../units';

export interface ConversionRequest {
  readonly value: number;
  readonly from: UnitDefinition;
  readonly to: UnitDefinition;
}

export interface ConversionEngine {
  convert(request: ConversionRequest): number;
}
