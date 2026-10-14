import { createLiveRegion, showOnly, slideAnnouncement } from './a11y.ts';
import { createChrome } from './chrome.ts';
import { createController } from './controller.ts';
import { applyStep } from './fragments.ts';
import { bindFullscreenState } from './fullscreen.ts';
import { createHelp } from './help.ts';
import { hydrateIcons } from './icons.ts';
import { createJumpBuffer } from './jump.ts';
import { bindKeyboard } from './keyboard.ts';
import { parseFragment, rootSection } from './loader.ts';
import { createOverview } from './overview.ts';
import { bindPointer } from './pointer.ts';
import { bindPrint } from './print.ts';
import { bindRouter, positionFromLocation } from './router.ts';
import { bindStageScale } from './stage.ts';
import { createStore, type PositionStore } from './state.ts';
import { createSync, namespaceFor } from './sync.ts';
import {
  broadcastTransport,
  combineTransports,
  type Transport,
  windowTransport,
} from './transport.ts';
import type { DeckModel } from './types.ts';

export const PRESENTER_WINDOW_NAME = 'deck-presenter';

export interface DeckApp {
  readonly store: PositionStore;
}

/** Presenter URL relative to this page, so the origin always matches. */
export function presenterUrl(profile: string, singleFile: boolean, here: string): string {
  const url = new URL(singleFile ? '' : 'presenter.html', here);
  url.search = '';
  if (singleFile) url.searchParams.set('role', 'presenter');
  url.searchParams.set('profile', profile);
  url.hash = '';
  return url.href;
}

export function mountDeck(app: HTMLElement, deck: DeckModel, singleFile: boolean): DeckApp {
  const html = document.documentElement;
  html.dataset.role = 'deck';

  const viewport = document.createElement('div');
  viewport.className = 'deck-viewport';
  const stage = document.createElement('main');
  stage.className = 'stage';
  stage.setAttribute('aria-roledescription', 'slide deck');
  stage.setAttribute('aria-label', deck.title);

  const sections = deck.slides.map((slide) => {
    const section = rootSection(parseFragment(slide.html));
    if (!section) throw new Error(`${slide.file}: invalid slide`);
    section.setAttribute('aria-roledescription', 'slide');
    applyStep(section, 0);
    hydrateIcons(section);
    return section;
  });

  const chrome = createChrome();
  const help = createHelp('deck');
  const live = createLiveRegion();

  const initial = positionFromLocation(window);
  const store = createStore(
    deck.slides.map((s) => s.steps),
    initial,
  );

  const overview = createOverview(deck.slides, (index) => store.goto({ slide: index, step: 0 }));
  const jump = createJumpBuffer({ count: () => store.count, onChange: chrome.setJump });

  stage.append(...sections, chrome.root, ...chrome.overlays, overview.element, help.element);
  viewport.append(stage, chrome.blackout, live.element);
  app.replaceChildren(viewport);

  const render = (): void => {
    const { slide, step } = store.get();
    showOnly(sections, slide);
    const section = sections[slide];
    if (section) applyStep(section, step);
    chrome.update(slide, store.count, step, store.stepsOf(slide));
    const title = deck.slides[slide]?.title ?? '';
    live.announce(slideAnnouncement(slide, store.count, title));
    document.title = title ? `${title} | ${deck.title}` : deck.title;
  };
  render();
  store.subscribe(render);
  bindRouter(store, window);

  // Sync with the presenter window.
  const ns = namespaceFor(deck.id, deck.profile);
  const popupTransport = windowTransport(ns);
  const transports: Transport[] = [popupTransport];
  const channel = broadcastTransport(ns);
  if (channel) transports.unshift(channel);

  let blackout = false;
  const setBlackout = (on: boolean): void => {
    if (on === blackout) return;
    blackout = on;
    chrome.setBlackout(on);
    sync.sendBlackout(on);
  };
  const sync = createSync({
    role: 'deck',
    ns,
    store,
    transport: combineTransports(transports),
    onBlackout: setBlackout,
    getBlackout: () => blackout,
  });

  const openPresenter = (): void => {
    const url = presenterUrl(deck.profile, singleFile, location.href);
    const popup = window.open(url, PRESENTER_WINDOW_NAME, 'popup=yes,width=1280,height=800');
    if (!popup) {
      chrome.toast('Pop-up blocked. Allow pop-ups for this page, then press P again.');
      return;
    }
    popupTransport.addPeer(popup);
    popup.focus();
  };

  const controller = createController({
    store,
    overview,
    help,
    jump,
    isBlackout: () => blackout,
    toggleBlackout: () => setBlackout(!blackout),
    blackoutBlocksNavigation: true,
    openPresenter,
    toggleChrome: chrome.toggleHidden,
  });

  bindKeyboard('deck', controller.handleKey);
  bindPointer(viewport, {
    clickAdvances: true,
    onNext: controller.next,
    onPrev: controller.prev,
    onClick: (target) => {
      if (blackout) {
        setBlackout(false);
        return true;
      }
      if (overview.isOpen) return !target.closest('.overview-thumb');
      if (help.isOpen) {
        help.close();
        return true;
      }
      return false;
    },
  });
  bindStageScale(stage);
  bindFullscreenState();
  bindPrint(() => {
    overview.close();
    help.close();
    jump.cancel();
  });

  return { store };
}
