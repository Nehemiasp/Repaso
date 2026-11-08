import { costOf } from './pricing';

/** Lleva la cuenta del gasto de una revisión y decide si cabe otra llamada. */
export class Budget {
  spent = 0;
  calls = 0;
  inputTokens = 0;
  outputTokens = 0;

  constructor(
    readonly limitUsd: number,
    readonly model: string,
  ) {}

  /** ¿Cabe una llamada con este estimado de tokens? */
  canAfford(inputTokens: number, maxOutputTokens: number): boolean {
    return this.spent + costOf(this.model, inputTokens, maxOutputTokens) <= this.limitUsd;
  }

  /** Registra el uso real que informó la API. */
  add(usage: { input_tokens: number; output_tokens: number }): void {
    this.calls += 1;
    this.inputTokens += usage.input_tokens;
    this.outputTokens += usage.output_tokens;
    this.spent += costOf(this.model, usage.input_tokens, usage.output_tokens);
  }
}
