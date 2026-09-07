import { login } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main>
      <div className="page-header">
        <h1>Log In</h1>
      </div>

      <form action={login} className="card stack login-card">
        {searchParams.error && (
          <p className="empty error-text">Invalid email or password.</p>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required />
        </div>
        <div>
          <button type="submit" className="btn">
            Log In
          </button>
        </div>
      </form>
    </main>
  );
}
