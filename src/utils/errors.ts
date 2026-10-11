// src/utils/errors.ts

/**
 * An argument the caller can fix, rejected before any request was sent.
 * classifyAndBuildError reports these as input errors, not as a server or
 * project-code problem.
 */
export class LocalArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
