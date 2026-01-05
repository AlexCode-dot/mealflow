type AuthEvent = 'loggedOut';
type Listener = (event: AuthEvent) => void;

const listeners = new Set<Listener>();

export const authEvents = {
  subscribe(listener: Listener) {
    listeners.add(listener);

    // IMPORTANT: cleanup must return void (not boolean)
    return () => {
      listeners.delete(listener);
    };
  },

  emit(event: AuthEvent) {
    listeners.forEach((l) => l(event));
  },
};
