import { writable } from 'svelte/store';

type HeaderControl = {
  id: string;
  icon: string;
  title: string;
  action: () => void;
};

export const headerControls = writable<HeaderControl[]>([]);

export function setHeaderControls(controls: HeaderControl[]) {
  headerControls.set(controls);
}

export function clearHeaderControls() {
  headerControls.set([]);
}