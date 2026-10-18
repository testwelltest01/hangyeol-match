// iPhone·iPad 홈 화면 앱을 열 때의 시작 화면. iOS는 manifest의 배경색으로 시작 화면을 만들지 않아서,
// 기기 크기마다 그림을 지정하지 않으면 잠깐 빈(검은) 화면이 보인다.
// 그림은 scripts/make-icons.mjs가 public/splash/{가로px}x{세로px}.png로 만든다.
import data from "./splash-devices.json";

export type SplashDevice = { w: number; h: number; dpr: number; name: string; ipad?: boolean };
export type SplashImage = { url: string; media: string };

/** iOS의 device-width·device-height는 기기를 돌려도 세로 기준 값이다 */
export function splashImages(devices: SplashDevice[] = data.devices): SplashImage[] {
  return devices.flatMap((d) => {
    const base = `(device-width: ${d.w}px) and (device-height: ${d.h}px) and (-webkit-device-pixel-ratio: ${d.dpr})`;
    const portrait = { url: `/splash/${d.w * d.dpr}x${d.h * d.dpr}.png`, media: `${base} and (orientation: portrait)` };
    if (!d.ipad) return [portrait];
    return [portrait, { url: `/splash/${d.h * d.dpr}x${d.w * d.dpr}.png`, media: `${base} and (orientation: landscape)` }];
  });
}
