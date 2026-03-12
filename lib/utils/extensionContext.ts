const loggedInvalidationContexts = new Set<string>()
let extensionContextInvalidated = false

export function isExtensionContextInvalidatedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes("Extension context invalidated")
}

export function hasExtensionContextBeenInvalidated() {
  return extensionContextInvalidated
}

export function markExtensionContextInvalidated() {
  extensionContextInvalidated = true
}

export function logExtensionError(context: string, error: unknown) {
  if (isExtensionContextInvalidatedError(error)) {
    markExtensionContextInvalidated()

    if (!loggedInvalidationContexts.has(context)) {
      loggedInvalidationContexts.add(context)
      console.warn(`${context}: extension context invalidated`)
    }
    return
  }

  console.error(context, error)
}
