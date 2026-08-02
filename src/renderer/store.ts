/**
 * The renderer's state: one Redux Toolkit slice, because there is one coherent thing to model — the
 * link to the DIG App and what has been said over it.
 *
 * # Why RTK and not RTK Query
 *
 * RTK Query is for HTTP endpoints with caching, and dig-chat's renderer makes no HTTP calls at all:
 * everything crosses the preload bridge, and the main process pushes changes rather than being
 * polled. Thunks over that bridge are the honest shape. (`react-app-architecture` requires RTK for
 * state and forbids ad-hoc fetch; both hold here.)
 *
 * # `status: null` is not `state: 'unpaired'`
 *
 * The initial status is `null`, meaning the renderer has not heard from the main process yet. That is
 * a THIRD thing, distinct from "checking" (the main process is probing) and from any settled answer.
 * Rendering an unknown as a definite negative is the specific mistake this app is written not to make.
 */

import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { configureStore } from '@reduxjs/toolkit';

import type { ChatMessage } from '../main/chat/conversation';
import type { AppInfo } from '../main/ipc';
import type { SessionStatus } from '../main/session';
import { DEFAULT_LOCALE, resolveInitialLocale } from '../shared/locales';
import { digChat } from './bridge';

/** What the UI is doing right now, as opposed to what the SESSION is. */
export type Busy = 'idle' | 'pairing' | 'refreshing' | 'sending';

export interface UiState {
  /** The session as the main process reports it, or `null` before the first report. */
  status: SessionStatus | null;
  messages: ChatMessage[];
  appInfo: AppInfo | null;
  busy: Busy;
  /** The react-intl id of the last failure, or `null`. Never raw text from anywhere. */
  errorId: string | null;
  /** The active UI locale — a supported BCP-47 code. Defaults to English until resolved. */
  locale: string;
}

const initialState: UiState = {
  status: null,
  messages: [],
  appInfo: null,
  busy: 'idle',
  errorId: null,
  locale: DEFAULT_LOCALE,
};

/**
 * Turn a rejected bridge call into a MESSAGE ID.
 *
 * The main process attaches a `messageId` to every error a user can act on. Anything else becomes
 * `error.unknown` — deliberately, because an Electron IPC rejection carries the main process's
 * stack in its `message`, and putting that on screen would be both useless to a person and a leak of
 * internal structure.
 */
function messageIdOf(failure: unknown): string {
  const raw = failure instanceof Error ? failure.message : String(failure);
  const match = /error\.[A-Za-z]+/.exec(raw);
  return match?.[0] ?? 'error.unknown';
}

export const loadSession = createAsyncThunk('ui/loadSession', async () => ({
  status: await digChat().getStatus(),
  appInfo: await digChat().getAppInfo(),
  messages: await digChat().getHistory(),
}));

export const refreshSession = createAsyncThunk('ui/refresh', () => digChat().refresh());

export const pairWithCode = createAsyncThunk(
  'ui/pair',
  async (code: string, { rejectWithValue }) => {
    try {
      return await digChat().pair(code);
    } catch (failure) {
      return rejectWithValue(messageIdOf(failure));
    }
  },
);

export const forgetPairing = createAsyncThunk('ui/forget', () => digChat().forgetPairing());

/**
 * Pick the locale to start in: a valid persisted choice wins, else detect from the browser/OS
 * preference list. The decision itself is the pure {@link resolveInitialLocale}; this thunk only
 * gathers its two inputs — the persisted choice from the main process and `navigator.languages`.
 */
export const initLocale = createAsyncThunk('ui/initLocale', async () => {
  const persisted = await digChat().getLocale();
  const preferred = typeof navigator !== 'undefined' ? navigator.languages : [];
  return resolveInitialLocale(persisted, preferred);
});

/**
 * Change the locale and persist it. The main process is the source of truth for what actually took
 * effect — it validates + coerces to a supported code — so the store adopts the value it RETURNS,
 * never the raw request.
 */
export const changeLocale = createAsyncThunk('ui/changeLocale', (chosen: string) =>
  digChat().setLocale(chosen),
);

export const sendMessage = createAsyncThunk(
  'ui/send',
  async (request: { recipientDid: string; body: string }, { rejectWithValue }) => {
    try {
      await digChat().send(request);
      return await digChat().getHistory();
    } catch (failure) {
      return rejectWithValue(messageIdOf(failure));
    }
  },
);

const slice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /** A push from the main process: the session changed without the UI asking. */
    sessionChanged(state, action: PayloadAction<SessionStatus>) {
      state.status = action.payload;
    },
    /** A push from the main process: the conversation changed. */
    chatChanged(state, action: PayloadAction<ChatMessage[]>) {
      state.messages = action.payload;
    },
    /** Dismiss the current error. Every error is dismissible — none of them traps the user. */
    errorDismissed(state) {
      state.errorId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSession.fulfilled, (state, action) => {
        state.status = action.payload.status;
        state.appInfo = action.payload.appInfo;
        state.messages = action.payload.messages;
      })
      .addCase(refreshSession.pending, (state) => {
        state.busy = 'refreshing';
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        state.busy = 'idle';
        state.status = action.payload;
      })
      .addCase(refreshSession.rejected, (state) => {
        state.busy = 'idle';
        state.errorId = 'error.unknown';
      })
      .addCase(pairWithCode.pending, (state) => {
        state.busy = 'pairing';
        state.errorId = null;
      })
      .addCase(pairWithCode.fulfilled, (state, action) => {
        state.busy = 'idle';
        state.status = action.payload;
      })
      .addCase(pairWithCode.rejected, (state, action) => {
        state.busy = 'idle';
        state.errorId = (action.payload as string | undefined) ?? 'error.unknown';
      })
      .addCase(forgetPairing.fulfilled, (state, action) => {
        state.status = action.payload;
        state.messages = [];
      })
      .addCase(initLocale.fulfilled, (state, action) => {
        state.locale = action.payload;
      })
      .addCase(changeLocale.fulfilled, (state, action) => {
        state.locale = action.payload;
      })
      .addCase(sendMessage.pending, (state) => {
        state.busy = 'sending';
        state.errorId = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.busy = 'idle';
        state.messages = action.payload;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.busy = 'idle';
        state.errorId = (action.payload as string | undefined) ?? 'error.unknown';
      });
  },
});

export const { sessionChanged, chatChanged, errorDismissed } = slice.actions;

/** Build a store. A function rather than a singleton so each test gets a clean one. */
export function createAppStore(preloaded?: Partial<UiState>) {
  return configureStore({
    reducer: { ui: slice.reducer },
    preloadedState: preloaded ? { ui: { ...initialState, ...preloaded } } : undefined,
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
