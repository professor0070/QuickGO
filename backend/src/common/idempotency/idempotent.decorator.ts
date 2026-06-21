import { SetMetadata } from "@nestjs/common";
import { CRITICAL_IDEMPOTENT_ACTIONS } from "../constants";

export const IDEMPOTENT_ACTION_KEY = "quickgo_idempotent_action";
export type IdempotentAction = (typeof CRITICAL_IDEMPOTENT_ACTIONS)[number];

export const Idempotent = (action: IdempotentAction) =>
  SetMetadata(IDEMPOTENT_ACTION_KEY, action);

