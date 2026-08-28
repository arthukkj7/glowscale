/**
 * Logotipos dos provedores de login social.
 *
 * Desenhados inline em vez de carregados de um CDN de icones: uma imagem
 * externa por botao adiciona tres requisicoes a terceiros bem na tela de
 * login, aparece piscando depois do resto e deixa de existir no dia em que
 * aquele host sair do ar. Como SVG, vao junto do HTML e nunca falham.
 */

/** O "G" oficial, nas quatro cores da marca. */
export function MarcaGoogle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function MarcaFacebook({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z"
      />
    </svg>
  );
}

/** A maca usa currentColor para virar branca no tema escuro. */
export function MarcaApple({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M17.05 12.54c-.03-2.73 2.23-4.04 2.33-4.1-1.27-1.86-3.25-2.11-3.95-2.14-1.68-.17-3.28.99-4.13.99-.85 0-2.16-.97-3.55-.94-1.83.03-3.51 1.06-4.45 2.7-1.9 3.29-.48 8.16 1.36 10.83.9 1.31 1.98 2.77 3.39 2.72 1.36-.06 1.87-.88 3.52-.88 1.64 0 2.11.88 3.55.85 1.47-.02 2.4-1.33 3.29-2.64 1.04-1.51 1.47-2.98 1.49-3.05-.03-.01-2.86-1.1-2.89-4.34zM14.32 4.4c.75-.91 1.25-2.17 1.11-3.43-1.08.04-2.38.72-3.15 1.62-.69.8-1.29 2.08-1.13 3.31 1.2.09 2.43-.61 3.17-1.5z"
      />
    </svg>
  );
}
