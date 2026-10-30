export default function FirebaseNotConfigured() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-950">
      <div className="card max-w-xl">
        <h1 className="mb-2 text-xl font-bold text-red-600 dark:text-red-400">
          Firebase is not configured yet
        </h1>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          The app needs your Firebase project credentials to run. This is
          intentional: no placeholder or demo credentials are used.
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-300">
          <li>
            Create a project at <b>console.firebase.google.com</b> and add a
            <b> Web app</b> (Project settings &gt; General &gt; Your apps).
          </li>
          <li>Enable <b>Authentication &gt; Email/Password</b>.</li>
          <li>
            Create a <b>Firestore database</b> and paste the rules from
            <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800">firestore.rules</code>
            into Firestore &gt; Rules.
          </li>
          <li>
            Copy <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800">.env.example</code> to
            <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800">.env</code> and fill in
            your Firebase config values.
          </li>
          <li>Restart the dev server (<code>npm run dev</code>).</li>
        </ol>
      </div>
    </div>
  );
}
