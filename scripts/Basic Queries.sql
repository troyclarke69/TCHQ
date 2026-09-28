INSERT INTO projects(id, title, summary, tech, href, featured, created_at)
VALUES (
    gen_random_uuid(),
    'PayBuddy', 
    'A mini PayPal-style app demo', 
    '{React,Typescript,"C# API",Postgres,Tailwind}',
    'https://minipaybuddy.netlify.app', 
    FALSE,
    NOW()
  );
SELECT * FROM projects ORDER BY created_at DESC;