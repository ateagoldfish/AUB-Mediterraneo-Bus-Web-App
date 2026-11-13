// Site settings. These values are public (they end up in every visitor's browser),
// so nothing secret belongs here.
//
// While `supabaseUrl` is empty the site runs in DEMO MODE: example timetable,
// simulated bus, and everything the admin changes is stored only in this browser.
// Empty it again to go back to demo mode.

export const config = {
  supabaseUrl: 'https://iktqbnnzhdcmyxwuugre.supabase.co',
  supabaseAnonKey: 'sb_publishable_rwnJp_UfY78nMDSFROb3jQ_althKJEv', // publishable key: meant to be public
  adminEmail: 'dormshuttle@proton.me', // the project email used for the admin login (D-017)

  timeZone: 'Europe/Nicosia',
  mapCenter: [34.784, 32.434],
  mapZoom: 13,

  positionPollSeconds: 10,   // how often the student page asks for the bus position
  dataPollSeconds: 60,       // how often it refreshes timetable and alerts
  freshSeconds: 60,          // position younger than this = live
  weakSeconds: 300,          // older than this = hidden (D-018)
  trackerStaleSeconds: 180,  // admin warning when the tracker is quiet in service hours
  lowBatteryPercent: 20,
  minPasscodeLength: 8,
};

export const demoMode = !config.supabaseUrl;
