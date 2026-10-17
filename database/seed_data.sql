-- =============================================================================
-- E-Invitation Database Schema & Complete Seed Data (Supabase / PostgreSQL)
-- ពិធីមង្គលការ ជា វិបុល ❤️ ស៊ុន ទេវី
-- =============================================================================

-- 1. Create Invitations table (multi-tenant parent record)
create table if not exists public.invitations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  slug text unique,
  title text,
  couple_names_khmer text,
  couple_names_en text,
  event_type text default 'wedding',
  event_date timestamp with time zone,
  venue_name text,
  venue_address text,
  map_url text,
  music_url text,
  music_playlist jsonb default '[]'::jsonb,
  cover_url text,
  story_text text,
  theme_config jsonb,
  is_active boolean default true,
  is_suspended boolean default false,
  view_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Ensure the music playlist column exists on already-created tables
alter table public.invitations add column if not exists music_playlist jsonb default '[]'::jsonb;

-- 2. Create RSVPs table (linked to an invitation)
create table if not exists public.rsvps (
  id uuid default gen_random_uuid() primary key,
  invitation_id uuid references public.invitations(id) on delete cascade,
  guest_name text not null,
  guest_phone text default '',
  attendance_status text not null default 'attending',
  guest_count integer default 1,
  wish_message text default '',
  is_hidden boolean default false,
  ip_hash text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Create Wishes table (សៀវភៅជូនពរឌីជីថល)
create table if not exists public.wishes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  date_display text default 'ថ្មីៗនេះ',
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Create Invitation Config table (ព័ត៌មានលម្អិតលិខិតអញ្ជើញ)
create table if not exists public.invitation_config (
  id text primary key,
  config_json jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Enable Row Level Security (RLS) & Policies
alter table public.invitations enable row level security;
alter table public.rsvps enable row level security;
alter table public.wishes enable row level security;
alter table public.invitation_config enable row level security;

create policy "Public full access on invitations" on public.invitations for all using (true) with check (true);
create policy "Public full access on rsvps" on public.rsvps for all using (true) with check (true);
create policy "Public full access on wishes" on public.wishes for all using (true) with check (true);
create policy "Public full access on config" on public.invitation_config for all using (true) with check (true);

-- =============================================================================
-- SEED DATA: INSERT ALL INVITATION INFORMATION
-- =============================================================================

-- Seed the active invitation (id must match INVITATION_ID in server.py / js/supabase.js)
insert into public.invitations (id, slug, couple_names_khmer, couple_names_en, event_type, is_active)
values ('8957c601-8044-4935-aa3d-1f369b0befa1', 'amra-wedding', 'ជា វិបុល & ស៊ុន ទេវី', 'Vibol & Devi', 'wedding', true)
on conflict (id) do nothing;

-- Seed Global Invitation Configuration
insert into public.invitation_config (id, config_json, updated_at)
values (
  'wedding_main',
  '{
    "blessingVerse": "☸ ជយោ ហោតុ សព្វទា ☸",
    "invitationTitle": "សិរីសួស្តី អាពាហ៍ពិពាហ៍",
    "invitationHeader": "លិខិតអញ្ជើញ",
    "invitationGreeting": "យើងខ្ញុំសូមគោរពអញ្ជើញ",
    "defaultGuestName": "ឯកឧត្តម លោកជំទាវ លោក លោកស្រី ភ្ញៀវកិត្តិយស",
    "invitationSubtext": "ចូលរួមជាអធិបតី និងជាភ្ញៀវកិត្តិយស ក្នុងពិធីមង្គលការកូនប្រុស-កូនស្រីរបស់យើងខ្ញុំ",
    "groomName": "ជា វិបុល",
    "brideName": "ស៊ុន ទេវី",
    "groomFather": "ជា សុខា",
    "groomMother": "ឃឹម សុភាព",
    "brideFather": "ស៊ុន វណ្ណា",
    "brideMother": "អ៊ុច ចរិយា",
    "solarDate": "ថ្ងៃអាទិត្យ ទី១៥ ខែវិច្ឆិកា ឆ្នាំ២០២៦",
    "lunarDate": "ត្រូវនឹងថ្ងៃ ៥កើត ខែកត្តិក ឆ្នាំរោង ឆស័ក ព.ស. ២៥៧០",
    "targetDateTime": "2026-11-15T07:00:00+07:00",
    "couplePhoto": "assets/images/couple.jpg",
    "venueName": "មជ្ឈមណ្ឌលសន្និបាត និងពិព័រណ៍កោះពេជ្រ (អគារ G)",
    "venueAddress": "📍 ទីតាំង៖ កោះពេជ្រ សង្កាត់ទន្លេបាសាក់ ខណ្ឌចំការមន រាជធានីភ្នំពេញ\\n(Koh Pich Exhibition Center, Building G, Phnom Penh)",
    "mapsUrl": "https://maps.google.com/?q=Koh+Pich+Convention+and+Exhibition+Center+Building+G+Phnom+Penh",
    "bankAccName": "CHEA VIBOL & SUN DEVI",
    "bankAccNum": "001 888 999 (USD)",
    "bankName": "ABA Bank / Bakong",
    "qrImage": "",
    "thankYouText": "សូមថ្លែងអំណរគុណយ៉ាងជ្រាលជ្រៅចំពោះវត្តមានដ៏ឧត្តុង្គឧត្តមរបស់លោកអ្នក",
    "footerDesignCredit": "Designed with Khmer Traditional Heritage & Modern Elegance",
    "schedule": [
      {
        "time": "07:00 AM",
        "title": "ពិធីហែជំនូន និងសែនព្រេន",
        "desc": "Groom''s Procession & Ancestor Blessing Ceremony"
      },
      {
        "time": "09:30 AM",
        "title": "ពិធីកាត់សក់បង្កក់សិរី",
        "desc": "Traditional Hair Cutting & Purification Ceremony"
      },
      {
        "time": "02:00 PM",
        "title": "ពិធីសំពះផ្ទឹម និងបង្វិលពពិល",
        "desc": "Sacred Knot Tying & Popil Twirling Blessing"
      },
      {
        "time": "05:30 PM",
        "title": "ពិធីទទួលទានភោជនាហារ និងរាំកម្សាន្ត",
        "desc": "Grand Evening Wedding Banquet & Celebration"
      }
    ]
  }'::jsonb,
  now()
)
on conflict (id) do update
set config_json = excluded.config_json,
    updated_at = now();

-- Seed Default Guestbook Wishes
insert into public.wishes (name, date_display, message, created_at)
values
  (
    'ឯកឧត្តម លី សុផាត',
    'ថ្មីៗនេះ',
    'សូមប្រសិទ្ធពរជ័យមង្គល សិរីសួស្តី វិបុលសុខគ្រប់ប្រការដល់គូស្វាមីភរិយាថ្មី ស្រឡាញ់គ្នារហូតដល់ចាស់កោងខ្នង!',
    now() - interval '2 hours'
  ),
  (
    'លោកជំទាវ ម៉េង គន្ធា',
    'ថ្មីៗនេះ',
    'អបអរសាទរពិធីមង្គលការ! សូមឱ្យគ្រួសារថ្មីពោរពេញដោយសុភមង្គល ទ្រព្យសម្បត្តិហូរហៀរ និងត្រជាក់ត្រជុំដូចទឹកអង្គរ។',
    now() - interval '1 hour'
  ),
  (
    'មិត្តភក្តិរួមការងារ (ABA Team)',
    'ថ្មីៗនេះ',
    'Congratulations Vibol & Devi! Wishing you both a lifetime of eternal love, prosperity, and happiness!',
    now()
  );
