const VIEWPORT_MARGIN = 10;

interface OverlaySize {
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getOverlayPosition(
  rect: DOMRect,
  size: OverlaySize,
  preferredOffset = 10
) {
  const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - size.width - VIEWPORT_MARGIN);

  let x = clamp(rect.left, VIEWPORT_MARGIN, maxX);
  let y = rect.bottom + preferredOffset;

  if (y + size.height > window.innerHeight - VIEWPORT_MARGIN) {
    y = rect.top - size.height - preferredOffset;
  }

  y = clamp(
    y,
    VIEWPORT_MARGIN,
    Math.max(VIEWPORT_MARGIN, window.innerHeight - size.height - VIEWPORT_MARGIN)
  );

  return { x, y };
}

export function getIconPosition(rect: DOMRect, size: OverlaySize) {
  let x = rect.right;
  let y = rect.top - 15;

  if (x + size.width + VIEWPORT_MARGIN > window.innerWidth) {
    x = rect.left - size.width - VIEWPORT_MARGIN;
  }

  if (y < VIEWPORT_MARGIN) {
    y = rect.bottom + VIEWPORT_MARGIN;
  }

  return {
    x: clamp(
      x,
      VIEWPORT_MARGIN,
      Math.max(VIEWPORT_MARGIN, window.innerWidth - size.width - VIEWPORT_MARGIN)
    ),
    y: clamp(
      y,
      VIEWPORT_MARGIN,
      Math.max(VIEWPORT_MARGIN, window.innerHeight - size.height - VIEWPORT_MARGIN)
    ),
  };
}
