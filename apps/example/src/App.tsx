import type { Ref } from "@confect/core";
import {
  useAction,
  useMutation,
  useQuery as useConfectQuery,
} from "@confect/react";
import { ConfectQueryProvider, confectQuery } from "@confect/react-query";
import { useQuery as useTanstackQuery } from "@tanstack/react-query";
import { FetchHttpClient, HttpApiClient } from "@effect/platform";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Array, Effect, Either, Exit } from "effect";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import refs from "../confect/_generated/refs";
import { Api } from "../confect/http/path-prefix";

type NoteId = Ref.Args<
  typeof refs.public.notesAndRandom.notes.getByIdOrError
>["Type"]["noteId"];

type NoteByIdData = Either.Either<
  Ref.Returns<typeof refs.public.notesAndRandom.notes.getByIdOrError>["Type"],
  Ref.Error<typeof refs.public.notesAndRandom.notes.getByIdOrError>["Type"]
>;

// ─── Root: uses ConvexProvider for @confect/react hooks ──────────────────────

const convexUrl = import.meta.env.VITE_CONVEX_URL;

const App = () => {
  const convexClient = useMemo(() => new ConvexReactClient(convexUrl), []);

  return (
    <ConvexProvider client={convexClient}>
      <div>
        <h1>Confect Example</h1>

        <BasicDemo />

        <hr />

        <h2>Domain Error Demo (@confect/react-query + TanStack Query)</h2>
        <p>
          This section uses <code>ConfectQueryProvider</code> and TanStack Query
          to demonstrate typed domain errors via <code>Either</code>.
        </p>
        <ConfectQueryProviderSection convexClient={convexClient}>
          <TanStackQueryDemo />
        </ConfectQueryProviderSection>

        <hr />

        <HttpEndpoints />
      </div>
    </ConvexProvider>
  );
};

// ─── Basic @confect/react hooks demo (uses ConvexProvider) ───────────────────

const BasicDemo = () => {
  const [note, setNote] = useState("");
  const insertNote = useMutation(refs.public.notesAndRandom.notes.insert);

  const [randomNumber, setRandomNumber] = useState<number | null>(null);
  const getRandom = useAction(refs.public.notesAndRandom.random.getNumber);

  const retrieveRandomNumber = () => {
    void getRandom({}).then(setRandomNumber);
  };

  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const sendEmail = useAction(refs.public.node.email.send);

  const testEmail = () => {
    setEmailStatus("Sending...");
    void sendEmail({
      to: "test@example.com",
      subject: "Test email",
      body: "Test email body",
    })
      .then(() => setEmailStatus("Sent!"))
      .catch((error) => setEmailStatus(`Error: ${String(error)}`));
  };

  useEffect(() => {
    retrieveRandomNumber();
  }, []);

  const envVar = useConfectQuery(refs.public.env.readEnvVar, {});

  return (
    <>
      <div>
        <span style={{ fontFamily: "monospace" }}>TEST_ENV_VAR: </span>
        {envVar === undefined ? "Loading..." : envVar}
      </div>

      <br />

      <div>
        Random number: {randomNumber ? randomNumber : "Loading..."}
        <br />
        <button type="button" onClick={retrieveRandomNumber}>
          Get new random number
        </button>
      </div>

      <br />

      <div>
        <button type="button" onClick={testEmail}>
          Test email send
        </button>
        {emailStatus && <span style={{ marginLeft: 8 }}>{emailStatus}</span>}
      </div>

      <br />

      <textarea
        rows={4}
        cols={50}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <br />
      <button
        type="button"
        onClick={() => void insertNote({ text: note }).then(() => setNote(""))}
      >
        Insert note
      </button>

      <br />
      <br />

      <NoteList />
    </>
  );
};

// ─── ConfectQueryProvider section (wraps only the TanStack Query demo) ───────

const ConfectQueryProviderSection = ({
  convexClient,
  children,
}: {
  readonly convexClient: ConvexReactClient;
  readonly children: ReactNode;
}) => (
  <ConfectQueryProvider url={convexUrl} convexClient={convexClient}>
    {children}
  </ConfectQueryProvider>
);

// ─── TanStack Query demo (uses @confect/react-query) ────────────────────────

const TanStackQueryDemo = () => {
  const [selectedNoteId, setSelectedNoteId] = useState<NoteId | null>(null);
  const [deletedNoteId, setDeletedNoteId] = useState<NoteId | null>(null);

  const deleteNote = useMutation(refs.public.notesAndRandom.notes.delete_);

  const noteByIdQuery = useTanstackQuery(
    confectQuery(
      refs.public.notesAndRandom.notes.getByIdOrError,
      selectedNoteId === null ? "skip" : { noteId: selectedNoteId },
    ),
  );
  const noteByIdData = noteByIdQuery.data as NoteByIdData | undefined;

  const notes = useConfectQuery(refs.public.notesAndRandom.notes.list, {});

  return (
    <>
      <p>
        Select a note ID from the list to fetch. Delete a note and re-fetch it
        to see a typed domain error in query data.
      </p>

      {deletedNoteId !== null && (
        <button type="button" onClick={() => setSelectedNoteId(deletedNoteId)}>
          Fetch deleted note ID
        </button>
      )}

      <p>
        Selected note ID: {selectedNoteId ?? "none"}
        {noteByIdQuery.error
          ? ` | Unhandled error: ${noteByIdQuery.error.message}`
          : ""}
      </p>

      {noteByIdData === undefined
        ? null
        : Either.match(noteByIdData, {
            onLeft: (domainError) => (
              <p>
                Domain error in data: {domainError._tag} for note ID{" "}
                {domainError.noteId}
              </p>
            ),
            onRight: (noteValue) => (
              <p>
                Note loaded via TanStack Query:{" "}
                <strong>{noteValue.text}</strong>
              </p>
            ),
          })}

      {notes === undefined ? (
        <p>Loading notes...</p>
      ) : (
        <ul>
          {Array.map(notes, (note) => (
            <li key={note._id}>
              <p>{note.text}</p>
              <button type="button" onClick={() => setSelectedNoteId(note._id)}>
                Inspect via TanStack
              </button>
              <button
                type="button"
                onClick={() =>
                  void deleteNote({ noteId: note._id }).then(() => {
                    setDeletedNoteId(note._id);
                    setSelectedNoteId(note._id);
                  })
                }
                style={{ marginLeft: 8 }}
              >
                Delete note
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

// ─── Note list using @confect/react hooks ────────────────────────────────────

const NoteList = () => {
  const notes = useConfectQuery(refs.public.notesAndRandom.notes.list, {});

  if (notes === undefined) {
    return <p>Loading...</p>;
  }

  return (
    <ul>
      {Array.map(notes, (note) => (
        <li key={note._id}>
          <p>{note.text}</p>
        </li>
      ))}
    </ul>
  );
};

// ─── HTTP Endpoints demo ─────────────────────────────────────────────────────

const ApiClient = HttpApiClient.make(Api, {
  baseUrl: import.meta.env.VITE_CONVEX_URL.replace(
    "convex.cloud",
    "convex.site",
  ),
});

const getFirst = ApiClient.pipe(
  Effect.andThen((client) => client.notes.getFirst()),
  Effect.scoped,
  Effect.provide(FetchHttpClient.layer),
);

const HttpEndpoints = () => {
  const [getResponse, setGetResponse] = useState<Exit.Exit<any, any> | null>(
    null,
  );

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          getFirst
            .pipe(Effect.runPromiseExit)
            .then((exit) => setGetResponse(exit))
        }
      >
        HTTP GET /path-prefix/get-first
      </button>
      <p>
        {getResponse
          ? Exit.match(getResponse, {
              onSuccess: (value) => JSON.stringify(value),
              onFailure: (error) => JSON.stringify(error),
            })
          : "No response yet"}
      </p>
    </div>
  );
};

export default App;
