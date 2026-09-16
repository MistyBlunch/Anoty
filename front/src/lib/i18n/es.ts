import type { TranslationKey } from "./en"
import en from "./en"

type Translations = {
  [K in TranslationKey]: typeof en[K] extends (...args: infer A) => string
    ? (...args: A) => string
    : string
}

const es: Translations = {
  // ─── Meta / SEO ───────────────────────────────────────────────────────────
  home_title: "Anoty – Mensajes y dibujos anónimos para tus amigos",
  home_description:
    "Crea tu muro privado con Google y recibe mensajes y dibujos anónimos de tus amigos. Solo tú puedes verlos.",
  dashboard_title: "Mi Muro Privado – Anoty",
  dashboard_description: "Tu tablero privado de dibujos anónimos.",
  send_title: (username: string) => `Envía una nota anónima a @${username} – Anoty`,
  send_description: (username: string) => `Envía un mensaje o dibujo anónimo a @${username}. Solo ellos podrán verlo.`,
  public_loading_title: "Cargando muro... – Anoty",
  public_notfound_title: "Muro no encontrado – Anoty",
  public_board_description: (title: string) => `Muro público de dibujos anónimos: ${title}`,

  // ─── Auth / Nav ───────────────────────────────────────────────────────────
  login_with_google: "Ingresar con Google",
  login_short: "Ingresar",
  connecting: "Conectando...",
  sign_out: "Cerrar sesión",
  my_private_wall: "Mi Muro Privado",
  go_to_my_wall: "Ir a mi Muro Privado",
  validating_session: "Validando sesión...",
  login_error_default: "No se pudo iniciar sesión",
  login_backend_error: "No se pudo conectar con el servidor backend",
  login_oauth_error: "Fallo al abrir la ventana de Google OAuth",

  // ─── Home hero ────────────────────────────────────────────────────────────
  hero_badge: "Tus mensajes y dibujos anónimos, 100% privados",
  hero_heading_1: "Recibe notas y dibujos secretos de tus amigos",
  hero_heading_2: "que solo TÚ podrás ver",
  hero_subheading:
    "Crea tu muro privado en 1 segundo con Google. Comparte tu enlace personal y recibe mensajes y dibujos a mano alzada. Tu muro es totalmente privado.",
  hero_cta_create: "Crear mi muro privado con Google",
  hero_check_no_passwords: "Sin contraseñas",
  hero_check_private: "100% Privado para ti",
  hero_check_no_register: "Amigos sin registro",
  footer_tagline: "Mensajes y dibujos anónimos y privados.",

  // ─── Dashboard ────────────────────────────────────────────────────────────
  loading_public_board: "Cargando tu muro público...",
  loading_inbox: "Cargando tu muro...",
  copied: "¡Copiado!",
  copy_share_link: "Copiar enlace para compartir",
  delete_drawing_error: "Error al eliminar un dibujo",
  validating: "Validando...",

  // ─── Board modes ──────────────────────────────────────────────────────────
  mode_inbox: "Mis anotys",
  mode_public: "Muro público",

  // ─── BoardControls tooltips ───────────────────────────────────────────────
  tool_select: "Seleccionar (V)",
  tool_hand: "Mano (H)",
  tool_marquee: "Selección múltiple (M) — arrastra en el lienzo",
  tool_undo: "Deshacer (Ctrl+Z)",
  tool_redo: "Rehacer (Ctrl+Y / Ctrl+Shift+Z)",
  tool_zoom_in: "Acercar",
  tool_zoom_out: "Alejar",

  // ─── HintBar ──────────────────────────────────────────────────────────────
  hint_hand:
    "Modo mano — arrastra para mover el lienzo • Rueda o pellizco para zoom • V: seleccionar • Ctrl+Z: deshacer",
  hint_marquee:
    "Arrastra en el lienzo para seleccionar varios dibujos • Mantén Shift mientras arrastras para sumar • Esc: salir",
  hint_public:
    "Arrastra tus dibujos desde el panel izquierdo • Mueve y reordena como quieras • M: selección múltiple • H: mano • Ctrl+Z: deshacer",
  hint_inbox:
    "Arrastra el fondo para moverte • Rueda o pellizco para zoom • Arrastra un dibujo para moverlo • M: selección múltiple • H: mano • Ctrl+Z: deshacer",
  hint_viewer: "Mantén y arrastra para moverte • Zoom con rueda o pellizco",

  // ─── EmptyBoard ───────────────────────────────────────────────────────────
  empty_inbox_title: "Tu muro aún está vacío",
  empty_inbox_description:
    "Comparte tu enlace para que tus amigos te envíen dibujos anónimos. Llegan directo a este tablero y podrás moverlos como quieras.",
  empty_public_title: "Tu muro público está vacío",
  empty_public_description:
    "Arrastra aquí tus dibujos desde el panel izquierdo para crear tu muro visible por cualquiera en Internet.",
  empty_viewer_title: "Este muro está vacío",
  empty_viewer_description: "El dueño aún no ha colocado ningún dibujo aquí.",
  copy_my_link: "Copiar mi enlace personal",

  // ─── ActionsMenu ─────────────────────────────────────────────────────────
  actions_selected: (n: number) => `${n} seleccionadas`,
  actions_download_png: "Descargar como imagen",
  actions_move_front: "Adelante",
  actions_move_back: "Atrás",
  actions_bg_add: "Fondo",
  actions_bg_remove: "Quitar fondo",
  actions_bg_title_multi: "Alternar fondo de los dibujos seleccionados",
  actions_bg_title_single: "Alternar fondo del dibujo",
  actions_delete: "Eliminar",
  actions_confirm_delete_multi: (n: number) => `¿Eliminar ${n} dibujos?`,
  actions_confirm_delete_single: "¿Eliminar dibujo?",
  actions_confirm: "Confirmar",
  actions_cancel: "Cancelar",
  actions_remove_from_wall: "Quitar del muro",
  actions_move_front_title: "Enviar la selección al frente",
  actions_move_back_title: "Enviar la selección al fondo",
  actions_download_title: "Descargar como imagen",

  // ─── HeaderActions ────────────────────────────────────────────────────────
  header_logout_title: "Cerrar sesión",

  // ─── NotificationsDropdown ───────────────────────────────────────────────
  notifications_title: "Notificaciones",
  notifications_new_drawings: "Dibujos nuevos",
  notifications_empty: "Sin notificaciones nuevas.",
  notifications_anonymous_friend: "Amigo Anónimo",
  notifications_clear: "Limpiar notificaciones",

  // ─── PublicControls ───────────────────────────────────────────────────────
  public_copy_link: "Copiar enlace público",
  public_publish: "Publicar",
  public_hide: "Ocultar",
  public_visible_title: "Muro visible públicamente",
  public_hidden_title: "Muro oculto (solo tú lo ves)",

  // ─── PublicSidebar ───────────────────────────────────────────────────────
  sidebar_drop_to_remove: "Suelta para quitar",
  sidebar_settings: "Configuración",
  sidebar_wall_name: "Nombre de tu muro",
  sidebar_wall_placeholder: "Mi Muro Público",
  sidebar_your_drawings: "Tus dibujos",
  sidebar_drag_hint: "Toca y arrastra uno al muro",
  sidebar_no_drawings: "No tienes dibujos sin colocar.",
  sidebar_drag_to_wall: "Arrastrar al muro",
  sidebar_close_panel: "Cerrar panel",
  sidebar_add_drawings: "Añadir dibujos",
  sidebar_saving: "Guardando...",
  sidebar_saved: "¡Guardado!",
  sidebar_save_wall: "Guardar muro",

  // ─── PublicBoardView ─────────────────────────────────────────────────────
  public_loading_text: "Cargando muro público...",
  public_notfound_heading: "Este muro no existe o está oculto",
  public_notfound_description: "El enlace puede estar mal escrito o el dueño lo despublicó.",
  public_notfound_back: "Volver a Anoty",
  public_default_title: "Muro Público",

  // ─── SendNote ─────────────────────────────────────────────────────────────
  send_header_title: (username: string) => `Envía una nota a @${username}`,
  send_avatar_alt: (name: string) => `Avatar de ${name}`,
  send_back: "Volver al inicio",
  send_success_heading: "¡Dibujo enviado con éxito! 🎉",
  send_success_body: (username: string) =>
    `Tu dibujo fue guardado de forma anónima en el muro privado de @${username}.`,
  send_another: "Dibujar otra nota",
  send_create_wall: "Crear mi propio muro",
  send_button: (username: string) => `Enviar a @${username}`,
  send_sending: "Enviando...",
  send_error_default: "No se pudo enviar el dibujo",
  send_backend_error: "No se pudo enviar el dibujo al servidor",
  send_button_title: (username: string) => `Enviar el dibujo de forma anónima a @${username}`,
  send_anonymous_author: "Amigo Anónimo",
  send_excalidraw_welcome: "¡Dibuja algo y envíalo anónimamente!",
  send_excalidraw_actions: "Acciones",

  // ─── ExcalidrawCanvas ────────────────────────────────────────────────────
  excalidraw_send_error: "No se pudo enviar el dibujo",

  // ─── Language switcher ───────────────────────────────────────────────────
  lang_switch_label: "Idioma",
  lang_en: "English",
  lang_es: "Español",
}

export default es
