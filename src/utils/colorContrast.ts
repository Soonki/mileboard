/**
 * WCAG 2.0 G17 準拠のコントラストテキスト色計算ユーティリティ
 * @see https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * 背景色のhexコードから、コントラスト比が高いテキスト色（白または黒）を返す。
 * luminance > 0.179 の場合は黒(#000000)、それ以外は白(#ffffff)を返す。
 */
export function getContrastTextColor(hexColor: string): string {
  const [r, g, b] = hexToRgb(hexColor);
  const luminance = relativeLuminance(r, g, b);
  return luminance > 0.179 ? '#000000' : '#ffffff';
}
