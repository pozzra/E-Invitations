-- =============================================================================
-- E-Invitation Database Schema & Complete Seed Data (Supabase / PostgreSQL)
-- ពិធីមង្គលការ ជា វិបុល ❤️ ស៊ុន ទេវី
-- =============================================================================

-- 1. Create RSVPs table
create table if not exists public.rsvps (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text default '',
  attendance text not null default 'attending',
  count integer default 1,
  wishes text default '',
  submitted_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Create Wishes table (សៀវភៅជូនពរឌីជីថល)
create table if not exists public.wishes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  date_display text default 'ថ្មីៗនេះ',
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Create Invitation Config table (ព័ត៌មានលម្អិតលិខិតអញ្ជើញ)
create table if not exists public.invitation_config (
  id text primary key,
  config_json jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Enable Row Level Security (RLS) & Policies
alter table public.rsvps enable row level security;
alter table public.wishes enable row level security;
alter table public.invitation_config enable row level security;

create policy "Public full access on rsvps" on public.rsvps for all using (true) with check (true);
create policy "Public full access on wishes" on public.wishes for all using (true) with check (true);
create policy "Public full access on config" on public.invitation_config for all using (true) with check (true);

-- =============================================================================
-- SEED DATA: INSERT ALL INVITATION INFORMATION
-- =============================================================================

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
