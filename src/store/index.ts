export interface AppState {
  readonly input: string;
  readonly result: string;
}

export const initialAppState: AppState = {
  input: '',
  result: '',
};
