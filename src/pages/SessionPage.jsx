import SessionPanel from '../components/auth/SessionPanel';

/**
 * Open to every signed-in role — it shows a user their own token and nothing
 * else, so gating it would protect nobody from anything.
 */
export default function SessionPage() {
  return <SessionPanel />;
}
