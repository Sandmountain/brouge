export const calculatePositionFromGrid = (
  col: number,
  row: number,
  refWidth: number,
  refHeight: number,
  refPadding: number
) => {
  const x = col * (refWidth + refPadding) + refWidth / 2;
  const y = row * (refHeight + refPadding) + refHeight / 2;
  return { x, y };
};

