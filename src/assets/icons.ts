import {
  Antenna,
  ArrowLeft,
  ArrowRight,
  Bluetooth,
  CircleCheck,
  Clock,
  type IconNode,
  Info,
  Keyboard,
  Layers,
  Lightbulb,
  Monitor,
  Pause,
  Play,
  Presentation,
  Printer,
  Radio,
  RotateCcw,
  Signal,
  Timer,
  TriangleAlert,
  Wifi,
} from 'lucide';

/**
 * The icon whitelist. Slides use `<i data-icon="name">`; the slide lint rejects any other name.
 * Import icons one by one so the bundle stays tree-shaken (never import `icons`).
 */
export const ICONS = {
  antenna: Antenna,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  bluetooth: Bluetooth,
  'circle-check': CircleCheck,
  clock: Clock,
  info: Info,
  keyboard: Keyboard,
  layers: Layers,
  lightbulb: Lightbulb,
  monitor: Monitor,
  pause: Pause,
  play: Play,
  presentation: Presentation,
  printer: Printer,
  radio: Radio,
  'rotate-ccw': RotateCcw,
  signal: Signal,
  timer: Timer,
  'triangle-alert': TriangleAlert,
  wifi: Wifi,
} as const satisfies Record<string, IconNode>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES: readonly string[] = Object.keys(ICONS);

export function isIconName(name: string): name is IconName {
  return Object.hasOwn(ICONS, name);
}
