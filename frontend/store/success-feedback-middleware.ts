import {
  isFulfilled,
  type Middleware,
} from "@reduxjs/toolkit";

import { showSuccessFeedback } from "@/lib/feedback/success-feedback";

import { argField, SUCCESS_MESSAGES } from "./success-messages";

export const successFeedbackMiddleware: Middleware =
  () => (next) => (action) => {
    const result = next(action);

    if (
      !isFulfilled(action) ||
      action.meta.arg.type !== "mutation" ||
      argField(action.meta.arg.originalArgs, "__suppressSuccessFeedback") === true
    ) {
      return result;
    }

    const { endpointName, originalArgs } = action.meta.arg;
    const entry = SUCCESS_MESSAGES[endpointName];
    const message =
      typeof entry === "function" ? entry(originalArgs) : entry;

    if (message) {
      showSuccessFeedback(message);
    } else if (entry === undefined && process.env.NODE_ENV !== "production") {
      console.warn(
        `No success message for mutation "${endpointName}". Add one to SUCCESS_MESSAGES.`,
      );
    }

    return result;
  };
