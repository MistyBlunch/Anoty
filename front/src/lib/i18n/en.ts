const en = {
  // ─── Meta / SEO ───────────────────────────────────────────────────────────
  home_title: "Anoty – Anonymous messages and drawings for your friends",
  home_description:
    "Create your private board with Google and receive anonymous messages and drawings from your friends. Only you can see them.",
  dashboard_title: "My Private Board – Anoty",
  dashboard_description: "Your private board of anonymous drawings.",
  send_title: (username: string) => `Send an anonymous note to @${username} – Anoty`,
  send_description: (username: string) => `Send an anonymous message or drawing to @${username}. Only they can see it.`,
  public_loading_title: "Loading board... – Anoty",
  public_notfound_title: "Board not found – Anoty",
  public_board_description: (title: string) => `Public board of anonymous drawings: ${title}`,

  // ─── Auth / Nav ───────────────────────────────────────────────────────────
  login_with_google: "Sign in with Google",
  login_short: "Sign in",
  connecting: "Connecting...",
  sign_out: "Sign out",
  my_private_wall: "My Private Board",
  go_to_my_wall: "Go to my Board",
  validating_session: "Validating session...",
  login_error_default: "Could not sign in",
  login_backend_error: "Could not connect to the backend server",
  login_oauth_error: "Failed to open the Google OAuth window",

  // ─── Home hero & Landing ──────────────────────────────────────────────────
  hero_badge: "🎨 Anonymous Drawing Board",
  hero_heading_1: "Receive anonymous drawings from your friends",
  hero_heading_2: "live on your private board",
  hero_subheading:
    "Sign in with Google, share your link and let your friends draw secret notes. Notes drop right onto your interactive board in real time.",
  hero_cta_create: "Create my board with Google",
  hero_check_no_passwords: "No passwords needed",
  hero_check_private: "100% Private for you",
  hero_check_no_register: "Friends draw without signup",
  hero_share_preview_label: "Share this link with your friends:",
  hero_share_preview_sublabel: "Instagram bio • TikTok • WhatsApp • Stories",
  hero_share_preview_copied: "Copied!",
  hero_share_preview_copy_btn: "Copy link to share",

  how_it_works_title: "How it works",
  how_it_works_subtitle: "Start receiving anonymous doodles in 3 easy steps",
  step_1_badge: "1",
  step_1_title: "Get your link",
  step_1_desc: "Sign in with Google in 1 click to get your personal drawing link.",
  step_2_badge: "2",
  step_2_title: "Share with friends",
  step_2_desc: "Post it on your socials or group chats. Friends can draw instantly without an account.",
  step_3_badge: "3",
  step_3_title: "Collect doodles live",
  step_3_desc: "Drawings appear on your interactive board in real time. Move, organize, and keep them.",

  footer_tagline: "Anonymous interactive drawing boards.",

  // ─── Dashboard ────────────────────────────────────────────────────────────
  loading_public_board: "Loading your public board...",
  loading_inbox: "Loading your board...",
  copied: "Copied!",
  copy_share_link: "Copy link to share",
  delete_drawing_error: "Error deleting a drawing",
  validating: "Validating...",

  // ─── Board modes ──────────────────────────────────────────────────────────
  mode_inbox: "My anotys",
  mode_public: "Public board",

  // ─── BoardControls tooltips ───────────────────────────────────────────────
  tool_select: "Select (V)",
  tool_hand: "Hand (H)",
  tool_marquee: "Multi-select (M) — drag on the canvas",
  tool_undo: "Undo (Ctrl+Z)",
  tool_redo: "Redo (Ctrl+Y / Ctrl+Shift+Z)",
  tool_zoom_in: "Zoom in",
  tool_zoom_out: "Zoom out",

  // ─── HintBar ──────────────────────────────────────────────────────────────
  hint_hand: "Hand mode — drag to move the canvas • Wheel or pinch to zoom • V: select • Ctrl+Z: undo",
  hint_marquee: "Drag on the canvas to select multiple drawings • Hold Shift while dragging to add • Esc: exit",
  hint_public:
    "Drag your drawings from the left panel • Move and reorder as you like • M: multi-select • H: hand • Ctrl+Z: undo",
  hint_inbox:
    "Drag the background to move • Wheel or pinch to zoom • Drag a drawing to move it • M: multi-select • H: hand • Ctrl+Z: undo",
  hint_viewer: "Hold and drag to move • Zoom with wheel or pinch",

  // ─── EmptyBoard ───────────────────────────────────────────────────────────
  empty_inbox_title: "Your board is still empty",
  empty_inbox_description:
    "Share your link so your friends can send you anonymous drawings. They arrive directly on this board and you can move them as you like.",
  empty_public_title: "Your public board is empty",
  empty_public_description:
    "Drag your drawings here from the left panel to create your board visible to anyone on the Internet.",
  empty_viewer_title: "This board is empty",
  empty_viewer_description: "The owner hasn't placed any drawings here yet.",
  copy_my_link: "Copy my personal link",

  // ─── ActionsMenu ─────────────────────────────────────────────────────────
  actions_selected: (n: number) => `${n} selected`,
  actions_download_png: "Download as image",
  actions_move_front: "Forward",
  actions_move_back: "Back",
  actions_bg_add: "Background",
  actions_bg_remove: "Remove background",
  actions_bg_title_multi: "Toggle background of selected drawings",
  actions_bg_title_single: "Toggle drawing background",
  actions_delete: "Delete",
  actions_confirm_delete_multi: (n: number) => `Delete ${n} drawings?`,
  actions_confirm_delete_single: "Delete drawing?",
  actions_confirm: "Confirm",
  actions_cancel: "Cancel",
  actions_remove_from_wall: "Remove from board",
  actions_move_front_title: "Bring selection to front",
  actions_move_back_title: "Send selection to back",
  actions_download_title: "Download as image",

  // ─── HeaderActions ────────────────────────────────────────────────────────
  header_logout_title: "Sign out",

  // ─── NotificationsDropdown ───────────────────────────────────────────────
  notifications_title: "Notifications",
  notifications_new_drawings: "New drawings",
  notifications_empty: "No new notifications.",
  notifications_anonymous_friend: "Anonymous Friend",
  notifications_clear: "Clear notifications",

  // ─── PublicControls ───────────────────────────────────────────────────────
  public_copy_link: "Copy public link",
  public_publish: "Publish board",
  public_hide: "Hide board",
  public_visible_title: "Board visible publicly",
  public_hidden_title: "Board hidden (only you can see it)",

  // ─── PublicSidebar ───────────────────────────────────────────────────────
  sidebar_drop_to_remove: "Drop to remove",
  sidebar_settings: "Settings",
  sidebar_wall_name: "Your board name",
  sidebar_wall_placeholder: "My Public Board",
  sidebar_your_drawings: "Your drawings",
  sidebar_drag_hint: "Tap and drag one to the board",
  sidebar_no_drawings: "You have no unplaced drawings.",
  sidebar_drag_to_wall: "Drag to board",
  sidebar_close_panel: "Close panel",
  sidebar_add_drawings: "Add drawings",
  sidebar_saving: "Saving...",
  sidebar_saved: "Saved!",
  sidebar_save_wall: "Save board",

  // ─── PublicBoardView ─────────────────────────────────────────────────────
  public_loading_text: "Loading public board...",
  public_notfound_heading: "This board doesn't exist or is hidden",
  public_notfound_description: "The link may be misspelled or the owner unpublished it.",
  public_notfound_back: "Back to Anoty",
  public_default_title: "Public Board",

  // ─── SendNote ─────────────────────────────────────────────────────────────
  send_header_title: (username: string) => `Send a note to @${username}`,
  send_avatar_alt: (name: string) => `Avatar of ${name}`,
  send_back: "Back to home",
  send_success_heading: "Drawing sent successfully! 🎉",
  send_success_body: (username: string) =>
    `Your drawing was saved anonymously on the private board of @${username}.`,
  send_another: "Draw another note",
  send_create_wall: "Create my own board",
  send_button: (username: string) => `Send to @${username}`,
  send_sending: "Sending...",
  send_error_default: "Could not send the drawing",
  send_backend_error: "Could not send the drawing to the server",
  send_button_title: (username: string) => `Send the drawing anonymously to @${username}`,
  send_anonymous_author: "Anonymous Friend",
  send_excalidraw_welcome: "Draw something and send it anonymously!",
  send_excalidraw_actions: "Actions",

  // ─── ExcalidrawCanvas ────────────────────────────────────────────────────
  excalidraw_send_error: "Could not send the drawing",

  // ─── Language switcher ───────────────────────────────────────────────────
  lang_switch_label: "Language",
  lang_en: "English",
  lang_es: "Español",
} as const

export type TranslationKey = keyof typeof en
export default en
